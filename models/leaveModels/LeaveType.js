const mongoose = require('mongoose');

const LeaveTypeSchema = new mongoose.Schema(
  {
    organisationId: { type: String, required: true, index: true },
    code: { type: String, required: true }, // e.g., 'CL', 'SL'
    name: { type: String, required: true }, // e.g., 'Casual Leave'
    daysPerYear: { type: Number, required: true },
    accrualType: {
      type: String,
      enum: ['Monthly', 'Quarterly', 'One-time', 'As earned'],
      required: true,
    },
    carryForward: { type: Boolean, default: false },
    maxCarryForward: { type: Number, default: 0 },
    encashable: { type: Boolean, default: false },
    lopIfExceeded: { type: Boolean, default: false },
  },
  { timestamps: true }
);

LeaveTypeSchema.index({ organisationId: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('LeaveType', LeaveTypeSchema);
