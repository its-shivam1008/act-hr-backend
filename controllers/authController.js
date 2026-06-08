const User    = require("../models/User");
const jwt     = require("jsonwebtoken");
const crypto  = require("crypto");
const { sendPasswordResetEmail } = require("../utils/emailService");

// Generate JWT
const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "30d",
  });

// ── Register ──────────────────────────────────────────────────────────────────
// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({ success: false, message: "Email already registered" });
    }

    const user = await User.create({ name, email, password, role });

    // No token on register — user must log in
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

// ── Login ─────────────────────────────────────────────────────────────────────
// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: "Account deactivated. Contact HR." });
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

// ── Forgot Password ───────────────────────────────────────────────────────────
// POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    // Always return 200 — prevents email enumeration
    if (!user) {
      return res.status(200).json({
        success: true,
        message: "If an account with that email exists, a reset link has been sent.",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/#/reset-password/${resetToken}`;

    try {
      await sendPasswordResetEmail(user.email, resetUrl, user.name);
      return res.status(200).json({
        success: true,
        message: "Password reset link sent to your email.",
      });
    } catch (emailErr) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      console.error("[ForgotPassword] Email send failed:", emailErr.message);
      return res.status(500).json({ success: false, message: "Failed to send reset email. Try again." });
    }
  } catch (error) {
    console.error("[ForgotPassword]", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ── Reset Password ────────────────────────────────────────────────────────────
// PUT /api/auth/reset-password/:resettoken
const resetPassword = async (req, res) => {
  try {
    const hashedToken = crypto.createHash("sha256").update(req.params.resettoken).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: "Reset token is invalid or has expired" });
    }

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successful. Please log in with your new password.",
    });
  } catch (error) {
    console.error("[ResetPassword]", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ── Get Current User ──────────────────────────────────────────────────────────
// GET /api/auth/me  (protected)
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

module.exports = { register, login, forgotPassword, resetPassword, getMe };
