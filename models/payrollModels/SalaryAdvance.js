const mongoose = require("mongoose");
const { Schema } = mongoose;
const OID = Schema.Types.ObjectId;

const SalaryAdvanceSchema = new Schema(
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
  { timestamps: true }
);

module.exports = mongoose.model("SalaryAdvance", SalaryAdvanceSchema);
