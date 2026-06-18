const mongoose = require('mongoose');

const stageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  status: { type: String, enum: ['Pending', 'In Progress', 'Completed'], default: 'Pending' }
});

const appraisalCycleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['Annual', 'Half-Yearly', 'Quarterly', 'Ad-hoc'], default: 'Annual' },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  status: { type: String, enum: ['Draft', 'Active', 'Completed'], default: 'Draft' },
  currentStage: { type: String, default: '-' },
  progress: { type: Number, default: 0 },
  participantsCount: { type: Number, default: 0 },
  stages: [stageSchema]
}, { timestamps: true });

module.exports = mongoose.model('AppraisalCycle', appraisalCycleSchema);
