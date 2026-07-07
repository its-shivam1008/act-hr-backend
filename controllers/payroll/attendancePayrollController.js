const AttendancePayroll = require("../../models/payrollModels/AttendancePayroll");
const Employee = require("../../models/Employee");

// Helper: compute paid days and LOP
function computePaidDays(doc) {
  const { present, halfDay, paidLeave, weekOff, holidays, arrears, leaveEncashment, totalDays, absent, unpaidLeave } = doc;
  const effectivePresent = present + (halfDay / 2) + paidLeave + weekOff + holidays + arrears + leaveEncashment;
  const lop = Math.max(0, totalDays - Math.round(effectivePresent));
  const paidDays = Math.min(totalDays, Math.round(effectivePresent));
  return { paidDays, lop };
}

// ── GET all records for a month/year ─────────────────────────────────────────
exports.getAttendancePayroll = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const { month, year } = req.query;
    const filter = { organisationId: orgId };
    if (month) filter.month = Number(month);
    if (year)  filter.year  = Number(year);

    const records = await AttendancePayroll.find(filter).sort({ employeeName: 1 });
    res.json({ success: true, data: records });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST create attendance payroll record ─────────────────────────────────────
exports.createAttendancePayroll = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const body = { ...req.body, organisationId: orgId };
    const { paidDays, lop } = computePaidDays(body);
    body.paidDays = paidDays;
    body.lop = lop;

    const record = await AttendancePayroll.create(body);
    res.status(201).json({ success: true, data: record });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: "Record already exists for this employee/month/year" });
    }
    res.status(400).json({ success: false, message: err.message });
  }
};

// ── PUT update a record ───────────────────────────────────────────────────────
exports.updateAttendancePayroll = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const existing = await AttendancePayroll.findOne({ _id: req.params.id, organisationId: orgId });
    if (!existing) return res.status(404).json({ success: false, message: "Record not found" });

    Object.assign(existing, req.body);
    const { paidDays, lop } = computePaidDays(existing);
    existing.paidDays = paidDays;
    existing.lop = lop;
    existing.status = "Modified";
    await existing.save();

    res.json({ success: true, data: existing });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ── DELETE a record ───────────────────────────────────────────────────────────
exports.deleteAttendancePayroll = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const deleted = await AttendancePayroll.findOneAndDelete({ _id: req.params.id, organisationId: orgId });
    if (!deleted) return res.status(404).json({ success: false, message: "Record not found" });
    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST bulk sync from employees ─────────────────────────────────────────────
// Creates skeleton records for all active employees for the given month/year
exports.syncEmployees = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const { month, year } = req.body;
    if (!month || !year) return res.status(422).json({ success: false, message: "month and year required" });

    const employees = await Employee.find({ organisationId: orgId, "employment.status": "Active" });

    const totalDays = new Date(year, month, 0).getDate(); // Days in month
    let created = 0, skipped = 0;

    for (const emp of employees) {
      const exists = await AttendancePayroll.findOne({
        organisationId: orgId, employeeId: emp._id, month: Number(month), year: Number(year),
      });
      if (exists) { skipped++; continue; }

      const empName = `${emp.personalInfo?.firstName || ""} ${emp.personalInfo?.lastName || ""}`.trim() || "Employee";

      await AttendancePayroll.create({
        organisationId: orgId,
        employeeId:     emp._id,
        employeeName:   empName,
        employeeCode:   emp.personalInfo?.employeeId || "",
        department:     emp.employment?.departmentName || "",
        month:          Number(month),
        year:           Number(year),
        totalDays,
        status:         "Draft",
      });
      created++;
    }
    res.json({ success: true, message: `${created} records created, ${skipped} skipped` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
