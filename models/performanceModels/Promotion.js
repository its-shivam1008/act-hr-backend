const mongoose = require('mongoose');

const promotionSchema = new mongoose.Schema({
  employeeId: { type: String, required: true },
  employeeName: { type: String },
  cycleId: { type: mongoose.Schema.Types.ObjectId, ref: 'AppraisalCycle', required: true },
  currentGrade: { type: String, required: true },
  newGrade: { type: String, required: true },
  currentDesignation: { type: String, required: true },
  newDesignation: { type: String, required: true },
  effectiveDate: { type: Date, required: true },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' }
}, { timestamps: true });

module.exports = mongoose.model('Promotion', promotionSchema);
