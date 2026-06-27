const mongoose = require("mongoose");
const { Schema } = mongoose;

const AdditionMasterSchema = new Schema(
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
      type: String, // Earning, Reimbursement, Variable Pay, Statutory Benefit
      required: true,
    },
    type: {
      type: String, // Fixed Amount, Formula Based, Balancing Component, Variable
      required: true,
    },
    taxable: {
      type: Boolean,
      default: true,
    },
    frequency: {
      type: String, // Monthly, Yearly, Ad-hoc
      default: "Monthly",
    },
    formula: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AdditionMaster", AdditionMasterSchema);
