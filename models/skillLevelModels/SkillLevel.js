const mongoose = require("mongoose");

const SkillLevelSchema = new mongoose.Schema(
  {
    organisationId: {
      type: String,
      required: [true, "Organisation ID is required"],
      index: true,
    },
    name: {
      type: String,
      required: [true, "Skill level name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [80, "Name cannot exceed 80 characters"],
    },
    levelNumber: {
      type: Number,
      required: [true, "Level number is required"],
      min: [1, "Level number must be at least 1"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [300, "Description cannot exceed 300 characters"],
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Enforce unique names and level numbers per organisation
SkillLevelSchema.index({ organisationId: 1, name: 1 }, { unique: true });
SkillLevelSchema.index({ organisationId: 1, levelNumber: 1 }, { unique: true });

module.exports = mongoose.model("SkillLevel", SkillLevelSchema);
