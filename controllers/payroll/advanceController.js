const SalaryAdvance = require("../../models/payrollModels/SalaryAdvance");

// Get all advances (with optional filters)
const getAdvances = async (req, res) => {
  try {
    const { organisationId, status, employeeId } = req.query;
    const query = {};
    if (organisationId) query.organisationId = organisationId;
    if (status)         query.status = status;
    if (employeeId)     query.employee = employeeId;

    const advances = await SalaryAdvance.find(query)
      .populate("employee", "name employeeId")
      .sort({ createdAt: -1 });
    res.json(advances);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Create advance request
const createAdvance = async (req, res) => {
  try {
    const advance = new SalaryAdvance({ ...req.body, status: "Pending Approval" });
    const saved = await advance.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Approve advance
const approveAdvance = async (req, res) => {
  try {
    const { remarks } = req.body;
    const advance = await SalaryAdvance.findById(req.params.id);
    if (!advance) return res.status(404).json({ message: "Not found" });

    advance.status     = "Active";
    advance.approvedBy = req.user?._id || null;
    advance.approvedAt = new Date();
    advance.remarks    = remarks || "";
    await advance.save();
    res.json(advance);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Reject advance
const rejectAdvance = async (req, res) => {
  try {
    const { remarks } = req.body;
    const advance = await SalaryAdvance.findById(req.params.id);
    if (!advance) return res.status(404).json({ message: "Not found" });

    advance.status  = "Rejected";
    advance.remarks = remarks || "";
    await advance.save();
    res.json(advance);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Mark as recovered
const recoverAdvance = async (req, res) => {
  try {
    const advance = await SalaryAdvance.findById(req.params.id);
    if (!advance) return res.status(404).json({ message: "Not found" });

    advance.status = "Recovered";
    await advance.save();
    res.json(advance);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getAdvances, createAdvance, approveAdvance, rejectAdvance, recoverAdvance };
