const mongoose = require('mongoose');

const LeaveEncashmentSchema = new mongoose.Schema(
  {
    organisationId: { type: String, required: true, index: true },
    organizationId: { type: String, index: true }, // Support both forms
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true
    },
    leaveType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LeaveType',
      required: true
    },
    leaveTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LeaveType'
    },
    requestedDays: { type: Number, required: true },
    approvedDays: { type: Number },
    estimatedAmount: { type: Number, required: true },
    actualAmount: { type: Number },
    paymentMethod: {
      type: String,
      enum: ['Next Payroll', 'Separate Check'],
      required: true
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
      index: true
    },
    remarks: { type: String, default: '' },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: { type: Date },
    rejectedReason: { type: String, default: '' }
  },
  { timestamps: true }
);

// Compatibility middleware
LeaveEncashmentSchema.pre('save', function (next) {
  if (!this.organizationId && this.organisationId) {
    this.organizationId = this.organisationId;
  }
  if (!this.organisationId && this.organizationId) {
    this.organisationId = this.organizationId;
  }
  if (!this.leaveTypeId && this.leaveType) {
    this.leaveTypeId = this.leaveType;
  }
  if (!this.leaveType && this.leaveTypeId) {
    this.leaveType = this.leaveTypeId;
  }
  next();
});

module.exports = mongoose.model('LeaveEncashment', LeaveEncashmentSchema);
