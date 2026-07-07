const PayrollLock = require("../../models/payrollModels/PayrollLock");

// ── GET all locks ─────────────────────────────────────────────────────────────
exports.getLocks = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const locks = await PayrollLock.find({ organisationId: orgId }).sort({ year: -1, month: -1 });
    res.json({ success: true, data: locks });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET lock status for a specific month ──────────────────────────────────────
exports.getLockStatus = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const { month, year } = req.query;
    const lock = await PayrollLock.findOne({ organisationId: orgId, month: Number(month), year: Number(year) });
    res.json({ success: true, locked: lock?.locked || false, data: lock });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST lock a month ─────────────────────────────────────────────────────────
exports.lockMonth = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const { month, year, note } = req.body;
    if (!month || !year) return res.status(422).json({ success: false, message: "month and year required" });

    const lock = await PayrollLock.findOneAndUpdate(
      { organisationId: orgId, month: Number(month), year: Number(year) },
      {
        locked: true,
        lockedBy: req.user._id,
        lockedAt: new Date(),
        unlockedBy: null,
        unlockedAt: null,
        note: note || "",
      },
      { upsert: true, new: true }
    );
    res.json({ success: true, message: `Payroll locked for ${month}/${year}`, data: lock });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST unlock a month ───────────────────────────────────────────────────────
exports.unlockMonth = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const { month, year } = req.body;
    if (!month || !year) return res.status(422).json({ success: false, message: "month and year required" });

    const lock = await PayrollLock.findOneAndUpdate(
      { organisationId: orgId, month: Number(month), year: Number(year) },
      { locked: false, unlockedBy: req.user._id, unlockedAt: new Date() },
      { new: true }
    );
    if (!lock) return res.status(404).json({ success: false, message: "Lock record not found" });
    res.json({ success: true, message: `Payroll unlocked for ${month}/${year}`, data: lock });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
