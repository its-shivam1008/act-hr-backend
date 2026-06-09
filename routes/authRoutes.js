const express = require("express");
const router  = express.Router();

const {
  register, verifyRegisterOtp, resendOtp,
  login,
  forgotPassword, verifyForgotOtp, resetPassword,
  inviteUser, getInviteInfo, acceptInvite,
  getMe, getOrgMembers,
} = require("../controllers/authController");

const { protect } = require("../middleware/authMiddleware");

const {
  validate,
  registerSchema, loginSchema,
  forgotPasswordSchema, resetPasswordSchema,
  inviteUserSchema, acceptInviteSchema,
  verifyOtpSchema, resendOtpSchema,
} = require("../utils/validators");

// ── Public ────────────────────────────────────────────────────────────────
router.post("/register",          validate(registerSchema),      register);
router.post("/verify-otp",        validate(verifyOtpSchema),     verifyRegisterOtp);
router.post("/resend-otp",        validate(resendOtpSchema),     resendOtp);
router.post("/login",             validate(loginSchema),         login);
router.post("/forgot-password",   validate(forgotPasswordSchema), forgotPassword);
router.post("/verify-forgot-otp", validate(verifyOtpSchema),     verifyForgotOtp);
router.put( "/reset-password/:resettoken", validate(resetPasswordSchema), resetPassword);

// Invite flow
router.get( "/accept-invite/:token", getInviteInfo);
router.post("/accept-invite/:token", validate(acceptInviteSchema), acceptInvite);

// ── Protected ─────────────────────────────────────────────────────────────
router.get( "/me",          protect, getMe);
router.get( "/members",     protect, getOrgMembers);
router.post("/invite-user", protect, validate(inviteUserSchema), inviteUser);

module.exports = router;
