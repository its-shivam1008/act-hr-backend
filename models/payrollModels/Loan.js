const mongoose = require("mongoose");
const { Schema } = mongoose;
const OID = Schema.Types.ObjectId;

const EMISchema = new Schema({
  month:     { type: String },   // e.g. "2023-11"
  amount:    { type: Number },
  status:    { type: String, enum: ["Pending", "Recovered", "Waived"], default: "Pending" },
  recoveredOn: { type: Date, default: null },
}, { _id: false });

const LoanSchema = new Schema(
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
    loanType: {
      type: String, // Personal Loan, Vehicle Loan, Emergency Loan, Salary Advance
      required: true,
    },
    principalAmount: {
      type: Number,
      required: true,
    },
    interestRate: {
      type: Number,    // percentage, 0 for interest-free
      default: 0,
    },
    tenureMonths: {
      type: Number,
      required: true,
    },
    emiAmount: {
      type: Number,
    },
    disbursementDate: {
      type: Date,
      default: null,
    },
    reason: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["Pending Approval", "Approved", "Active", "Closed", "Rejected"],
      default: "Pending Approval",
    },
    approvedBy: {
      type: OID,
      ref: "User",
      default: null,
    },
    emis: [EMISchema],
  },
  { timestamps: true }
);

// Virtual: amount paid
LoanSchema.virtual("amountPaid").get(function () {
  return this.emis
    .filter((e) => e.status === "Recovered")
    .reduce((acc, e) => acc + e.amount, 0);
});

// Virtual: outstanding balance
LoanSchema.virtual("outstandingBalance").get(function () {
  return this.principalAmount - this.amountPaid;
});

module.exports = mongoose.model("Loan", LoanSchema);
