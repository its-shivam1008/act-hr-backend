const PerformanceGoal = require('../../models/performanceModels/PerformanceGoal');

exports.createGoal = async (req, res) => {
  try {
    // Expected to have weightages totalling 100
    const totalW = req.body.goals.reduce((acc, g) => acc + g.weightage, 0);
    if (totalW !== 100) {
      return res.status(400).json({ error: 'Total weightage must be exactly 100%' });
    }
    const goal = new PerformanceGoal(req.body);
    await goal.save();
    res.status(201).json(goal);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getGoals = async (req, res) => {
  try {
    const filter = {};
    if (req.query.employeeId) filter.employeeId = req.query.employeeId;
    if (req.query.cycleId) filter.cycleId = req.query.cycleId;

    const goals = await PerformanceGoal.find(filter).populate('cycleId');
    res.status(200).json(goals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateGoal = async (req, res) => {
  try {
    const goal = await PerformanceGoal.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!goal) return res.status(404).json({ error: 'Not found' });
    res.status(200).json(goal);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
