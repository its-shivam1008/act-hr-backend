const express = require("express");
const router = express.Router();

const {
  register,
  login,
  forgotPassword,
  resetPassword,
  getMe,
} = require("../controllers/authController");

const { protect } = require("../middleware/authMiddleware");

const {
  validate,
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require("../utils/validators");

// ─── Public Routes ────────────────────────────────────────────────────────────
router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
router.put("/reset-password/:resettoken", validate(resetPasswordSchema), resetPassword);

// ─── Protected Routes ─────────────────────────────────────────────────────────
router.get("/me", protect, getMe);

module.exports = router;
