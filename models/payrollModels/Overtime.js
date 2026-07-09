const mongoose = require("mongoose");
const { Schema } = mongoose;

const OvertimeSchema = new Schema(
  {
    organisationId: { type: String, required: true, index: true },
    employeeId:     { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    employeeName:   { type: String, default: "" },
    employeeCode:   { type: String, default: "" },
    department:     { type: String, default: "" },

    month:          { type: Number, required: true },
    year:           { type: Number, required: true },
    date:           { type: Date, required: true },

    shiftHours:     { type: Number, default: 9 },   // Normal shift hours
    workedHours:    { type: Number, required: true },
    otHours:        { type: Number, default: 0 },   // workedHours - shiftHours (if positive)

    dayType:        { type: String, enum: ["Weekday", "Weekend", "Holiday"], default: "Weekday" },
    multiplier:     { type: Number, default: 1.5 }, // 1.5x Weekday, 2x Weekend, 3x Holiday
    hourlyRate:     { type: Number, default: 0 },
    otAmount:       { type: Number, default: 0 },   // hourlyRate × multiplier × otHours

    status:         { type: String, enum: ["Pending", "Approved", "Rejected", "Paid"], default: "Pending" },
    approvedBy:     { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Overtime", OvertimeSchema);
