const mongoose = require("mongoose");
const { Schema } = mongoose;

/**
 * SkillAssignment — tracks which skills have been assigned to which employees.
 * A unique compound index on (organisationId + employee + skill) prevents duplicates.
 */
const SkillAssignmentSchema = new Schema(
  {
    organisationId: {
      type: String,
      required: true,
      index: true,
    },
    employee: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    skill: {
      type: Schema.Types.ObjectId,
      ref: "Skill",
      required: true,
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Prevent the same skill being assigned to the same employee twice
SkillAssignmentSchema.index(
  { organisationId: 1, employee: 1, skill: 1 },
  { unique: true }
);

module.exports = mongoose.model("SkillAssignment", SkillAssignmentSchema);
