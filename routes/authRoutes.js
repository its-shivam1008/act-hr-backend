const express = require("express");
const router  = express.Router();

const {
  register, login,
  inviteUser, getInviteInfo, acceptInvite,
  forgotPassword, resetPassword,
  getMe, getOrgMembers,
} = require("../controllers/authController");

const { protect } = require("../middleware/authMiddleware");

const {
  validate,
  registerSchema, loginSchema,
  forgotPasswordSchema, resetPasswordSchema,
  inviteUserSchema, acceptInviteSchema,
} = require("../utils/validators");

// ── Public ────────────────────────────────────────────────────────────────
router.post("/register",      validate(registerSchema),      register);
router.post("/login",         validate(loginSchema),         login);
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
router.put( "/reset-password/:resettoken", validate(resetPasswordSchema), resetPassword);

// Invite flow (public — token in URL)
router.get( "/accept-invite/:token", getInviteInfo);
router.post("/accept-invite/:token", validate(acceptInviteSchema), acceptInvite);

// ── Protected ─────────────────────────────────────────────────────────────
router.get( "/me",       protect, getMe);
router.get( "/members",  protect, getOrgMembers);
router.post("/invite-user", protect, validate(inviteUserSchema), inviteUser);

module.exports = router;
