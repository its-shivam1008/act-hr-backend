const mongoose = require("mongoose");

const GradeSchema = new mongoose.Schema(
  {
    organisationId: {
      type: String,
      required: [true, "Organisation ID is required"],
      index: true,
    },
    // Grade name e.g. "L1", "L2", "Senior Engineer", "Manager"
    name: {
      type: String,
      required: [true, "Grade name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    // Short code e.g. "L1", "MGR"
    code: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },
    // Linked designation (optional but recommended)
    designation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Designation",
      default: null,
    },
    // Denormalised for fast display
    designationName: {
      type: String,
      trim: true,
      default: "",
    },
    // Compensation band
    minSalary: { type: Number, default: 0 },
    maxSalary: { type: Number, default: 0 },
    // Description / notes
    description: { type: String, trim: true, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Grade name unique per organisation
GradeSchema.index({ organisationId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("Grade", GradeSchema);
