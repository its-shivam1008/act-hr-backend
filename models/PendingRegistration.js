const mongoose = require("mongoose");
const crypto   = require("crypto");

// Stores registration data until OTP is verified.
// TTL index auto-deletes documents after 10 minutes (same as OTP lifetime).
const PendingRegistrationSchema = new mongoose.Schema({
  name:             { type: String, required: true },
  email:            { type: String, required: true, lowercase: true, trim: true },
  password:         { type: String, required: true },   // already bcrypt-hashed
  organisationId:   { type: String, required: true },
  organisationName: { type: String, required: true },

  // OTP (hashed)
  otp:       { type: String, required: true },
  otpExpire: { type: Date,   required: true },

  // TTL: MongoDB auto-removes this document 10 min after createdAt
  createdAt: { type: Date, default: Date.now, expires: 600 },  // 600 seconds = 10 min
});

// Unique on email so duplicate registrations replace the existing pending entry
PendingRegistrationSchema.index({ email: 1 }, { unique: true });

PendingRegistrationSchema.methods.generateOtp = function () {
  const otp      = String(Math.floor(100000 + Math.random() * 900000));
  this.otp       = crypto.createHash("sha256").update(otp).digest("hex");
  this.otpExpire = new Date(Date.now() + 10 * 60 * 1000);
  return otp;   // plain text → sent to user's email
};

module.exports = mongoose.model("PendingRegistration", PendingRegistrationSchema);
