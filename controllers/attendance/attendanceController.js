const mongoose = require("mongoose");
const DailyAttendance = require("../../models/attendance/DailyAttendance");
const Labour = require("../../models/Labour");
const Employee = require("../../models/Employee");

const toObjectId = (id) => {
  try { return new mongoose.Types.ObjectId(id); } catch { return id; }
};

// Helper: get all Sunday date strings (YYYY-MM-DD) for a given month
const getSundaysOfMonth = (dateString) => {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = date.getMonth();
  const sundays = [];
  const d = new Date(year, month, 1);
  while (d.getMonth() === month) {
    if (d.getDay() === 0) {
      sundays.push(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
      );
    }
    d.setDate(d.getDate() + 1);
  }
  return sundays;
};

// GET /api/attendance/state?dateString=YYYY-MM-DD&personType=Labour|Employee&locationId=...
exports.getTakeAttendanceState = async (req, res) => {
  try {
    const organisationId = req.user.organisationId;
    const { dateString, personType, locationId } = req.query;

    if (!dateString || !personType) {
      return res.status(400).json({ message: "dateString and personType are required" });
    }

    // 1. Sundays of this month
    const sundays = getSundaysOfMonth(dateString);

    // 2. Existing attendance for this exact date
    const dailyRecords = await DailyAttendance.find({ organisationId, dateString, personType });
    const dailyRecordsMap = {};
    dailyRecords.forEach(rec => { dailyRecordsMap[rec.personId.toString()] = rec; });

    // 3. Sunday worked records for this month (Labour only)
    const sundayRecordsMap = {};
    if (personType === "Labour") {
      const sundayRecords = await DailyAttendance.find({
        organisationId,
        personType: "Labour",
        dateString: { $in: sundays },
        status: { $in: ["Sunday Present", "Sunday OT"] }
      });
      sundayRecords.forEach(rec => {
        const pId = rec.personId.toString();
        if (!sundayRecordsMap[pId]) sundayRecordsMap[pId] = [];
        sundayRecordsMap[pId].push(rec.dateString);
      });
    }

    // 4. Fetch persons — no active-status filter so ALL appear
    let persons = [];
    if (personType === "Labour") {
      const query = { organisationId };
      if (locationId && locationId !== "All") query["employment.locationId"] = toObjectId(locationId);
      const labours = await Labour.find(query);
      persons = labours.map(l => ({
        _id: l._id,
        name: `${l.personalInfo?.firstName || ""} ${l.personalInfo?.lastName || ""}`.trim() || "Unknown",
        climsId: l.employment?.climsId || "",
        formA:   l.employment?.formA   || "",
        employeeId: "",
        departmentName: l.employment?.departmentName || "",
        locationId: l.employment?.locationId || null,
        personType: "Labour"
      }));
    } else {
      const query = { organisationId };
      if (locationId && locationId !== "All") query["employment.workLocation"] = toObjectId(locationId);
      const employees = await Employee.find(query);
      persons = employees.map(e => ({
        _id: e._id,
        name: `${e.personalInfo?.firstName || ""} ${e.personalInfo?.lastName || ""}`.trim() || "Unknown",
        climsId:    "",
        formA:      "",
        employeeId: e.personalInfo?.employeeId || "",
        departmentName: e.employment?.departmentName || "",
        locationId: e.employment?.workLocation || null,
        personType: "Employee"
      }));
    }

    // 5. Merge with attendance
    const result = persons.map(p => {
      const pId = p._id.toString();
      const att = dailyRecordsMap[pId] || null;
      return {
        ...p,
        attendance: att ? { status: att.status, overtimeHours: att.overtimeHours } : null,
        sundaysWorked: sundayRecordsMap[pId] || []
      };
    });

    return res.json({ sundays, records: result });
  } catch (error) {
    console.error("getTakeAttendanceState error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// POST /api/attendance/submit
exports.submitAttendance = async (req, res) => {
  try {
    const organisationId = req.user.organisationId;
    const { dateString, personType, attendanceData } = req.body;

    if (!dateString || !personType || !Array.isArray(attendanceData)) {
      return res.status(400).json({ message: "Invalid parameters" });
    }

    const dateObj = new Date(dateString);
    const operations = [];

    for (const item of attendanceData) {
      const {
        personId, name, climsId, formA, employeeId,
        departmentName, locationId, status, overtimeHours, sundaysWorked
      } = item;

      // Convert personId to ObjectId for correct matching
      const personObjId = toObjectId(personId);

      // Main daily attendance record
      operations.push({
        updateOne: {
          filter: { organisationId, dateString, personId: personObjId },
          update: {
            $set: {
              date: dateObj,
              personType,
              name,
              climsId:  climsId  || "",
              formA:    formA    || "",
              employeeId: employeeId || "",
              departmentName: departmentName || "",
              locationId: locationId ? toObjectId(locationId) : null,
              status,
              overtimeHours: overtimeHours || 0
            }
          },
          upsert: true
        }
      });

      // Sunday worked records (Labour only)
      if (personType === "Labour" && Array.isArray(sundaysWorked)) {
        const sundays = getSundaysOfMonth(dateString);
        for (const sun of sundays) {
          const isChecked = sundaysWorked.includes(sun);
          if (isChecked) {
            operations.push({
              updateOne: {
                filter: { organisationId, dateString: sun, personId: personObjId },
                update: {
                  $set: {
                    date: new Date(sun),
                    personType: "Labour",
                    name,
                    climsId:  climsId  || "",
                    formA:    formA    || "",
                    employeeId: "",
                    departmentName: departmentName || "",
                    locationId: locationId ? toObjectId(locationId) : null,
                    status: "Sunday Present",
                    overtimeHours: 0
                  }
                },
                upsert: true
              }
            });
          } else {
            // Remove Sunday Present/OT if unchecked
            operations.push({
              deleteOne: {
                filter: {
                  organisationId,
                  dateString: sun,
                  personId: personObjId,
                  status: { $in: ["Sunday Present", "Sunday OT"] }
                }
              }
            });
          }
        }
      }
    }

    if (operations.length > 0) {
      await DailyAttendance.bulkWrite(operations);
    }

    return res.json({ message: "Attendance saved successfully" });
  } catch (error) {
    console.error("submitAttendance error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// GET /api/attendance/muster-roll?month=5&year=2026&locationId=...
exports.getMusterRoll = async (req, res) => {
  try {
    const organisationId = req.user.organisationId;
    const { month, year, locationId, personType = "All" } = req.query;

    if (month === undefined || year === undefined) {
      return res.status(400).json({ message: "month and year are required" });
    }

    const m = parseInt(month, 10);
    const y = parseInt(year, 10);

    // Build all dateStrings for the month
    const totalDays = new Date(y, m + 1, 0).getDate();
    const dateStrings = [];
    for (let d = 1; d <= totalDays; d++) {
      dateStrings.push(`${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
    }

    // Fetch attendance records using dateString range (avoids timezone issues)
    const firstDay = dateStrings[0];
    const lastDay  = dateStrings[dateStrings.length - 1];

    const attendanceRecords = await DailyAttendance.find({
      organisationId,
      dateString: { $gte: firstDay, $lte: lastDay }
    });

    // Build map: personId -> { dateString -> { status, overtimeHours } }
    const recordsMap = {};
    attendanceRecords.forEach(rec => {
      const pId = rec.personId.toString();
      if (!recordsMap[pId]) recordsMap[pId] = {};
      recordsMap[pId][rec.dateString] = { status: rec.status, overtimeHours: rec.overtimeHours };
    });

    const combinedList = [];

    const labourQuery = { organisationId };
    if (locationId && locationId !== "All") labourQuery["employment.locationId"] = toObjectId(locationId);
    const labours = await Labour.find(labourQuery);

    labours.forEach(l => {
      const pId = l._id.toString();
      const fName = l.personalInfo?.firstName || l.firstName || "";
      const lName = l.personalInfo?.lastName || l.lastName || "";
      const dept = l.employment?.departmentName || l.departmentName || "";
      combinedList.push({
        _id: l._id,
        name: `${fName} ${lName}`.trim() || "Unknown",
        climsId:    l.employment?.climsId || l.climsId || "",
        formA:      l.employment?.formA   || l.formA   || "",
        employeeId: "",
        departmentName: dept,
        personType: "Labour",
        attendance: recordsMap[pId] || {}
      });
    });

    return res.json({ records: combinedList });
  } catch (error) {
    console.error("getMusterRoll error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
