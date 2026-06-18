const mongoose = require('mongoose');

const kpiSchema = new mongoose.Schema({
  employeeId: { type: String, required: true },
  employeeName: String,
  cycleId: { type: mongoose.Schema.Types.ObjectId, ref: 'AppraisalCycle' },
  title: { type: String, required: true },
  description: String,
  category: { type: String, enum: ['Technical', 'Leadership', 'Delivery', 'Learning', 'Sales', 'Other'], default: 'Other' },
  targetValue: Number,
  currentValue: { type: Number, default: 0 },
  unit: String, // e.g. '%', 'USD', 'count'
  dueDate: Date,
  status: { type: String, enum: ['Not Started', 'In Progress', 'At Risk', 'Completed', 'Exceeded'], default: 'Not Started' },
  weightage: { type: Number, default: 0 },
  notes: String,
}, { timestamps: true });

module.exports = mongoose.model('KPI', kpiSchema);
