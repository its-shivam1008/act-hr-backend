const mongoose = require('mongoose');

const LeaveBalanceSchema = new mongoose.Schema(
  {
    organisationId: { type: String, required: true, index: true },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    leaveType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LeaveType',
      required: true,
    },
    total: { type: Number, required: true, default: 0 },
    used: { type: Number, required: true, default: 0 },
    balance: { type: Number, required: true, default: 0 },
    year: { type: Number, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('LeaveBalance', LeaveBalanceSchema);
