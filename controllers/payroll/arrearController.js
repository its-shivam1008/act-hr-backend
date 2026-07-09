const Arrear = require("../../models/payrollModels/Arrear");

// ── GET arrears ───────────────────────────────────────────────────────────────
exports.getArrears = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const filter = { organisationId: orgId };
    if (req.query.status && req.query.status !== "All") filter.status = req.query.status;
    if (req.query.employeeId) filter.employeeId = req.query.employeeId;

    const arrears = await Arrear.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: arrears });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST create arrear ────────────────────────────────────────────────────────
exports.createArrear = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const body = { ...req.body, organisationId: orgId };
    // Auto-compute arrear amount
    body.arrearAmount = (body.revisedAmount || 0) - (body.originalAmount || 0);
    if (body.arrearAmount <= 0) {
      return res.status(400).json({ success: false, message: "Revised amount must be greater than original" });
    }
    const arrear = await Arrear.create(body);
    res.status(201).json({ success: true, data: arrear });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ── PUT update arrear ─────────────────────────────────────────────────────────
exports.updateArrear = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const body = { ...req.body };
    if (body.revisedAmount && body.originalAmount) {
      body.arrearAmount = body.revisedAmount - body.originalAmount;
    }
    const arrear = await Arrear.findOneAndUpdate(
      { _id: req.params.id, organisationId: orgId },
      body,
      { new: true, runValidators: true }
    );
    if (!arrear) return res.status(404).json({ success: false, message: "Arrear not found" });
    res.json({ success: true, data: arrear });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ── DELETE arrear ─────────────────────────────────────────────────────────────
exports.deleteArrear = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const deleted = await Arrear.findOneAndDelete({ _id: req.params.id, organisationId: orgId });
    if (!deleted) return res.status(404).json({ success: false, message: "Arrear not found" });
    res.json({ success: true, message: "Arrear deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
