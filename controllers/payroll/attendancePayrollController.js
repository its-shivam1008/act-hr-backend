const AttendancePayroll = require("../../models/payrollModels/AttendancePayroll");
const Employee = require("../../models/Employee");
const Labour = require("../../models/Labour");
const DailyAttendance = require("../../models/attendance/DailyAttendance");
const { isMonthLocked } = require("./payrollLockController");

// Helper: compute paid days and LOP
function computePaidDays(doc) {
  const { present, halfDay, paidLeave, weekOff, holidays, arrears, leaveEncashment, totalDays, absent, unpaidLeave } = doc;
  const effectivePresent = (present || 0) + ((halfDay || 0) / 2) + (paidLeave || 0) + (weekOff || 0) + (holidays || 0) + (arrears || 0) + (leaveEncashment || 0);
  const lop = Math.max(0, totalDays - Math.round(effectivePresent));
  const paidDays = Math.min(totalDays, Math.round(effectivePresent));
  return { paidDays, lop };
}

// ── GET all records for a month/year ─────────────────────────────────────────
exports.getAttendancePayroll = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const { month, year, personType, page, limit } = req.query;
    const filter = { organisationId: orgId };
    if (month) filter.month = Number(month);
    if (year)  filter.year  = Number(year);
    if (personType) filter.personType = personType;

    if (page && limit) {
      const p = Number(page) || 1;
      const l = Number(limit) || 20;
      const total = await AttendancePayroll.countDocuments(filter);
      const records = await AttendancePayroll.find(filter)
        .sort({ employeeName: 1 })
        .skip((p - 1) * l)
        .limit(l);
      return res.json({ success: true, total, page: p, limit: l, data: records });
    }

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

    // Block if payroll month is locked
    const locked = await isMonthLocked(orgId, existing.month, existing.year);
    if (locked) return res.status(423).json({ success: false, message: "Payroll is locked for this period. Unlock first to make changes." });

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
    // Check lock before fetching for deletion
    const record = await AttendancePayroll.findOne({ _id: req.params.id, organisationId: orgId });
    if (record) {
      const locked = await isMonthLocked(orgId, record.month, record.year);
      if (locked) return res.status(423).json({ success: false, message: "Payroll is locked for this period. Unlock first." });
    }
    const deleted = await AttendancePayroll.findOneAndDelete({ _id: req.params.id, organisationId: orgId });
    if (!deleted) return res.status(404).json({ success: false, message: "Record not found" });
    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST bulk sync from employees/labours ─────────────────────────────────────────────
// Summarizes daily attendance records for the given month/year and populates inputs
exports.syncEmployees = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const { month, year, personType } = req.body;
    if (!month || !year) return res.status(422).json({ success: false, message: "month and year required" });

    const targetType = personType || "Employee";
    let people = [];
    if (targetType === "Labour") {
      people = await Labour.find({ organisationId: orgId, "employment.status": "Active" });
    } else {
      people = await Employee.find({ organisationId: orgId, "employment.status": "Active" });
    }

    const totalDays = new Date(year, month, 0).getDate(); // Days in month
    let created = 0, updated = 0, skipped = 0;

    for (const emp of people) {
      // Query daily attendance for this person for this month
      const prefix = `${year}-${String(month).padStart(2, "0")}-`;
      const dailyRecords = await DailyAttendance.find({
        organisationId: orgId,
        personId: emp._id,
        dateString: { $regex: new RegExp("^" + prefix) }
      });

      let present = 0, absent = 0, halfDay = 0, paidLeave = 0, unpaidLeave = 0, weekOff = 0, holidays = 0;
      dailyRecords.forEach(r => {
        const s = r.status;
        if (s === "Present" || s === "Sunday Present" || s === "Sunday OT") present++;
        else if (s === "Absent") absent++;
        else if (s === "Half Day") halfDay++;
        else if (s === "Paid Leave" || s === "Leave") paidLeave++;
        else if (s === "WO") weekOff++;
        else if (s === "HL") holidays++;
      });

      const empName = `${emp.personalInfo?.firstName || emp.firstName || ""} ${emp.personalInfo?.lastName || emp.lastName || ""}`.trim() || "Unnamed";
      const code = emp.personalInfo?.employeeId || emp.labourId || "";
      const dept = emp.employment?.departmentName || "";

      const exists = await AttendancePayroll.findOne({
        organisationId: orgId, employeeId: emp._id, month: Number(month), year: Number(year),
      });

      if (exists) {
        if (exists.status !== "Locked") {
          exists.employeeName = empName;
          exists.employeeCode = code;
          exists.department = dept;
          exists.present = present;
          exists.absent = absent;
          exists.halfDay = halfDay;
          exists.paidLeave = paidLeave;
          exists.unpaidLeave = unpaidLeave;
          exists.weekOff = weekOff;
          exists.holidays = holidays;
          exists.totalDays = totalDays;
          
          const { paidDays, lop } = computePaidDays(exists);
          exists.paidDays = paidDays;
          exists.lop = lop;
          exists.status = "Draft";
          await exists.save();
          updated++;
        } else {
          skipped++;
        }
        continue;
      }

      const docBody = {
        organisationId: orgId,
        employeeId:     emp._id,
        employeeName:   empName,
        employeeCode:   code,
        department:     dept,
        personType:     targetType,
        month:          Number(month),
        year:           Number(year),
        totalDays,
        present,
        absent,
        halfDay,
        paidLeave,
        unpaidLeave,
        weekOff,
        holidays,
        status:         "Draft"
      };

      const { paidDays, lop } = computePaidDays(docBody);
      docBody.paidDays = paidDays;
      docBody.lop = lop;

      await AttendancePayroll.create(docBody);
      created++;
    }
    res.json({ success: true, message: `${created} records created, ${updated} updated, ${skipped} skipped` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
