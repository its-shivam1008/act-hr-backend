const mongoose = require("mongoose");
const { Schema } = mongoose;
const OID = Schema.Types.ObjectId;

const SalaryAdvanceSchema = new Schema(
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
    amount: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      default: "",
    },
    requestDate: {
      type: Date,
      default: Date.now,
    },
    recoveryMonth: {
      type: String, // e.g. "2023-11" (YYYY-MM)
      default: "",
    },
    status: {
      type: String,
      enum: ["Pending Approval", "Active", "Recovered", "Rejected"],
      default: "Pending Approval",
    },
    approvedBy: {
      type: OID,
      ref: "User",
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    remarks: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

SalaryAdvanceSchema.index({ organisationId: 1, status: 1, createdAt: -1 });
SalaryAdvanceSchema.index({
  organisationId: 1,
  locationId: 1,
  status: 1,
  createdAt: -1,
});
SalaryAdvanceSchema.index({
  employeeName: "text",
  employeeId: "text",
  reason: "text",
});

module.exports = mongoose.model("SalaryAdvance", SalaryAdvanceSchema);
