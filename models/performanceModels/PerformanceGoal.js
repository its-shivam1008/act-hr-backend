const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  category: { type: String, enum: ['Technical', 'Leadership', 'Delivery', 'Learning', 'Other'], default: 'Technical' },
  weightage: { type: Number, required: true },
  targetDate: { type: Date },
  status: { type: String, enum: ['Not Started', 'In Progress', 'Completed', 'On Hold'], default: 'Not Started' },
  progress: { type: Number, default: 0 } // 0-100
});

const performanceGoalSchema = new mongoose.Schema({
  employeeId: { type: String, required: true }, // Using String to mock user data for now
  employeeName: { type: String },
  cycleId: { type: mongoose.Schema.Types.ObjectId, ref: 'AppraisalCycle', required: true },
  goals: [goalSchema],
  totalWeightage: { type: Number, default: 0 },
  status: { type: String, enum: ['Draft', 'Submitted', 'Approved', 'Rejected'], default: 'Draft' }
}, { timestamps: true });

// Pre-save hook to calculate total weightage
performanceGoalSchema.pre('save', function(next) {
  this.totalWeightage = this.goals.reduce((acc, goal) => acc + goal.weightage, 0);
  next();
});

module.exports = mongoose.model('PerformanceGoal', performanceGoalSchema);
