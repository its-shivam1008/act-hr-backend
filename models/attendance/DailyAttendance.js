const mongoose = require("mongoose");
const { Schema } = mongoose;

const DailyAttendanceSchema = new Schema(
  {
    organisationId: {
      type: String,
      required: true,
      index: true
    },
    date: {
      type: Date,
      required: true
    },
    dateString: {
      type: String, // YYYY-MM-DD format
      required: true,
      index: true
    },
    personType: {
      type: String,
      enum: ["Labour", "Employee"],
      required: true
    },
    personId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true
    },
    climsId: String,
    formA: String,
    employeeId: String,
    departmentName: String,
    locationId: {
      type: Schema.Types.ObjectId,
      ref: "Location",
      default: null
    },
    status: {
      type: String,
      required: true,
      // present, absent, half day, sunday OT, sunday present (for Labour)
      // present, absent, half day, leave, late, paid leave (for Employee)
      enum: [
        "Present", "Absent", "Half Day", "Sunday OT", "Sunday Present",
        "Leave", "Late", "Paid Leave", "WO", "HL"
      ]
    },
    overtimeHours: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

// Compound index to ensure uniqueness per person per day
DailyAttendanceSchema.index({ organisationId: 1, dateString: 1, personId: 1 }, { unique: true });

module.exports = mongoose.model("DailyAttendance", DailyAttendanceSchema);
