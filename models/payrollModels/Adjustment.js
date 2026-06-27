const mongoose = require("mongoose");
const { Schema } = mongoose;
const OID = Schema.Types.ObjectId;

const AdjustmentSchema = new Schema(
  {
    organisationId: {
      type: String,
      required: true,
    },
    employee: {
      type: OID,
      ref: "Employee",
      required: true,
    },
    employeeName: { type: String },
    employeeId:   { type: String },
    adjustmentType: {
      type: String, // Addition, Deduction
      required: true,
      enum: ["Addition", "Deduction"],
    },
    componentName: {
      type: String, // e.g. "Fuel Allowance"
      required: true,
    },
    componentCode: {
      type: String, // e.g. "REIM-FUEL"
    },
    amount: {
      type: Number,
      required: true,
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    startMonth: {
      type: String, // "YYYY-MM"
    },
    endMonth: {
      type: String, // "YYYY-MM", null if one-time
      default: null,
    },
    reason: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["Active", "Stopped", "Applied"],
      default: "Active",
    },
    payrollMonth: {
      type: String, // "YYYY-MM" for one-time
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Adjustment", AdjustmentSchema);
