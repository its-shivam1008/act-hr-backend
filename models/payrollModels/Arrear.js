const mongoose = require("mongoose");
const { Schema } = mongoose;

const ArrearSchema = new Schema(
  {
    organisationId:   { type: String, required: true, index: true },
    employeeId:       { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    employeeName:     { type: String, default: "" },
    employeeCode:     { type: String, default: "" },

    // Which month is being corrected?
    fromMonth:        { type: Number, required: true },
    fromYear:         { type: Number, required: true },

    // Original vs revised amount
    originalAmount:   { type: Number, required: true },
    revisedAmount:    { type: Number, required: true },
    arrearAmount:     { type: Number, default: 0 },   // revisedAmount - originalAmount

    reason:           { type: String, default: "" },

    // Which payroll run will include this arrear?
    appliedMonth:     { type: Number, default: null },
    appliedYear:      { type: Number, default: null },
    applied:          { type: Boolean, default: false },
    appliedPayrollId: { type: Schema.Types.ObjectId, ref: "PayrollRun", default: null },

    status:           { type: String, enum: ["Pending", "Applied", "Cancelled"], default: "Pending" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Arrear", ArrearSchema);
