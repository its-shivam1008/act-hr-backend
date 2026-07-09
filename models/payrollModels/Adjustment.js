const mongoose = require("mongoose");
const { Schema } = mongoose;
const OID = Schema.Types.ObjectId;

const AdjustmentSchema = new Schema(
  {
    organisationId: {
      type: String,
      required: true,
    },
    personType: {
      type: String,
      enum: ["Employee", "Labour"],
      default: "Employee",
      index: true,
    },
    employee: {
      type: OID,
      ref: "Employee",
      required: true,
    },
    employeeName: { type: String },
    employeeId: { type: String },
    locationId: { type: OID, ref: "Location", default: null, index: true },
    locationName: { type: String, default: "" },
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
  { timestamps: true },
);

AdjustmentSchema.index({
  organisationId: 1,
  isRecurring: 1,
  status: 1,
  createdAt: -1,
});
AdjustmentSchema.index({
  organisationId: 1,
  locationId: 1,
  isRecurring: 1,
  status: 1,
  createdAt: -1,
});
AdjustmentSchema.index({
  employeeName: "text",
  employeeId: "text",
  componentName: "text",
  componentCode: "text",
  reason: "text",
});

module.exports = mongoose.model("Adjustment", AdjustmentSchema);
