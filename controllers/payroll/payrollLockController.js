const PayrollLock = require("../../models/payrollModels/PayrollLock");
const AttendancePayroll = require("../../models/payrollModels/AttendancePayroll");
const PayrollRun = require("../../models/payrollModels/PayrollRun");

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

// ── POST lock a month (supports optional locationIds array) ───────────────────
exports.lockMonth = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const { month, year, note, locationIds } = req.body;
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
        locationIds: locationIds || [],
      },
      { upsert: true, new: true }
    );

    // Also lock AttendancePayroll records for the month so they cannot be updated
    await AttendancePayroll.updateMany(
      { organisationId: orgId, month: Number(month), year: Number(year) },
      { status: "Locked" }
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
      { locked: false, unlockedBy: req.user._id, unlockedAt: new Date(), locationIds: [] },
      { new: true }
    );
    if (!lock) return res.status(404).json({ success: false, message: "Lock record not found" });

    // Revert locked attendance records to Modified so they can be edited again
    await AttendancePayroll.updateMany(
      { organisationId: orgId, month: Number(month), year: Number(year), status: "Locked" },
      { status: "Modified" }
    );

    res.json({ success: true, message: `Payroll unlocked for ${month}/${year}`, data: lock });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Helper: check if month is locked (for use in other controllers) ───────────
exports.isMonthLocked = async (organisationId, month, year) => {
  const lock = await PayrollLock.findOne({ organisationId, month: Number(month), year: Number(year) });
  return lock?.locked || false;
};
