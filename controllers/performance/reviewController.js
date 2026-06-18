const PerformanceReview = require('../../models/performanceModels/PerformanceReview');
const PerformanceGoal = require('../../models/performanceModels/PerformanceGoal');

exports.createReview = async (req, res) => {
  try {
    const review = new PerformanceReview(req.body);
    await review.save();
    res.status(201).json(review);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getReviews = async (req, res) => {
  try {
    const filter = {};
    if (req.query.employeeId) filter.employeeId = req.query.employeeId;
    if (req.query.managerId) filter.managerId = req.query.managerId;
    
    const reviews = await PerformanceReview.find(filter).populate('cycleId').populate('performanceGoalId');
    res.status(200).json(reviews);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateReview = async (req, res) => {
  try {
    const review = await PerformanceReview.findById(req.params.id).populate('performanceGoalId');
    if (!review) return res.status(404).json({ error: 'Not found' });

    Object.assign(review, req.body);

    // Auto calculate weighted scores
    if (review.performanceGoalId && review.reviews && review.reviews.length > 0) {
      let selfScore = 0;
      let managerScore = 0;
      let totalW = 0;

      for (let rItem of review.reviews) {
        // Find corresponding goal weightage
        const goal = review.performanceGoalId.goals.find(g => g._id.toString() === rItem.goalId.toString());
        if (goal) {
          totalW += goal.weightage;
          if (rItem.selfRating) selfScore += (rItem.selfRating * goal.weightage);
          if (rItem.managerRating) managerScore += (rItem.managerRating * goal.weightage);
        }
      }

      if (totalW > 0) {
        review.selfOverallRating = Number((selfScore / totalW).toFixed(2));
        review.managerOverallRating = Number((managerScore / totalW).toFixed(2));
        review.finalRating = review.managerOverallRating || review.selfOverallRating;
      }
    }

    await review.save();
    res.status(200).json(review);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
