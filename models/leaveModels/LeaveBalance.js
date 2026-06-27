const mongoose = require('mongoose');

const LeaveBalanceSchema = new mongoose.Schema(
  {
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
    balance: { type: Number, required: true, default: 0 },
    year: { type: Number, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('LeaveBalance', LeaveBalanceSchema);
