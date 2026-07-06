const mongoose = require("mongoose");
const { Schema } = mongoose;

// One payslip line item
const LineItemSchema = new Schema(
  { name: String, amount: Number, kind: { type: String, enum: ["Earning", "Deduction"] } },
  { _id: false }
);

const PayrollRunSchema = new Schema(
  {
    organisationId:   { type: String, required: true, index: true },
    employeeId:       { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    employeeName:     { type: String, default: "" },
    employeeCode:     { type: String, default: "" },
    department:       { type: String, default: "" },
    designation:      { type: String, default: "" },

    month:            { type: Number, required: true },
    year:             { type: Number, required: true },

    salaryStructureId:{ type: Schema.Types.ObjectId, ref: "SalaryStructure", default: null },

    // Earnings breakdown
    basic:            { type: Number, default: 0 },
    hra:              { type: Number, default: 0 },
    da:               { type: Number, default: 0 },
    medical:          { type: Number, default: 0 },
    special:          { type: Number, default: 0 },
    conveyance:       { type: Number, default: 0 },
    bonus:            { type: Number, default: 0 },
    otAmount:         { type: Number, default: 0 },
    arrear:           { type: Number, default: 0 },
    otherEarnings:    { type: Number, default: 0 },

    gross:            { type: Number, default: 0 },

    // Deductions breakdown
    pf:               { type: Number, default: 0 },
    esi:              { type: Number, default: 0 },
    pt:               { type: Number, default: 0 },
    tds:              { type: Number, default: 0 },
    loanDeduction:    { type: Number, default: 0 },
    advanceDeduction: { type: Number, default: 0 },
    lopDeduction:     { type: Number, default: 0 },
    otherDeductions:  { type: Number, default: 0 },

    totalDeductions:  { type: Number, default: 0 },
    netSalary:        { type: Number, default: 0 },

    // Attendance summary (snapshot)
    paidDays:         { type: Number, default: 0 },
    lop:              { type: Number, default: 0 },

    // Arbitrary extra line items
    lineItems:        { type: [LineItemSchema], default: [] },

    status:           { type: String, enum: ["Draft", "Processed", "Paid", "Reversed"], default: "Draft" },
    payslipUrl:       { type: String, default: "" },
  },
  { timestamps: true }
);

// Unique per employee per month/year/org
PayrollRunSchema.index(
  { organisationId: 1, employeeId: 1, month: 1, year: 1 },
  { unique: true }
);

module.exports = mongoose.model("PayrollRun", PayrollRunSchema);
