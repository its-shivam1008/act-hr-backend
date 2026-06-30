const mongoose = require('mongoose');

const LeaveApplicationSchema = new mongoose.Schema(
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
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    days: { type: Number, required: true },
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'Cancelled'],
      default: 'Pending',
    },
    isLop: { type: Boolean, default: false },
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
    rejectionReason: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('LeaveApplication', LeaveApplicationSchema);
