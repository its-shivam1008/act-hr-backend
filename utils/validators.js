const { z } = require("zod");

// ─── Register ──────────────────────────────────────────────────────────────
const registerSchema = z.object({
  name: z
    .string({ required_error: "Name is required" })
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(60, "Name cannot exceed 60 characters"),

  email: z
    .string({ required_error: "Email is required" })
    .trim()
    .toLowerCase()
    .email("Please provide a valid email address"),

  password: z
    .string({ required_error: "Password is required" })
    .min(6, "Password must be at least 6 characters")
    .max(72, "Password cannot exceed 72 characters"),

  role: z
    .enum(["employee", "manager", "admin"])
    .optional()
    .default("employee"),
});

// ─── Login ─────────────────────────────────────────────────────────────────
const loginSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .trim()
    .toLowerCase()
    .email("Please provide a valid email address"),

  password: z
    .string({ required_error: "Password is required" })
    .min(1, "Password is required"),
});

// ─── Forgot Password ────────────────────────────────────────────────────────
const forgotPasswordSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .trim()
    .toLowerCase()
    .email("Please provide a valid email address"),
});

// ─── Reset Password ─────────────────────────────────────────────────────────
const resetPasswordSchema = z.object({
  password: z
    .string({ required_error: "Password is required" })
    .min(6, "Password must be at least 6 characters")
    .max(72, "Password cannot exceed 72 characters"),
});

// ─── Validator Middleware Factory ────────────────────────────────────────────
/**
 * Returns an Express middleware that validates req.body against a Zod schema.
 * Compatible with both Zod v3 (error.errors) and Zod v4 (error.issues).
 */
const validate = (schema) => {
  return function validateMiddleware(req, res, next) {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      // Zod v4 uses .issues; v3 uses .errors
      const rawErrors = result.error.issues || result.error.errors || [];
      const errors = rawErrors.map((e) => ({
        field: Array.isArray(e.path) ? e.path.join(".") : String(e.path),
        message: e.message,
      }));
      return res.status(422).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    // Replace req.body with the parsed, trimmed, coerced data
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
};
