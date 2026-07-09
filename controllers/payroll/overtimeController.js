const Overtime = require("../../models/payrollModels/Overtime");

const MULTIPLIERS = { Weekday: 1.5, Weekend: 2, Holiday: 3 };

function computeOT(doc) {
  const otHours = Math.max(0, (doc.workedHours || 0) - (doc.shiftHours || 9));
  const multiplier = MULTIPLIERS[doc.dayType] || 1.5;
  const otAmount = Math.round((doc.hourlyRate || 0) * multiplier * otHours);
  return { otHours, multiplier, otAmount };
}

// ── GET all OT records ────────────────────────────────────────────────────────
exports.getOvertimes = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const filter = { organisationId: orgId };
    if (req.query.month) filter.month = Number(req.query.month);
    if (req.query.year)  filter.year  = Number(req.query.year);
    if (req.query.employeeId) filter.employeeId = req.query.employeeId;
    if (req.query.status && req.query.status !== "All") filter.status = req.query.status;

    const records = await Overtime.find(filter).sort({ date: -1 });
    res.json({ success: true, data: records });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST create OT ───────────────────────────────────────────────────────────
exports.createOvertime = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const body = { ...req.body, organisationId: orgId };
    const { otHours, multiplier, otAmount } = computeOT(body);
    body.otHours = otHours;
    body.multiplier = multiplier;
    body.otAmount = otAmount;

    const record = await Overtime.create(body);
    res.status(201).json({ success: true, data: record });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ── PUT update OT ─────────────────────────────────────────────────────────────
exports.updateOvertime = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const existing = await Overtime.findOne({ _id: req.params.id, organisationId: orgId });
    if (!existing) return res.status(404).json({ success: false, message: "OT record not found" });

    Object.assign(existing, req.body);
    const { otHours, multiplier, otAmount } = computeOT(existing);
    existing.otHours = otHours;
    existing.multiplier = multiplier;
    existing.otAmount = otAmount;
    await existing.save();

    res.json({ success: true, data: existing });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ── DELETE OT ─────────────────────────────────────────────────────────────────
exports.deleteOvertime = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const deleted = await Overtime.findOneAndDelete({ _id: req.params.id, organisationId: orgId });
    if (!deleted) return res.status(404).json({ success: false, message: "OT record not found" });
    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PATCH approve/reject OT ───────────────────────────────────────────────────
exports.approveOvertime = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const { status } = req.body; // "Approved" | "Rejected"
    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "Status must be Approved or Rejected" });
    }
    const record = await Overtime.findOneAndUpdate(
      { _id: req.params.id, organisationId: orgId },
      { status, approvedBy: req.user._id },
      { new: true }
    );
    if (!record) return res.status(404).json({ success: false, message: "OT record not found" });
    res.json({ success: true, data: record });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
