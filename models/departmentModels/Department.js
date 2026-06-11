const mongoose = require("mongoose");

const DepartmentSchema = new mongoose.Schema(
  {
    organisationId: {
      type: String,
      required: [true, "Organisation ID is required"],
      index: true,
    },
    name: {
      type: String,
      required: [true, "Department name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [300, "Description cannot exceed 300 characters"],
      default: "",
    },
    numberOfEmployees: {
      type: Number,
      default: 0,
      min: [0, "Number of employees cannot be negative"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Enforce unique department names per organisation
DepartmentSchema.index({ organisationId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("Department", DepartmentSchema);
