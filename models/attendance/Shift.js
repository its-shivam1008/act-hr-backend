const mongoose = require("mongoose");
const { Schema } = mongoose;
const OID = Schema.Types.ObjectId;

const ShiftSchema = new Schema(
  {
    organisationId: { type: String, required: true, index: true },
    name:           { type: String, required: true },
    code:           { type: String, required: true },
    location:       { type: OID, ref: "Location", default: null },
    locationName:   String,
    department:     { type: OID, ref: "Department", default: null },
    departmentName: String,
    startTime:      { type: String, required: true }, // "HH:MM"
    endTime:        { type: String, required: true }, // "HH:MM"
    isNightShift:   { type: Boolean, default: false }, // Cross Day
    breakDuration:  { type: Number, default: 0 }, // in minutes
    graceTime:      { type: Number, default: 0 }, // in minutes
    halfDayHours:   { type: Number, default: 4 },
    minWorkingHours:{ type: Number, default: 8 },
    lateMarkAfter:  { type: Number, default: 15 }, // in minutes
    earlyExitBefore:{ type: Number, default: 15 }, // in minutes
    description:    String,
    color:          { type: String, default: "indigo" },
    status:         { type: String, enum: ["Active", "Inactive"], default: "Active" },
  },
  { timestamps: true }
);

// Unique code per organisation
ShiftSchema.index({ organisationId: 1, code: 1 }, { unique: true });

module.exports = mongoose.model("Shift", ShiftSchema);
