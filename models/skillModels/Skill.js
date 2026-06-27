const mongoose = require("mongoose");
const { Schema } = mongoose;

const SkillSchema = new Schema(
  {
    organisationId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Skill name is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Unique skill name per organization
SkillSchema.index({ organisationId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("Skill", SkillSchema);
