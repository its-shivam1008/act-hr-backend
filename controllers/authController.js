const User    = require("../models/User");
const jwt     = require("jsonwebtoken");
const crypto  = require("crypto");
const { sendPasswordResetEmail, sendInvitationEmail, sendOtpEmail } = require("../utils/emailService");

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "30d",
  });

const hashToken = (raw) =>
  crypto.createHash("sha256").update(raw).digest("hex");

// ── Register ───────────────────────────────────────────────────────────────
// POST /api/auth/register
// Creates user with isVerified:false → sends OTP → frontend goes to /verify-otp
const register = async (req, res) => {
  try {
    const { name, email, password, organisationName } = req.body;

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({ success: false, message: "Email already registered" });
    }

    const organisationId = crypto.randomUUID();

    const user = await User.create({
      name, email, password,
      role:             "super_admin",
      organisationId,
      organisationName,
      inviteStatus:     "active",
      isVerified:       false,   // ← must verify email before login
    });

    // Generate OTP and send verification email
    const otp = user.generateOtp("register");
    await user.save({ validateBeforeSave: false });

    try {
      await sendOtpEmail(email, otp, "register", name);
    } catch (emailErr) {
      console.error("[Register] OTP email failed:", emailErr.message);
      // Don't fail registration — user can resend OTP
    }

    return res.status(201).json({
      success: true,
      message: "Account created! A 6-digit code has been sent to your email.",
      email,  // frontend uses this to pre-fill the verify-otp page
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "Email already registered" });
    }
    console.error("[Register]", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ── Verify Registration OTP ────────────────────────────────────────────────
// POST /api/auth/verify-otp
const verifyRegisterOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const hashed = hashToken(otp);

    const user = await User.findOne({
      email,
      emailOtp:       hashed,
      emailOtpExpire: { $gt: Date.now() },
      otpPurpose:     "register",
    }).select("+emailOtp +emailOtpExpire +otpPurpose");

    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP." });
    }

    user.isVerified      = true;
    user.emailOtp        = undefined;
    user.emailOtpExpire  = undefined;
    user.otpPurpose      = undefined;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({
      success: true,
      message: "Email verified! You can now log in.",
    });
  } catch (error) {
    console.error("[VerifyOtp]", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ── Login ──────────────────────────────────────────────────────────────────
// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }
    if (user.inviteStatus === "pending") {
      return res.status(403).json({
        success: false,
        message: "Please accept your invitation email before logging in.",
      });
    }
    // isVerified === false means user registered but hasn't confirmed email yet
    if (user.isVerified === false) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email first. Check your inbox for the OTP.",
        email,
        requiresVerification: true,
      });
    }
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: "Account deactivated. Contact your admin." });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({
      success:  true,
      message:  "Login successful",
      token:    generateToken(user._id),
      user:     user.toSafeObject(),
    });
  } catch (error) {
    console.error("[Login]", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ── Resend OTP ─────────────────────────────────────────────────────────────
// POST /api/auth/resend-otp
const resendOtp = async (req, res) => {
  try {
    const { email, purpose } = req.body;

    const user = await User.findOne({ email })
      .select("+emailOtp +emailOtpExpire +otpPurpose");

    // Always return 200 to prevent email enumeration
    if (!user) {
      return res.status(200).json({ success: true, message: "If that email exists, an OTP has been resent." });
    }
    if (purpose === "register" && user.isVerified) {
      return res.status(400).json({ success: false, message: "This email is already verified." });
    }

    const otp = user.generateOtp(purpose);
    await user.save({ validateBeforeSave: false });

    await sendOtpEmail(user.email, otp, purpose, user.name);

    return res.status(200).json({ success: true, message: "OTP resent to your email." });
  } catch (error) {
    console.error("[ResendOtp]", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ── Forgot Password ────────────────────────────────────────────────────────
// POST /api/auth/forgot-password
// Sends a 6-digit OTP instead of a link → frontend goes to /verify-otp?purpose=forgot-password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email })
      .select("+emailOtp +emailOtpExpire +otpPurpose");

    // Always 200 — prevent enumeration
    if (!user) {
      return res.status(200).json({
        success: true,
        message: "If an account with that email exists, an OTP has been sent.",
      });
    }

    const otp = user.generateOtp("forgot-password");
    await user.save({ validateBeforeSave: false });

    try {
      await sendOtpEmail(user.email, otp, "forgot-password", user.name);
      return res.status(200).json({
        success: true,
        message: "A 6-digit OTP has been sent to your email.",
        email,   // frontend pre-fills the OTP page
      });
    } catch (emailErr) {
      user.emailOtp       = undefined;
      user.emailOtpExpire = undefined;
      user.otpPurpose     = undefined;
      await user.save({ validateBeforeSave: false });
      console.error("[ForgotPassword] Email failed:", emailErr.message);
      return res.status(500).json({ success: false, message: "Failed to send OTP. Try again." });
    }
  } catch (error) {
    console.error("[ForgotPassword]", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ── Verify Forgot-Password OTP ─────────────────────────────────────────────
// POST /api/auth/verify-forgot-otp
// Verifies OTP → issues a short-lived reset token → frontend navigates to /reset-password/:token
const verifyForgotOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const hashed = hashToken(otp);

    const user = await User.findOne({
      email,
      emailOtp:       hashed,
      emailOtpExpire: { $gt: Date.now() },
      otpPurpose:     "forgot-password",
    }).select("+emailOtp +emailOtpExpire +otpPurpose");

    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP." });
    }

    // Clear OTP fields and issue a password-reset token
    user.emailOtp        = undefined;
    user.emailOtpExpire  = undefined;
    user.otpPurpose      = undefined;

    const resetToken          = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken   = hashToken(resetToken);
    user.resetPasswordExpire  = Date.now() + 15 * 60 * 1000; // 15 min
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({
      success:    true,
      resetToken,                            // frontend: navigate to /reset-password/:resetToken
      message:    "OTP verified. Please set your new password.",
    });
  } catch (error) {
    console.error("[VerifyForgotOtp]", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ── Reset Password ─────────────────────────────────────────────────────────
// PUT /api/auth/reset-password/:resettoken
const resetPassword = async (req, res) => {
  try {
    const hashed = hashToken(req.params.resettoken);

    const user = await User.findOne({
      resetPasswordToken:  hashed,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: "Reset token is invalid or has expired" });
    }

    user.password            = req.body.password;
    user.resetPasswordToken  = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    return res.status(200).json({ success: true, message: "Password reset successful. Please log in." });
  } catch (error) {
    console.error("[ResetPassword]", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ── Invite User ────────────────────────────────────────────────────────────
// POST /api/auth/invite-user  (protected)
const inviteUser = async (req, res) => {
  try {
    const { email, role } = req.body;
    const inviter = req.user;

    if (!["super_admin", "admin"].includes(inviter.role)) {
      return res.status(403).json({ success: false, message: "Only admins can invite users" });
    }

    const existingUser = await User.findOne({ email })
      .select("+inviteToken +inviteTokenExpire +pendingOrgId +pendingOrgName +pendingRole");

    if (existingUser) {
      if (existingUser.organisationId === inviter.organisationId && existingUser.inviteStatus === "active") {
        return res.status(409).json({ success: false, message: "This user already belongs to your organisation." });
      }
      if (existingUser.pendingOrgId === inviter.organisationId) {
        return res.status(409).json({ success: false, message: "An invitation has already been sent to this user." });
      }

      const rawToken = existingUser.generateInviteToken();
      existingUser.pendingOrgId   = inviter.organisationId;
      existingUser.pendingOrgName = inviter.organisationName;
      existingUser.pendingRole    = role || "employee";
      existingUser.invitedBy      = inviter._id;
      await existingUser.save({ validateBeforeSave: false });

      const inviteUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/#/accept-invite/${rawToken}`;
      try {
        await sendInvitationEmail({ toEmail: email, inviteUrl, inviterName: inviter.name, organisationName: inviter.organisationName, role: role || "employee" });
        return res.status(200).json({ success: true, message: `Invitation sent to ${email}` });
      } catch (emailErr) {
        existingUser.inviteToken = undefined; existingUser.inviteTokenExpire = undefined;
        existingUser.pendingOrgId = undefined; existingUser.pendingOrgName = undefined; existingUser.pendingRole = undefined;
        await existingUser.save({ validateBeforeSave: false });
        return res.status(500).json({ success: false, message: "Failed to send invitation email." });
      }
    }

    const pendingUser = new User({
      email,
      role:             role || "employee",
      organisationId:   inviter.organisationId,
      organisationName: inviter.organisationName,
      inviteStatus:     "pending",
      invitedBy:        inviter._id,
      isVerified:       true,  // invite link = verified
    });

    const rawToken = pendingUser.generateInviteToken();
    await pendingUser.save({ validateBeforeSave: false });

    const inviteUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/#/accept-invite/${rawToken}`;
    try {
      await sendInvitationEmail({ toEmail: email, inviteUrl, inviterName: inviter.name, organisationName: inviter.organisationName, role: role || "employee" });
      return res.status(200).json({ success: true, message: `Invitation sent to ${email}` });
    } catch (emailErr) {
      await User.findByIdAndDelete(pendingUser._id);
      return res.status(500).json({ success: false, message: "Failed to send invitation email." });
    }
  } catch (error) {
    console.error("[InviteUser]", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ── Get Invite Info ────────────────────────────────────────────────────────
const getInviteInfo = async (req, res) => {
  try {
    const hashed = hashToken(req.params.token);

    const existingUser = await User.findOne({
      inviteToken: hashed, inviteTokenExpire: { $gt: Date.now() }, pendingOrgId: { $exists: true, $ne: null },
    }).select("+inviteToken +inviteTokenExpire +pendingOrgId +pendingOrgName +pendingRole").populate("invitedBy","name email");

    if (existingUser) {
      return res.status(200).json({ success: true, invite: {
        email: existingUser.email, role: existingUser.pendingRole,
        organisationName: existingUser.pendingOrgName,
        inviterName: existingUser.invitedBy?.name || "Your Admin", isExistingUser: true,
      }});
    }

    const pendingUser = await User.findOne({
      inviteToken: hashed, inviteTokenExpire: { $gt: Date.now() }, inviteStatus: "pending",
    }).select("+inviteToken +inviteTokenExpire").populate("invitedBy","name email");

    if (pendingUser) {
      return res.status(200).json({ success: true, invite: {
        email: pendingUser.email, role: pendingUser.role,
        organisationName: pendingUser.organisationName,
        inviterName: pendingUser.invitedBy?.name || "Your Admin", isExistingUser: false,
      }});
    }

    return res.status(400).json({ success: false, message: "Invitation link is invalid or has expired" });
  } catch (error) {
    console.error("[GetInviteInfo]", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ── Accept Invite ──────────────────────────────────────────────────────────
const acceptInvite = async (req, res) => {
  try {
    const { name, password } = req.body;
    const hashed = hashToken(req.params.token);

    const existingUser = await User.findOne({
      inviteToken: hashed, inviteTokenExpire: { $gt: Date.now() }, pendingOrgId: { $exists: true, $ne: null },
    }).select("+inviteToken +inviteTokenExpire +pendingOrgId +pendingOrgName +pendingRole");

    if (existingUser) {
      existingUser.organisationId    = existingUser.pendingOrgId;
      existingUser.organisationName  = existingUser.pendingOrgName;
      existingUser.role              = existingUser.pendingRole;
      existingUser.pendingOrgId      = undefined;
      existingUser.pendingOrgName    = undefined;
      existingUser.pendingRole       = undefined;
      existingUser.inviteToken       = undefined;
      existingUser.inviteTokenExpire = undefined;
      await existingUser.save({ validateBeforeSave: false });
      return res.status(200).json({ success: true, message: "You've joined the organisation! Log in with your existing credentials." });
    }

    const pendingUser = await User.findOne({
      inviteToken: hashed, inviteTokenExpire: { $gt: Date.now() }, inviteStatus: "pending",
    }).select("+inviteToken +inviteTokenExpire");

    if (!pendingUser) {
      return res.status(400).json({ success: false, message: "Invitation link is invalid or has expired" });
    }
    if (!name || !password) {
      return res.status(422).json({ success: false, message: "Name and password are required." });
    }

    pendingUser.name              = name;
    pendingUser.password          = password;
    pendingUser.inviteStatus      = "active";
    pendingUser.isVerified        = true;
    pendingUser.inviteToken       = undefined;
    pendingUser.inviteTokenExpire = undefined;
    await pendingUser.save();

    return res.status(200).json({ success: true, message: "Account created! You can now log in." });
  } catch (error) {
    console.error("[AcceptInvite]", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ── Get Current User ───────────────────────────────────────────────────────
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    return res.status(200).json({ success: true, user: user.toSafeObject() });
  } catch (error) {
    console.error("[GetMe]", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ── List Organisation Members ──────────────────────────────────────────────
const getOrgMembers = async (req, res) => {
  try {
    const members = await User.find({ organisationId: req.user.organisationId })
      .select("-resetPasswordToken -resetPasswordExpire -emailOtp -emailOtpExpire -otpPurpose")
      .sort({ createdAt: -1 });
    return res.status(200).json({ success: true, members });
  } catch (error) {
    console.error("[GetOrgMembers]", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  register, verifyRegisterOtp, resendOtp,
  login,
  forgotPassword, verifyForgotOtp, resetPassword,
  inviteUser, getInviteInfo, acceptInvite,
  getMe, getOrgMembers,
};
