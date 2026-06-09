const User    = require("../models/User");
const jwt     = require("jsonwebtoken");
const crypto  = require("crypto");
const { sendPasswordResetEmail, sendInvitationEmail } = require("../utils/emailService");

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "30d",
  });

const hashToken = (raw) =>
  crypto.createHash("sha256").update(raw).digest("hex");

// ── Register (self-signup) ─────────────────────────────────────────────────
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
      role: "super_admin",
      organisationId,
      organisationName,
      inviteStatus: "active",
    });

    return res.status(201).json({
      success: true,
      message: "Account created successfully. Please log in.",
      user: user.toSafeObject(),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "Email already registered" });
    }
    console.error("[Register]", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ── Login ──────────────────────────────────────────────────────────────────
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
      success: true,
      message: "Login successful",
      token: generateToken(user._id),
      user: user.toSafeObject(),
    });
  } catch (error) {
    console.error("[Login]", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ── Invite User ────────────────────────────────────────────────────────────
// POST /api/auth/invite-user  (protected — super_admin or admin)
//
// Two cases:
//   A) Email already has an account → set pendingOrg* fields on their record
//   B) Email is new → create a pending User record (no password yet)
const inviteUser = async (req, res) => {
  try {
    const { email, role } = req.body;
    const inviter = req.user;

    if (!["super_admin", "admin"].includes(inviter.role)) {
      return res.status(403).json({ success: false, message: "Only admins can invite users" });
    }

    const existingUser = await User.findOne({ email })
      .select("+inviteToken +inviteTokenExpire +pendingOrgId +pendingOrgName +pendingRole");

    // ── Case A: user already has an account ──────────────────────────────
    if (existingUser) {
      // Already belongs to THIS org
      if (existingUser.organisationId === inviter.organisationId && existingUser.inviteStatus === "active") {
        return res.status(409).json({
          success: false,
          message: "This user already belongs to your organisation.",
        });
      }
      // Currently has a pending invite to this same org
      if (existingUser.pendingOrgId === inviter.organisationId) {
        return res.status(409).json({
          success: false,
          message: "An invitation has already been sent to this user for your organisation.",
        });
      }

      // Store pending org details on their existing record
      const rawToken = existingUser.generateInviteToken();
      existingUser.pendingOrgId   = inviter.organisationId;
      existingUser.pendingOrgName = inviter.organisationName;
      existingUser.pendingRole    = role || "employee";
      existingUser.invitedBy      = inviter._id;
      await existingUser.save({ validateBeforeSave: false });

      const inviteUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/#/accept-invite/${rawToken}`;
      try {
        await sendInvitationEmail({
          toEmail: email,
          inviteUrl,
          inviterName: inviter.name,
          organisationName: inviter.organisationName,
          role: role || "employee",
        });
        return res.status(200).json({ success: true, message: `Invitation sent to ${email}` });
      } catch (emailErr) {
        // Roll back token
        existingUser.inviteToken       = undefined;
        existingUser.inviteTokenExpire = undefined;
        existingUser.pendingOrgId      = undefined;
        existingUser.pendingOrgName    = undefined;
        existingUser.pendingRole       = undefined;
        await existingUser.save({ validateBeforeSave: false });
        console.error("[InviteUser] Email failed:", emailErr.message);
        return res.status(500).json({ success: false, message: "Failed to send invitation email. Try again." });
      }
    }

    // ── Case B: brand-new email, no account yet ───────────────────────────
    const pendingUser = new User({
      email,
      role: role || "employee",
      organisationId:   inviter.organisationId,
      organisationName: inviter.organisationName,
      inviteStatus: "pending",
      invitedBy:    inviter._id,
    });

    const rawToken = pendingUser.generateInviteToken();
    await pendingUser.save({ validateBeforeSave: false });

    const inviteUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/#/accept-invite/${rawToken}`;
    try {
      await sendInvitationEmail({
        toEmail: email,
        inviteUrl,
        inviterName:      inviter.name,
        organisationName: inviter.organisationName,
        role:             role || "employee",
      });
      return res.status(200).json({ success: true, message: `Invitation sent to ${email}` });
    } catch (emailErr) {
      await User.findByIdAndDelete(pendingUser._id);
      console.error("[InviteUser] Email failed:", emailErr.message);
      return res.status(500).json({ success: false, message: "Failed to send invitation email. Try again." });
    }
  } catch (error) {
    console.error("[InviteUser]", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ── Get Invite Info ────────────────────────────────────────────────────────
// GET /api/auth/accept-invite/:token
// Returns invite metadata so the frontend can render the right UI.
const getInviteInfo = async (req, res) => {
  try {
    const hashed = hashToken(req.params.token);

    // Case A: existing user with a pending org switch
    const existingUser = await User.findOne({
      inviteToken:       hashed,
      inviteTokenExpire: { $gt: Date.now() },
      pendingOrgId:      { $exists: true, $ne: null },
    })
      .select("+inviteToken +inviteTokenExpire +pendingOrgId +pendingOrgName +pendingRole")
      .populate("invitedBy", "name email");

    if (existingUser) {
      return res.status(200).json({
        success: true,
        invite: {
          email:            existingUser.email,
          role:             existingUser.pendingRole,
          organisationName: existingUser.pendingOrgName,
          inviterName:      existingUser.invitedBy?.name || "Your Admin",
          isExistingUser:   true,  // ← front-end uses this to show the right form
        },
      });
    }

    // Case B: brand-new pending user
    const pendingUser = await User.findOne({
      inviteToken:       hashed,
      inviteTokenExpire: { $gt: Date.now() },
      inviteStatus:      "pending",
    })
      .select("+inviteToken +inviteTokenExpire")
      .populate("invitedBy", "name email");

    if (pendingUser) {
      return res.status(200).json({
        success: true,
        invite: {
          email:            pendingUser.email,
          role:             pendingUser.role,
          organisationName: pendingUser.organisationName,
          inviterName:      pendingUser.invitedBy?.name || "Your Admin",
          isExistingUser:   false,
        },
      });
    }

    return res.status(400).json({
      success: false,
      message: "Invitation link is invalid or has expired",
    });
  } catch (error) {
    console.error("[GetInviteInfo]", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ── Accept Invite ──────────────────────────────────────────────────────────
// POST /api/auth/accept-invite/:token
//
// Case A (existing user):  name + password NOT required — they already have creds.
//   → update organisationId/Name/role to the pending org, clear pending fields.
//
// Case B (new user):  name + password REQUIRED.
//   → set name/password/activate the pending record.
const acceptInvite = async (req, res) => {
  try {
    const { name, password } = req.body;
    const hashed = hashToken(req.params.token);

    // ── Case A: existing user switching orgs ─────────────────────────────
    const existingUser = await User.findOne({
      inviteToken:       hashed,
      inviteTokenExpire: { $gt: Date.now() },
      pendingOrgId:      { $exists: true, $ne: null },
    }).select("+inviteToken +inviteTokenExpire +pendingOrgId +pendingOrgName +pendingRole");

    if (existingUser) {
      existingUser.organisationId   = existingUser.pendingOrgId;
      existingUser.organisationName = existingUser.pendingOrgName;
      existingUser.role             = existingUser.pendingRole;
      existingUser.pendingOrgId     = undefined;
      existingUser.pendingOrgName   = undefined;
      existingUser.pendingRole      = undefined;
      existingUser.inviteToken      = undefined;
      existingUser.inviteTokenExpire = undefined;
      await existingUser.save({ validateBeforeSave: false });

      return res.status(200).json({
        success: true,
        message: "You've joined the organisation! Log in with your existing credentials.",
      });
    }

    // ── Case B: brand-new user ───────────────────────────────────────────
    const pendingUser = await User.findOne({
      inviteToken:       hashed,
      inviteTokenExpire: { $gt: Date.now() },
      inviteStatus:      "pending",
    }).select("+inviteToken +inviteTokenExpire");

    if (!pendingUser) {
      return res.status(400).json({
        success: false,
        message: "Invitation link is invalid or has expired",
      });
    }

    if (!name || !password) {
      return res.status(422).json({
        success: false,
        message: "Name and password are required to complete your registration.",
      });
    }

    pendingUser.name             = name;
    pendingUser.password         = password;
    pendingUser.inviteStatus     = "active";
    pendingUser.inviteToken      = undefined;
    pendingUser.inviteTokenExpire = undefined;
    await pendingUser.save();

    return res.status(200).json({
      success: true,
      message: "Account created! You can now log in with your email and password.",
    });
  } catch (error) {
    console.error("[AcceptInvite]", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ── Forgot Password ────────────────────────────────────────────────────────
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(200).json({
        success: true,
        message: "If an account with that email exists, a reset link has been sent.",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken  = hashToken(resetToken);
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/#/reset-password/${resetToken}`;

    try {
      await sendPasswordResetEmail(user.email, resetUrl, user.name);
      return res.status(200).json({ success: true, message: "Password reset link sent to your email." });
    } catch (emailErr) {
      user.resetPasswordToken  = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      console.error("[ForgotPassword] Email failed:", emailErr.message);
      return res.status(500).json({ success: false, message: "Failed to send reset email. Try again." });
    }
  } catch (error) {
    console.error("[ForgotPassword]", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ── Reset Password ─────────────────────────────────────────────────────────
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
// GET /api/auth/members  — returns all users belonging to the requester's org
const getOrgMembers = async (req, res) => {
  try {
    const members = await User.find({ organisationId: req.user.organisationId })
      .select("-resetPasswordToken -resetPasswordExpire")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, members });
  } catch (error) {
    console.error("[GetOrgMembers]", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  register, login,
  inviteUser, getInviteInfo, acceptInvite,
  forgotPassword, resetPassword,
  getMe, getOrgMembers,
};
