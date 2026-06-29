const mongoose = require("mongoose");
const { Schema } = mongoose;
const OID = Schema.Types.ObjectId;

const RosterSchema = new Schema(
  {
    organisationId: { type: String, required: true, index: true },
    employee:       { type: OID, ref: "Employee", required: true },
    employeeName:   String,
    year:           { type: Number, required: true },
    month:          { type: Number, required: true }, // 0-11
    days: [
      {
        day: { type: Number, required: true }, // 1 to 31
        shift: { type: OID, ref: "Shift", default: null },
        shiftCode: { type: String, default: "WO" }, // GS, S1, S2, WO, L
      }
    ],
  },
  { timestamps: true }
);

// Unique roster per employee, year and month within organisation
RosterSchema.index({ organisationId: 1, employee: 1, year: 1, month: 1 }, { unique: true });

module.exports = mongoose.model("Roster", RosterSchema);
