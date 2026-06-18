const AppraisalCycle = require('../../models/performanceModels/AppraisalCycle');

exports.createCycle = async (req, res) => {
  try {
    const cycle = new AppraisalCycle(req.body);
    await cycle.save();
    res.status(201).json(cycle);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getCycles = async (req, res) => {
  try {
    const cycles = await AppraisalCycle.find().sort({ createdAt: -1 });
    res.status(200).json(cycles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getCycleById = async (req, res) => {
  try {
    const cycle = await AppraisalCycle.findById(req.params.id);
    if (!cycle) return res.status(404).json({ error: 'Not found' });
    res.status(200).json(cycle);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateCycle = async (req, res) => {
  try {
    const cycle = await AppraisalCycle.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!cycle) return res.status(404).json({ error: 'Not found' });
    res.status(200).json(cycle);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
