const { z } = require("zod");

// ── Register (self-signup) ─────────────────────────────────────────────────
const registerSchema = z.object({
  name: z.string({ required_error: "Name is required" })
    .trim().min(2, "Name must be at least 2 characters").max(60),

  email: z.string({ required_error: "Email is required" })
    .trim().toLowerCase().email("Please provide a valid email address"),

  password: z.string({ required_error: "Password is required" })
    .min(6, "Password must be at least 6 characters").max(72),

  organisationName: z.string({ required_error: "Organisation name is required" })
    .trim().min(2, "Organisation name must be at least 2 characters").max(100),
});

// ── Login ──────────────────────────────────────────────────────────────────
const loginSchema = z.object({
  email: z.string({ required_error: "Email is required" })
    .trim().toLowerCase().email("Please provide a valid email address"),

  password: z.string({ required_error: "Password is required" }).min(1),
});

// ── Forgot Password ────────────────────────────────────────────────────────
const forgotPasswordSchema = z.object({
  email: z.string({ required_error: "Email is required" })
    .trim().toLowerCase().email("Please provide a valid email address"),
});

// ── Reset Password ─────────────────────────────────────────────────────────
const resetPasswordSchema = z.object({
  password: z.string({ required_error: "Password is required" })
    .min(6, "Password must be at least 6 characters").max(72),
});

// ── Invite User ────────────────────────────────────────────────────────────
const inviteUserSchema = z.object({
  email: z.string({ required_error: "Email is required" })
    .trim().toLowerCase().email("Please provide a valid email address"),

  role: z.enum(["admin", "manager", "employee"], {
    errorMap: () => ({ message: "Role must be admin, manager, or employee" }),
  }).optional().default("employee"),

  name: z.string().trim().min(2).max(60).optional(),
});

// ── Accept Invite ─────────────────────────────────────────────────────────
// name + password are optional here — the controller checks them for new users.
// Existing users (org-switch) send an empty body.
const acceptInviteSchema = z.object({
  name:     z.string().trim().min(2).max(60).optional(),
  password: z.string().min(6).max(72).optional(),
});

// ── Middleware factory ─────────────────────────────────────────────────────
const validate = (schema) => {
  return function validateMiddleware(req, res, next) {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const rawErrors = result.error.issues || result.error.errors || [];
      const errors = rawErrors.map((e) => ({
        field: Array.isArray(e.path) ? e.path.join(".") : String(e.path),
        message: e.message,
      }));
      return res.status(422).json({ success: false, message: "Validation failed", errors });
    }
    req.body = result.data;
    return next();
  };
};

module.exports = {
  validate,
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  inviteUserSchema,
  acceptInviteSchema,
};
