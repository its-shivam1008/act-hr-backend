const mongoose = require('mongoose');

const LeavePolicySchema = new mongoose.Schema(
  {
    organisationId: { type: String, required: true, unique: true }, // Only one global policy for now
    excludeWeekends: { type: Boolean, default: true },
    sandwichRule: { type: Boolean, default: false },
    allowNegativeBalance: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('LeavePolicy', LeavePolicySchema);
