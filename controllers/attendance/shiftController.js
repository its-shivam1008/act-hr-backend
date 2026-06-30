const Shift = require("../../models/attendance/Shift");
const Department = require("../../models/departmentModels/Department");
const Location = require("../../models/locationModels/Location");
const Employee = require("../../models/Employee");
const Roster = require("../../models/attendance/Roster");

// Helper to calculate working hours automatically
function calculateWorkingHours(startTime, endTime, breakDuration, isNightShift) {
  if (!startTime || !endTime) return 0;
  const [h1, m1] = startTime.split(':').map(Number);
  const [h2, m2] = endTime.split(':').map(Number);
  let diff = (h2 + m2 / 60) - (h1 + m1 / 60);
  if (isNightShift || diff < 0) diff += 24;
  const workingHours = diff - (Number(breakDuration) || 0) / 60;
  return Number(Math.max(0, workingHours).toFixed(2));
}

// Helper to resolve department and location names
async function resolveNames(body) {
  const extra = {};
  if (body.location) {
    const loc = await Location.findById(body.location).select("name").lean();
    extra.locationName = loc ? loc.name : "";
  } else if (body.location === null || body.location === "") {
    extra.locationName = "";
  }
  if (body.department) {
    const dept = await Department.findById(body.department).select("name").lean();
    extra.departmentName = dept ? dept.name : "";
  } else if (body.department === null || body.department === "") {
    extra.departmentName = "";
  }
  return extra;
}

// GET /api/attendance/shifts
const getShifts = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const { search, location, department, status, page, limit, sortBy, sortOrder } = req.query;

    const query = { organisationId: orgId };
    if (status) query.status = status;
    if (location) query.location = location;
    if (department) query.department = department;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
      ];
    }

    // Pagination
    const p = Math.max(1, parseInt(page) || 1);
    const l = Math.max(1, parseInt(limit) || 100);
    const skip = (p - 1) * l;

    // Sorting
    const sort = {};
    if (sortBy) {
      sort[sortBy] = sortOrder === "desc" ? -1 : 1;
    } else {
      sort["createdAt"] = -1;
    }

    const total = await Shift.countDocuments(query);
    const data = await Shift.find(query)
      .sort(sort)
      .skip(skip)
      .limit(l)
      .lean();

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

// GET /api/attendance/shifts/:id
const getShift = async (req, res) => {
  try {
    const doc = await Shift.findOne({ _id: req.params.id, organisationId: req.user.organisationId }).lean();
    if (!doc) return res.status(404).json({ success: false, message: "Shift not found" });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/attendance/shifts
const createShift = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const body = { ...req.body, organisationId: orgId };

    // Auto-calculate working hours
    body.minWorkingHours = calculateWorkingHours(
      body.startTime,
      body.endTime,
      body.breakDuration,
      body.isNightShift
    );

    // Resolve names
    const extraNames = await resolveNames(body);
    const doc = await Shift.create({ ...body, ...extraNames });

    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: "A shift with this code already exists" });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/attendance/shifts/:id
const updateShift = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const body = req.body;

    // Auto-calculate working hours
    body.minWorkingHours = calculateWorkingHours(
      body.startTime,
      body.endTime,
      body.breakDuration,
      body.isNightShift
    );

    // Resolve names
    const extraNames = await resolveNames(body);
    const doc = await Shift.findOneAndUpdate(
      { _id: req.params.id, organisationId: orgId },
      { ...body, ...extraNames },
      { new: true, runValidators: true }
    );

    if (!doc) return res.status(404).json({ success: false, message: "Shift not found" });
    res.json({ success: true, data: doc });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: "A shift with this code already exists" });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/attendance/shifts/:id
const deleteShift = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const shift = await Shift.findOne({ _id: req.params.id, organisationId: orgId });
    if (!shift) return res.status(404).json({ success: false, message: "Shift not found" });

    // 1. Prevent deleting shifts assigned to employees
    const assignedEmployee = await Employee.findOne({
      organisationId: orgId,
      $or: [
        { "employment.defaultShift": req.params.id },
        { "employment.defaultShiftCode": shift.code }
      ]
    });
    if (assignedEmployee) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete shift: it is assigned to employee ${assignedEmployee.personalInfo?.firstName || ""} as their default shift.`
      });
    }

    // 2. Prevent deleting shifts assigned to rosters
    const assignedRoster = await Roster.findOne({
      organisationId: orgId,
      $or: [
        { "days.shift": req.params.id },
        { "days.shiftCode": shift.code }
      ]
    });
    if (assignedRoster) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete shift: it is currently scheduled in rosters (assigned to ${assignedRoster.employeeName || "employees"}).`
      });
    }

    await Shift.deleteOne({ _id: req.params.id });
    res.json({ success: true, message: "Shift deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getShifts,
  getShift,
  createShift,
  updateShift,
  deleteShift,
};
