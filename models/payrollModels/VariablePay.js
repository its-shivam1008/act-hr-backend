const mongoose = require("mongoose");
const { Schema } = mongoose;

const VariablePaySchema = new Schema(
  {
    organisationId: { type: String, required: true, index: true },
    employeeId:     { type: Schema.Types.ObjectId, ref: "Employee" },
    employeeName:   { type: String, required: true, trim: true },
    employeeCode:   { type: String, required: true, trim: true },
    department:     { type: String, default: "" },

    type:           { type: String, required: true }, // e.g. "Performance Bonus", "Sales Commission", "Referral Bonus", "Spot Award", "Relocation Allowance", "Festival Bonus"
    amount:         { type: Number, required: true, min: 0 },
    period:         { type: String, required: true }, // e.g. "Q3 2023", "Oct 2023"
    status:         { type: String, enum: ["Pending", "Approved", "Rejected", "Processed", "Draft"], default: "Pending" },
    payoutDate:     { type: Date, required: true },
    note:           { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("VariablePay", VariablePaySchema);
