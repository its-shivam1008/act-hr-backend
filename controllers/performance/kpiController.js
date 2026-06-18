const KPI = require('../../models/performanceModels/KPI');

exports.getKPIs = async (req, res) => {
  try {
    const filter = {};
    if (req.query.employeeId) filter.employeeId = req.query.employeeId;
    if (req.query.cycleId) filter.cycleId = req.query.cycleId;
    const kpis = await KPI.find(filter).sort({ createdAt: -1 });
    res.json(kpis);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.createKPI = async (req, res) => {
  try {
    const kpi = new KPI(req.body);
    await kpi.save();
    res.status(201).json(kpi);
  } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.updateKPI = async (req, res) => {
  try {
    const kpi = await KPI.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!kpi) return res.status(404).json({ error: 'KPI not found' });
    res.json(kpi);
  } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.deleteKPI = async (req, res) => {
  try {
    await KPI.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateProgress = async (req, res) => {
  try {
    const { currentValue, notes } = req.body;
    const kpi = await KPI.findById(req.params.id);
    if (!kpi) return res.status(404).json({ error: 'KPI not found' });

    kpi.currentValue = currentValue;
    if (notes) kpi.notes = notes;

    // Auto-calculate status based on progress
    const pct = kpi.targetValue ? (currentValue / kpi.targetValue) * 100 : 0;
    if (pct === 0) kpi.status = 'Not Started';
    else if (pct >= 100) kpi.status = 'Completed';
    else if (pct >= 80) kpi.status = 'In Progress';
    else kpi.status = 'At Risk';

    await kpi.save();
    res.json(kpi);
  } catch (err) { res.status(400).json({ error: err.message }); }
};
