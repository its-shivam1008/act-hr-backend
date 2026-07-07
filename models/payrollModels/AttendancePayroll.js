const mongoose = require("mongoose");
const { Schema } = mongoose;

const AttendancePayrollSchema = new Schema(
  {
    organisationId: { type: String, required: true, index: true },
    employeeId:     { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    employeeName:   { type: String, default: "" },
    employeeCode:   { type: String, default: "" },
    department:     { type: String, default: "" },

    month:          { type: Number, required: true },  // 1-12
    year:           { type: Number, required: true },

    // Attendance inputs
    totalDays:      { type: Number, default: 0 },   // Calendar days in month
    present:        { type: Number, default: 0 },
    absent:         { type: Number, default: 0 },
    halfDay:        { type: Number, default: 0 },
    paidLeave:      { type: Number, default: 0 },
    unpaidLeave:    { type: Number, default: 0 },
    weekOff:        { type: Number, default: 0 },
    holidays:       { type: Number, default: 0 },
    arrears:        { type: Number, default: 0 },    // Extra paid days from arrear
    leaveEncashment:{ type: Number, default: 0 },

    // Calculated outputs
    paidDays:       { type: Number, default: 0 },
    lop:            { type: Number, default: 0 },    // Loss of Pay days

    onHold:         { type: Boolean, default: false },
    status:         { type: String, enum: ["Draft", "Synced", "Modified", "Locked"], default: "Draft" },
  },
  { timestamps: true }
);

// One record per employee per month/year per org
AttendancePayrollSchema.index(
  { organisationId: 1, employeeId: 1, month: 1, year: 1 },
  { unique: true }
);

module.exports = mongoose.model("AttendancePayroll", AttendancePayrollSchema);
