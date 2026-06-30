const Roster = require("../../models/attendance/Roster");
const Employee = require("../../models/Employee");
const Shift = require("../../models/attendance/Shift");
const LeaveApplication = require("../../models/leaveModels/LeaveApplication");
const Holiday = require("../../models/attendance/Holiday");

// GET /api/attendance/rosters
const getRosters = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const { year, month, location, department, search, page, limit } = req.query;

    if (!year || !month) {
      return res.status(400).json({ success: false, message: "Year and month are required" });
    }

    const y = Number(year);
    const m = Number(month);

    // 1. Query employees
    const empQuery = { organisationId: orgId, "employment.status": "Active" };
    if (location) empQuery["employment.workLocation"] = location;
    if (department) empQuery["employment.department"] = department;
    if (search) {
      empQuery.$or = [
        { "personalInfo.firstName": { $regex: search, $options: "i" } },
        { "personalInfo.lastName": { $regex: search, $options: "i" } },
        { "personalInfo.employeeId": { $regex: search, $options: "i" } },
      ];
    }

    // Pagination
    const p = Math.max(1, parseInt(page) || 1);
    const l = Math.max(1, parseInt(limit) || 100);
    const skip = (p - 1) * l;

    const total = await Employee.countDocuments(empQuery);
    const employees = await Employee.find(empQuery)
      .sort({ "personalInfo.employeeId": 1 })
      .skip(skip)
      .limit(l)
      .lean();

    // 2. Query rosters for this month/year
    const rosters = await Roster.find({ organisationId: orgId, year: y, month: m }).lean();
    const rosterMap = new Map();
    for (const r of rosters) {
      rosterMap.set(String(r.employee), r);
    }

    // 3. Map to result
    const daysInMonth = new Date(y, m + 1, 0).getDate();

    const data = employees.map(emp => {
      const existing = rosterMap.get(String(emp._id));
      const empName = `${emp.personalInfo?.firstName || ""} ${emp.personalInfo?.lastName || ""}`.trim() || emp.personalInfo?.employeeId || "Unnamed Employee";

      if (existing) {
        // Ensure all days (1 to daysInMonth) exist in the days array
        const dayMap = new Map(existing.days.map(d => [d.day, d]));
        const filledDays = Array.from({ length: daysInMonth }, (_, i) => {
          const dNum = i + 1;
          const dayData = dayMap.get(dNum);
          if (dayData) {
            return {
              day: dNum,
              shift: dayData.shift,
              shiftCode: dayData.shiftCode
            };
          } else {
            // Default check weekend
            const dateObj = new Date(y, m, dNum);
            const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
            return {
              day: dNum,
              shift: null,
              shiftCode: isWeekend ? "WO" : "GS"
            };
          }
        });

        return {
          employee: emp._id,
          employeeId: emp.personalInfo?.employeeId,
          employeeName: empName,
          rosterId: existing._id,
          days: filledDays
        };
      } else {
        // Generate default calendar days
        const defaultDays = Array.from({ length: daysInMonth }, (_, i) => {
          const dNum = i + 1;
          const dateObj = new Date(y, m, dNum);
          const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
          return {
            day: dNum,
            shift: null,
            shiftCode: isWeekend ? "WO" : "GS"
          };
        });

        return {
          employee: emp._id,
          employeeId: emp.personalInfo?.employeeId,
          employeeName: empName,
          rosterId: null,
          days: defaultDays
        };
      }
    });

    res.json({
      success: true,
      data,
      pagination: {
        total,
        page: p,
        limit: l,
        pages: Math.ceil(total / l)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/attendance/rosters/save
const saveRoster = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const { year, month, rosterData } = req.body;

    if (!year || !month || !Array.isArray(rosterData)) {
      return res.status(400).json({ success: false, message: "Year, month, and rosterData are required" });
    }

    const y = Number(year);
    const m = Number(month);

    // 1. Fetch all shifts to check status and timings
    const shifts = await Shift.find({ organisationId: orgId }).lean();
    const shiftMap = new Map(shifts.map(s => [s.code, s]));

    // 2. Fetch all approved leaves for the employees in this month
    const empIds = rosterData.map(r => r.employee);
    const startDate = new Date(y, m, 1);
    const endDate = new Date(y, m + 1, 0, 23, 59, 59);

    const approvedLeaves = await LeaveApplication.find({
      employeeId: { $in: empIds },
      status: "Approved",
      $or: [
        { startDate: { $gte: startDate, $lte: endDate } },
        { endDate: { $gte: startDate, $lte: endDate } },
        { startDate: { $lte: startDate }, endDate: { $gte: endDate } }
      ]
    }).lean();

    // 3. Fetch all holidays for this month
    const holidays = await Holiday.find({
      organisationId: orgId,
      date: { $gte: startDate, $lte: endDate }
    }).lean();

    const holidayDays = new Set(holidays.map(h => new Date(h.date).getDate()));

    // 4. Validate each employee's roster
    for (const item of rosterData) {
      const empId = item.employee;
      const empName = item.employeeName;
      const empLeaves = approvedLeaves.filter(l => String(l.employeeId) === String(empId));

      for (let i = 0; i < item.days.length; i++) {
        const d = item.days[i];
        const dayNum = Number(d.day);
        const shiftCode = d.shiftCode;

        // Skip validation for simple off types (WO)
        if (shiftCode === "WO") continue;

        // A. Cannot assign inactive shift
        if (shiftCode !== "L") {
          const shiftDoc = shiftMap.get(shiftCode);
          if (!shiftDoc) {
            return res.status(400).json({
              success: false,
              message: `Invalid shift code '${shiftCode}' assigned to ${empName} on day ${dayNum}.`
            });
          }
          if (shiftDoc.status === "Inactive") {
            return res.status(400).json({
              success: false,
              message: `Cannot assign inactive shift '${shiftDoc.name}' (${shiftCode}) to ${empName} on day ${dayNum}.`
            });
          }
        }

        // B. Cannot assign shift on approved leave
        const currentDate = new Date(y, m, dayNum);
        const isOnLeave = empLeaves.some(l => {
          const start = new Date(l.startDate);
          const end = new Date(l.endDate);
          start.setHours(0,0,0,0);
          end.setHours(23,59,59,999);
          return currentDate >= start && currentDate <= end;
        });

        if (isOnLeave && shiftCode !== "L") {
          return res.status(400).json({
            success: false,
            message: `Cannot assign shift '${shiftCode}' to ${empName} on day ${dayNum} because they have an approved leave on this date.`
          });
        }

        // C. Validate holiday rules
        const isHoliday = holidayDays.has(dayNum);
        if (isHoliday && shiftCode !== "L" && shiftCode !== "WO") {
          const holidayObj = holidays.find(h => new Date(h.date).getDate() === dayNum);
          if (holidayObj && holidayObj.type === "National") {
            return res.status(400).json({
              success: false,
              message: `Cannot assign standard shift '${shiftCode}' to ${empName} on day ${dayNum} because it is a National Holiday (${holidayObj.name}).`
            });
          }
        }

        // D. Validate night shift rules (rest period validation)
        // If this shift is a night shift (isNightShift = true), check the next day's shift.
        const currentShiftDoc = shiftMap.get(shiftCode);
        if (currentShiftDoc && currentShiftDoc.isNightShift) {
          const nextDayData = item.days.find(nd => Number(nd.day) === dayNum + 1);
          if (nextDayData) {
            const nextShiftCode = nextDayData.shiftCode;
            if (nextShiftCode !== "WO" && nextShiftCode !== "L") {
              const nextShiftDoc = shiftMap.get(nextShiftCode);
              if (nextShiftDoc) {
                const [nextStartHour] = nextShiftDoc.startTime.split(":").map(Number);
                if (nextStartHour < 12) {
                  return res.status(400).json({
                    success: false,
                    message: `Night shift rule violation: ${empName} cannot work morning shift '${nextShiftCode}' on day ${dayNum + 1} immediately following a night shift on day ${dayNum}.`
                  });
                }
              }
            }
          }
        }
      }
    }

    // 5. Save the roster
    const ops = rosterData.map(item => {
      const filter = { organisationId: orgId, employee: item.employee, year: y, month: m };
      const update = {
        $set: {
          employeeName: item.employeeName,
          days: item.days.map(d => ({
            day: Number(d.day),
            shift: d.shift || null,
            shiftCode: d.shiftCode || "WO"
          }))
        }
      };
      return {
        updateOne: {
          filter,
          update,
          upsert: true
        }
      };
    });

    if (ops.length > 0) {
      await Roster.bulkWrite(ops);
    }

    res.json({ success: true, message: "Roster saved successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getRosters,
  saveRoster,
};
