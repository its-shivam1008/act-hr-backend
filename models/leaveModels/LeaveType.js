const mongoose = require('mongoose');

const LeaveTypeSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true }, // e.g., 'CL', 'SL'
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

module.exports = mongoose.model('LeaveType', LeaveTypeSchema);
