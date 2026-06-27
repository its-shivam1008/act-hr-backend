const Adjustment = require("../../models/payrollModels/Adjustment");

// Get all adjustments
const getAdjustments = async (req, res) => {
  try {
    const { organisationId, isRecurring, status, employeeId } = req.query;
    const query = {};
    if (organisationId) query.organisationId = organisationId;
    if (status)         query.status = status;
    if (employeeId)     query.employee = employeeId;
    if (isRecurring !== undefined) query.isRecurring = isRecurring === "true";

    const adjustments = await Adjustment.find(query)
      .populate("employee", "name employeeId")
      .sort({ createdAt: -1 });
    res.json(adjustments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Create adjustment
const createAdjustment = async (req, res) => {
  try {
    const adjustment = new Adjustment(req.body);
    const saved = await adjustment.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Update adjustment (e.g., stop recurring)
const updateAdjustment = async (req, res) => {
  try {
    const updated = await Adjustment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Stop a recurring adjustment
const stopAdjustment = async (req, res) => {
  try {
    const adjustment = await Adjustment.findById(req.params.id);
    if (!adjustment) return res.status(404).json({ message: "Not found" });
    adjustment.status   = "Stopped";
    adjustment.endMonth = req.body.endMonth || null;
    await adjustment.save();
    res.json(adjustment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete adjustment
const deleteAdjustment = async (req, res) => {
  try {
    const deleted = await Adjustment.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getAdjustments, createAdjustment, updateAdjustment, stopAdjustment, deleteAdjustment };
