const User                = require("../models/User");
const Employee            = require("../models/Employee");
const PendingRegistration = require("../models/PendingRegistration");
const Permission          = require("../models/Permission");
const jwt     = require("jsonwebtoken");
const crypto  = require("crypto");
const bcrypt  = require("bcryptjs");
const { sendPasswordResetEmail, sendInvitationEmail, sendOtpEmail } = require("../utils/emailService");

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "30d",
  });

const hashToken = (raw) =>
  crypto.createHash("sha256").update(raw).digest("hex");

// ── Register ───────────────────────────────────────────────────────────────
// POST /api/auth/register
// NEW FLOW: Does NOT create a User yet.
// Creates a PendingRegistration (TTL 10 min) → sends OTP → User only created on verify.
const register = async (req, res) => {
  try {
    const { name, email, password, organisationName } = req.body;
    if (!name || !email || !password || !organisationName) {
      return res.status(422).json({ success: false, message: "All fields are required" });
    }

    // 1. Block if a fully-verified User already exists with this email
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({ success: false, message: "Email already registered" });
    }

    // 2. Hash password now (so we store it safely in the pending doc)
    const hashedPassword = await bcrypt.hash(password, 10);
    const organisationId = crypto.randomUUID();

    // 3. Upsert PendingRegistration (replace if they registered before without verifying)
    let pending = await PendingRegistration.findOne({ email: email.toLowerCase().trim() });
    if (pending) {
      // Refresh their pending entry with a new OTP
      pending.name             = name;
      pending.password         = hashedPassword;
      pending.organisationId   = organisationId;
      pending.organisationName = organisationName;
      pending.createdAt        = new Date();   // reset TTL clock
    } else {
      pending = new PendingRegistration({
        name, email: email.toLowerCase().trim(),
        password: hashedPassword,
        organisationId,
        organisationName,
        otp:       "placeholder",   // overwritten by generateOtp below
        otpExpire: new Date(),
      });
    }

    // 4. Generate OTP and save pending record
    const otp = pending.generateOtp();
    await pending.save();

    // 5. Send OTP email
    try {
      await sendOtpEmail(email, otp, "register", name);
      console.log(`[Register] OTP sent to ${email}`);
    } catch (emailErr) {
      console.error("[Register] OTP email FAILED:", emailErr.message);
      // Clean up so user can retry cleanly
      await PendingRegistration.deleteOne({ email: email.toLowerCase().trim() });
      return res.status(500).json({
        success: false,
        message: "We couldn't send the verification email. Please check your email address and try again.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "A 6-digit verification code has been sent to your email. Please verify to complete registration.",
      email,
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
// Only called for purpose=register. Verifying creates the real User in DB.
const verifyRegisterOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(422).json({ success: false, message: "Email and OTP are required" });
    }

    const hashed = crypto.createHash("sha256").update(String(otp)).digest("hex");

    // Find pending registration with matching email + OTP + not expired
    const pending = await PendingRegistration.findOne({
      email:     email.toLowerCase().trim(),
      otp:       hashed,
      otpExpire: { $gt: new Date() },
    });

    if (!pending) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP. Please try again or request a new code." });
    }

    // OTP is valid — NOW create the real User in the database
    const user = await User.create({
      name:             pending.name,
      email:            pending.email,
      password:         pending.password,   // already hashed
      role:             "super_admin",
      organisationId:   pending.organisationId,
      organisationName: pending.organisationName,
      inviteStatus:     "active",
      isVerified:       true,               // ← verified right away
    });

    // Clean up the pending record
    await PendingRegistration.deleteOne({ _id: pending._id });

    console.log(`[VerifyOtp] User created after OTP verification: ${user.email}`);

    return res.status(201).json({
      success: true,
      message: "Email verified! Your account is ready. You can now log in.",
    });
  } catch (error) {
    if (error.code === 11000) {
      // Edge case: user somehow already exists (double submit)
      await PendingRegistration.deleteOne({ email: req.body.email });
      return res.status(409).json({ success: false, message: "Account already exists. Please log in." });
    }
    console.error("[VerifyOtp]", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ── Login ──────────────────────────────────────────────────────────────────
// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email: rawEmail, password } = req.body;
    
    if (!rawEmail || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const email = rawEmail.toLowerCase().trim();

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      // ── Fallback: check if this is an employee trying to log in ──────────
      const emp = await Employee.findOne({ "personalInfo.workEmail": email.toLowerCase().trim() }).select("+password");
      if (emp) {
        if (emp.employment?.status === "Terminated")
          return res.status(403).json({ success: false, message: "Account deactivated. Contact HR." });

        // If no password stored yet, set it to bcrypt-hash of employeeId (default password)
        if (!emp.password) {
          emp.password = await bcrypt.hash(emp.personalInfo?.employeeId || "password123", 10);
          await emp.save({ validateBeforeSave: false });
        }

        const empMatch = await emp.matchPassword(password);
        if (!empMatch)
          return res.status(401).json({ success: false, message: "Invalid email or password" });
        const empToken = jwt.sign(
          { id: emp._id, type: "employee", organisationId: emp.organisationId },
          process.env.JWT_SECRET,
          { expiresIn: process.env.JWT_EXPIRES_IN || "30d" }
        );
        return res.json({
          success: true,
          type:    "employee",
          token:   empToken,
          employee: {
            _id:         emp._id,
            employeeId:  emp.personalInfo?.employeeId,
            firstName:   emp.personalInfo?.firstName,
            lastName:    emp.personalInfo?.lastName,
            workEmail:   emp.personalInfo?.workEmail,
            department:  emp.employment?.departmentName,
            designation: emp.employment?.designationName,
            status:      emp.employment?.status,
            organisationId: emp.organisationId,
          },
        });
      }

      const pending = await PendingRegistration.findOne({ email });
      if (pending) {
        return res.status(403).json({
          success: false,
          message: "Please verify your email first. Check your inbox for the OTP.",
          email,
          requiresVerification: true,
        });
      }

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

    // Fetch user permissions
    const permRecord = await Permission.findOne({ userId: user._id, organisationId: user.organisationId });
    const userPermissions = {};
    if (permRecord && permRecord.permissions) {
      permRecord.permissions.forEach((val, key) => {
        userPermissions[key] = {
          read: !!val.read,
          create: !!val.create,
          update: !!val.update,
          delete: !!val.delete,
        };
      });
    }

    return res.status(200).json({
      success:  true,
      message:  "Login successful",
      token:    generateToken(user._id),
      user:     { ...user.toSafeObject(), permissions: userPermissions },
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
    if (!email || !purpose) {
      return res.status(422).json({ success: false, message: "Email and purpose are required" });
    }

    if (purpose === "register") {
      // ── Resend for pending (unverified) registration ──────────────────────
      const pending = await PendingRegistration.findOne({ email: email.toLowerCase().trim() });

      // Anti-enumeration: always return 200 if not found
      if (!pending) {
        return res.status(200).json({ success: true, message: "If a pending registration exists, a new OTP has been sent." });
      }

      // Check if already fully registered
      const verified = await User.findOne({ email: email.toLowerCase().trim() });
      if (verified) {
        return res.status(400).json({ success: false, message: "This email is already verified. Please log in." });
      }

      pending.createdAt = new Date();   // reset TTL so it doesn't expire while user waits
      const otp = pending.generateOtp();
      await pending.save();

      await sendOtpEmail(email, otp, "register", pending.name);
      return res.status(200).json({ success: true, message: "A new verification code has been sent to your email." });

    } else {
      // ── Resend for forgot-password (User must already exist) ────────────────
      const user = await User.findOne({ email })
        .select("+emailOtp +emailOtpExpire +otpPurpose");

      if (!user) {
        return res.status(200).json({ success: true, message: "If that email exists, an OTP has been resent." });
      }

      const otp = user.generateOtp(purpose);
      await user.save({ validateBeforeSave: false });
      await sendOtpEmail(user.email, otp, purpose, user.name);
      return res.status(200).json({ success: true, message: "OTP resent to your email." });
    }
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
    const { email: rawEmail } = req.body;
    const email = rawEmail.toLowerCase().trim();
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
    const { email: rawEmail, otp } = req.body;
    const email = rawEmail.toLowerCase().trim();
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
    const { email, role, createPortal } = req.body;
    const inviter = req.user;
    const assignRole = role || "team_member";

    // Validate role
    if (!["admin", "team_member"].includes(assignRole)) {
      return res.status(400).json({ success: false, message: "Role must be admin or team_member" });
    }

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
      existingUser.pendingRole    = assignRole;
      existingUser.invitedBy      = inviter._id;
      existingUser.createPortal   = !!createPortal;
      await existingUser.save({ validateBeforeSave: false });

      const inviteUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/#/accept-invite/${rawToken}`;
      try {
      await sendInvitationEmail({ toEmail: email, inviteUrl, inviterName: inviter.name, organisationName: inviter.organisationName, role: assignRole });
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
      role:             assignRole,
      organisationId:   inviter.organisationId,
      organisationName: inviter.organisationName,
      inviteStatus:     "pending",
      invitedBy:        inviter._id,
      isVerified:       true,
      createPortal:     !!createPortal,
    });

    const rawToken2 = pendingUser.generateInviteToken();
    await pendingUser.save({ validateBeforeSave: false });

    const inviteUrl2 = `${process.env.FRONTEND_URL || "http://localhost:3000"}/#/accept-invite/${rawToken2}`;
    try {
      await sendInvitationEmail({ toEmail: email, inviteUrl: inviteUrl2, inviterName: inviter.name, organisationName: inviter.organisationName, role: assignRole });
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

    // Fetch user permissions
    const permRecord = await Permission.findOne({ userId: user._id, organisationId: user.organisationId });
    const userPermissions = {};
    if (permRecord && permRecord.permissions) {
      permRecord.permissions.forEach((val, key) => {
        userPermissions[key] = {
          read: !!val.read,
          create: !!val.create,
          update: !!val.update,
          delete: !!val.delete,
        };
      });
    }

    return res.status(200).json({ success: true, user: { ...user.toSafeObject(), permissions: userPermissions } });
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
