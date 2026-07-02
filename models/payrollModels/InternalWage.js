const mongoose = require("mongoose");
const { Schema } = mongoose;

const InternalWageSchema = new Schema(
  {
    organisationId: { type: String, required: true, index: true },
    type: { type: String, enum: ["Labour", "Employee"], default: "Labour" },
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", default: null },
    labourId: { type: Schema.Types.ObjectId, ref: "Labour", default: null },
    
    // Identifiers
    name: { type: String, required: true },
    formA: { type: String, default: "" },
    climsId: { type: String, default: "" },
    designation: { type: String, default: "" },
    department: { type: String, default: "" },
    agency: { type: String, default: "" },
    
    // Filters
    location: { type: String, required: true }, // e.g. location name or id
    month: { type: String, required: true }, // e.g. "June"
    year: { type: Number, required: true }, // e.g. 2026

    // Rates
    rateMonth: { type: Number, default: 0 },
    rateDay: { type: Number, default: 0 },
    rateHour: { type: Number, default: 0 },

    // Labour Wage Columns
    present: { type: Number, default: 0 },
    sundayPresent: { type: Number, default: 0 },
    otHours: { type: Number, default: 0 },
    basic: { type: Number, default: 0 },
    ot: { type: Number, default: 0 },
    others: { type: Number, default: 0 },
    grossEarning: { type: Number, default: 0 },
    cashDeduction: { type: Number, default: 0 },
    miscDeduction: { type: Number, default: 0 },
    advanceDeduction: { type: Number, default: 0 },
    totalDeduction: { type: Number, default: 0 },
    netPay: { type: Number, default: 0 },

    // Employee Wage Columns (if type === "Employee")
    presenceDays: { type: Number, default: 0 },
    lateDays: { type: Number, default: 0 },
    totalPresent: { type: Number, default: 0 },
    deductedDays: { type: Number, default: 0 },
    paidDays: { type: Number, default: 0 },
    allowances: { type: Number, default: 0 },
    allowanceDay: { type: Number, default: 0 },
    otPay: { type: Number, default: 0 },
    variablePay: { type: Number, default: 0 },
    bonus: { type: Number, default: 0 },
    pf: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    health: { type: Number, default: 0 },
    profTax: { type: Number, default: 0 },
    advanceSalary: { type: Number, default: 0 },
    paySlip: { type: String, default: "Unpaid" },

    // Banking details
    bankName: { type: String, default: "" },
    branchName: { type: String, default: "" },
    ifsc: { type: String, default: "" },
    accountNo: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("InternalWage", InternalWageSchema);
