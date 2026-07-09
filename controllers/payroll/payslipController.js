const PayrollRun = require("../../models/payrollModels/PayrollRun");

// ── GET payslip for an employee for a month ───────────────────────────────────
exports.getPayslip = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const { employeeId, month, year } = req.params;

    const run = await PayrollRun.findOne({
      organisationId: orgId,
      employeeId,
      month: Number(month),
      year:  Number(year),
    });
    if (!run) return res.status(404).json({ success: false, message: "Payslip not found for this employee/month" });

    res.json({ success: true, data: run });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET all payslips for a month (for reports) ────────────────────────────────
exports.getMonthlyPayslips = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const { month, year } = req.query;
    const filter = { organisationId: orgId };
    if (month) filter.month = Number(month);
    if (year)  filter.year  = Number(year);

    const runs = await PayrollRun.find(filter).sort({ employeeName: 1 });
    res.json({ success: true, data: runs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PATCH mark payslip as paid ─────────────────────────────────────────────────
exports.markPaid = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const run = await PayrollRun.findOneAndUpdate(
      { _id: req.params.id, organisationId: orgId },
      { status: "Paid" },
      { new: true }
    );
    if (!run) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: run });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET payroll report data ───────────────────────────────────────────────────
exports.getPayrollReport = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const { month, year, department } = req.query;
    const filter = { organisationId: orgId };
    if (month) filter.month = Number(month);
    if (year)  filter.year  = Number(year);
    if (department) filter.department = department;

    const runs = await PayrollRun.find(filter).sort({ department: 1, employeeName: 1 });

    const summary = {
      totalEmployees: runs.length,
      totalGross:     runs.reduce((s, r) => s + r.gross, 0),
      totalNet:       runs.reduce((s, r) => s + r.netSalary, 0),
      totalPF:        runs.reduce((s, r) => s + r.pf, 0),
      totalESI:       runs.reduce((s, r) => s + r.esi, 0),
      totalPT:        runs.reduce((s, r) => s + r.pt, 0),
      totalTDS:       runs.reduce((s, r) => s + r.tds, 0),
      totalLOP:       runs.reduce((s, r) => s + r.lopDeduction, 0),
      totalBonus:     runs.reduce((s, r) => s + r.bonus, 0),
      totalOT:        runs.reduce((s, r) => s + r.otAmount, 0),
    };

    res.json({ success: true, data: runs, summary });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
