const mongoose = require("mongoose");

const EmploymentTypeSchema = new mongoose.Schema(
  {
    // ── Organisation scope ─────────────────────────────────────────────────
    organisationId: {
      type: String,
      required: [true, "Organisation ID is required"],
      index: true,
    },

    // ── Core fields ────────────────────────────────────────────────────────
    name: {
      type: String,
      required: [true, "Employment type name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [80, "Name cannot exceed 80 characters"],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [300, "Description cannot exceed 300 characters"],
      default: "",
    },

    // ── Status ─────────────────────────────────────────────────────────────
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Compound index – name unique per organisation
EmploymentTypeSchema.index({ organisationId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("EmploymentType", EmploymentTypeSchema);
