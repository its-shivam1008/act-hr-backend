const mongoose = require("mongoose");
const { Schema } = mongoose;

const PayrollLockSchema = new Schema(
  {
    organisationId: { type: String, required: true },
    month:          { type: Number, required: true },
    year:           { type: Number, required: true },
    locked:         { type: Boolean, default: false },
    lockedBy:       { type: Schema.Types.ObjectId, ref: "User", default: null },
    lockedAt:       { type: Date, default: null },
    unlockedBy:     { type: Schema.Types.ObjectId, ref: "User", default: null },
    unlockedAt:     { type: Date, default: null },
    note:           { type: String, default: "" },
  },
  { timestamps: true }
);

PayrollLockSchema.index({ organisationId: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model("PayrollLock", PayrollLockSchema);
