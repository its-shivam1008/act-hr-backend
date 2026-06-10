const mongoose = require("mongoose");

const DesignationSchema = new mongoose.Schema(
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
      required: [true, "Designation name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },

    // Ref to Department model (will be populated once Departments are built)
    // Stored as ObjectId – also keeping a denormalised name for quick display
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      default: null,
    },

    // Denormalised label – set by controller on create/update for fast reads
    departmentName: {
      type: String,
      trim: true,
      default: "",
    },

    // Ref to SkillLevel model (will be populated once SkillLevels are built)
    level: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SkillLevel",
      default: null,
    },

    // Denormalised label – set by controller on create/update for fast reads
    levelName: {
      type: String,
      trim: true,
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

// Designation name unique per organisation
DesignationSchema.index({ organisationId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("Designation", DesignationSchema);
