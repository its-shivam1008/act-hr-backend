const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");
const crypto   = require("crypto");

const UserSchema = new mongoose.Schema(
  {
    // ── Core identity ──────────────────────────────────────────────────────
    name: {
      type: String,
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [60, "Name cannot exceed 60 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },

    // ── Role ───────────────────────────────────────────────────────────────
    role: {
      type: String,
      enum: ["super_admin", "admin", "manager", "employee"],
      default: "super_admin",
    },

    // ── Active organisation ────────────────────────────────────────────────
    organisationId: { type: String, required: true },
    organisationName: { type: String, required: true, trim: true },

    // ── Invite state (for brand-new users with no account yet) ────────────
    // "pending" = user created by invite only, no password set yet
    // "active"  = fully registered user (self-signup or accepted invite)
    inviteStatus: {
      type: String,
      enum: ["pending", "active"],
      default: "active",
    },

    // ── Invite token (shared for both new-user and existing-user invites) ─
    inviteToken:       { type: String, select: false },
    inviteTokenExpire: { type: Date,   select: false },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    // ── Pending org switch (used when an existing user is invited) ─────────
    // When an already-registered user is invited to a different org,
    // we store the target org here. On accept → swap active org to this.
    pendingOrgId:   { type: String, select: false },
    pendingOrgName: { type: String, select: false },
    pendingRole:    { type: String, select: false },

    // ── Email verification ─────────────────────────────────────────────────
    // Always true for new registrations — User is only created AFTER OTP is verified.
    // For existing users (invited), default is true; forgot-password uses emailOtp fields.
    isVerified: { type: Boolean, default: true },
    emailOtp:        { type: String, select: false },   // used for forgot-password OTP only
    emailOtpExpire:  { type: Date,   select: false },
    otpPurpose:      { type: String, enum: ['register', 'forgot-password'], select: false },

    // ── Misc ───────────────────────────────────────────────────────────────
    isActive:           { type: Boolean, default: true },
    lastLogin:          Date,
    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  { timestamps: true }
);

// ── Hash password on change ────────────────────────────────────────────────
// Skip if password is already hashed (e.g. passed from PendingRegistration after verification)
UserSchema.pre("save", async function () {
  if (!this.isModified("password") || !this.password) return;
  // bcrypt hashes always start with $2a$ or $2b$ — skip re-hashing
  if (this.password.startsWith("$2")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// ── Compare passwords ──────────────────────────────────────────────────────
UserSchema.methods.matchPassword = async function (entered) {
  return bcrypt.compare(entered, this.password);
};

// ── Generate hashed invite token (72-hour expiry) ─────────────────────────
UserSchema.methods.generateInviteToken = function () {
  const raw = crypto.randomBytes(32).toString("hex");
  this.inviteToken       = crypto.createHash("sha256").update(raw).digest("hex");
  this.inviteTokenExpire = Date.now() + 72 * 60 * 60 * 1000;
  return raw;
};

// ── Generate 6-digit OTP (10-minute expiry) ───────────────────────────────
UserSchema.methods.generateOtp = function (purpose) {
  const otp = String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
  this.emailOtp       = crypto.createHash("sha256").update(otp).digest("hex");
  this.emailOtpExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
  this.otpPurpose     = purpose;
  return otp; // plain OTP → emailed to user
};

// ── Safe payload ──────────────────────────────────────────────────────────
UserSchema.methods.toSafeObject = function () {
  return {
    id:               this._id,
    name:             this.name,
    email:            this.email,
    role:             this.role,
    organisationId:   this.organisationId,
    organisationName: this.organisationName,
    inviteStatus:     this.inviteStatus,
    isActive:         this.isActive,
    lastLogin:        this.lastLogin,
    createdAt:        this.createdAt,
  };
};

module.exports = mongoose.model("User", UserSchema);
