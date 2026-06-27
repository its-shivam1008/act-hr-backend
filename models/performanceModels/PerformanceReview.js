const mongoose = require('mongoose');

const reviewItemSchema = new mongoose.Schema({
  goalId: { type: mongoose.Schema.Types.ObjectId, required: true }, // Refers to a specific goal inside PerformanceGoal
  selfRating: { type: Number, min: 1, max: 5 },
  selfComment: { type: String },
  managerRating: { type: Number, min: 1, max: 5 },
  managerComment: { type: String }
});

const performanceReviewSchema = new mongoose.Schema({
  employeeId: { type: String, required: true },
  employeeName: { type: String },
  managerId: { type: String },
  managerName: { type: String },
  cycleId: { type: mongoose.Schema.Types.ObjectId, ref: 'AppraisalCycle', required: true },
  performanceGoalId: { type: mongoose.Schema.Types.ObjectId, ref: 'PerformanceGoal', required: true },
  reviews: [reviewItemSchema],
  selfOverallRating: { type: Number },
  managerOverallRating: { type: Number }, // Weighted score calculated automatically
  finalRating: { type: Number },
  status: { type: String, enum: ['Pending Self Assessment', 'Pending Manager Evaluation', 'Calibration', 'Completed'], default: 'Pending Self Assessment' }
}, { timestamps: true });

module.exports = mongoose.model('PerformanceReview', performanceReviewSchema);
