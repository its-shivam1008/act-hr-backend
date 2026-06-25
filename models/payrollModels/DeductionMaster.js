const mongoose = require("mongoose");
const { Schema } = mongoose;

const DeductionMasterSchema = new Schema(
  {
    organisationId: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    code: {
      type: String,
      required: true,
    },
    glCode: {
      type: String,
      default: "",
    },
    category: {
      type: String, // Welfare, Advance, Penalty, Statutory, Other
      required: true,
    },
    type: {
      type: String, // Recurring, One-time (Ad-hoc), EMI Based
      required: true,
    },
    taxImpact: {
      type: String, // Post-Tax, Pre-Tax
      required: true,
    },
    frequency: {
      type: String,
      default: "Monthly",
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("DeductionMaster", DeductionMasterSchema);
