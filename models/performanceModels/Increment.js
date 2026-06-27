const mongoose = require('mongoose');

const incrementSchema = new mongoose.Schema({
  employeeId: { type: String, required: true },
  employeeName: { type: String },
  cycleId: { type: mongoose.Schema.Types.ObjectId, ref: 'AppraisalCycle', required: true },
  currentCTC: { type: Number, required: true },
  recommendedPercentage: { type: Number, required: true },
  newCTC: { type: Number },
  effectiveDate: { type: Date, required: true },
  status: { type: String, enum: ['Pending', 'HR Approved', 'Payroll Synced', 'Rejected'], default: 'Pending' },
  payrollRevisionTriggered: { type: Boolean, default: false }
}, { timestamps: true });

// Auto calc newCTC before save if not provided
incrementSchema.pre('save', function(next) {
  if (this.currentCTC && this.recommendedPercentage && !this.newCTC) {
    this.newCTC = this.currentCTC + (this.currentCTC * this.recommendedPercentage / 100);
  }
  next();
});

module.exports = mongoose.model('Increment', incrementSchema);
