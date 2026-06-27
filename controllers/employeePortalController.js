const jwt      = require("jsonwebtoken");
const bcrypt   = require("bcryptjs");
const Employee = require("../models/Employee");

// ── POST /api/employee-portal/login ──────────────────────────────────────────
const employeeLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(422).json({ success: false, message: "Email and password are required" });

    const emp = await Employee.findOne({ "personalInfo.workEmail": email.toLowerCase().trim() }).select("+password");
    if (!emp)
      return res.status(401).json({ success: false, message: "Invalid email or password" });

    if (emp.employment?.status === "Terminated")
      return res.status(403).json({ success: false, message: "Your account has been deactivated. Contact HR." });

    // If no password set yet (old record), initialise from employeeId as bcrypt hash
    if (!emp.password) {
      emp.password = await bcrypt.hash(emp.personalInfo?.employeeId || "password123", 10);
      await emp.save({ validateBeforeSave: false });
    }

    const match = await emp.matchPassword(password);
    if (!match)
      return res.status(401).json({ success: false, message: "Invalid email or password" });

    const token = jwt.sign(
      { id: emp._id, type: "employee", organisationId: emp.organisationId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "30d" }
    );

    return res.json({
      success: true,
      type:    "employee",
      token,
      employee: {
        _id:         emp._id,
        employeeId:  emp.personalInfo?.employeeId,
        firstName:   emp.personalInfo?.firstName,
        lastName:    emp.personalInfo?.lastName,
        workEmail:   emp.personalInfo?.workEmail,
        department:  emp.employment?.departmentName,
        designation: emp.employment?.designationName,
        status:      emp.employment?.status,
        photoUrl:    emp.documents?.photoUrl,
        organisationId: emp.organisationId,
      },
    });
  } catch (err) {
    console.error("[EmployeeLogin]", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

const getMe = async (req, res) => {
  try {
    const emp = await Employee.findById(req.employee._id);
    if (!emp) return res.status(404).json({ success: false, message: "Employee not found" });
    return res.json({ success: true, employee: emp });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const getTransfers = async (req, res) => {
  try {
    const Transfer = require("../models/transferModels/Transfer");
    const transfers = await Transfer.find({
      employee: req.employee._id,
      organisationId: req.employee.organisationId
    }).sort({ effectiveDate: -1 });

    return res.json({ success: true, data: transfers });
  } catch (err) {
    console.error("[EmployeePortal GetTransfers]", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

const applyTransfer = async (req, res) => {
  try {
    const { type, proposedRef, effectiveDate, reason } = req.body;
    const emp = req.employee;
    const orgId = emp.organisationId;

    if (!type || !proposedRef || !effectiveDate) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const Department = require("../models/departmentModels/Department");
    const Location = require("../models/locationModels/Location");
    const Designation = require("../models/designationModels/Designation");
    const Grade = require("../models/gradeModels/Grade");
    const Transfer = require("../models/transferModels/Transfer");

    let currentValue = "";
    let currentRef = null;
    let proposedValue = "";

    if (type === "Department") {
      currentRef = emp.employment?.department || null;
      currentValue = emp.employment?.departmentName || "Unassigned";

      const proposedDept = await Department.findOne({ _id: proposedRef, organisationId: orgId });
      if (!proposedDept) return res.status(404).json({ success: false, message: "Proposed Department not found" });
      proposedValue = proposedDept.name;

    } else if (type === "Location") {
      currentRef = emp.employment?.workLocation || null;
      currentValue = emp.employment?.workLocationName || "Unassigned";

      const proposedLoc = await Location.findOne({ _id: proposedRef, organisationId: orgId });
      if (!proposedLoc) return res.status(404).json({ success: false, message: "Proposed Location not found" });
      proposedValue = proposedLoc.name;

    } else if (type === "Role") {
      currentRef = emp.employment?.designation || null;
      currentValue = emp.employment?.designationName || "Unassigned";

      const proposedDes = await Designation.findOne({ _id: proposedRef, organisationId: orgId });
      if (!proposedDes) return res.status(404).json({ success: false, message: "Proposed Designation not found" });
      proposedValue = proposedDes.name;

    } else if (type === "Grade") {
      currentRef = emp.employment?.grade || null;
      currentValue = emp.employment?.gradeName || "Unassigned";

      const proposedGrade = await Grade.findOne({ _id: proposedRef, organisationId: orgId });
      if (!proposedGrade) return res.status(404).json({ success: false, message: "Proposed Grade not found" });
      proposedValue = proposedGrade.name;
    } else {
      return res.status(400).json({ success: false, message: "Invalid transfer type" });
    }

    const name = `${emp.personalInfo?.firstName || ""} ${emp.personalInfo?.lastName || ""}`.trim();
    const idCode = emp.personalInfo?.employeeId || "";

    const transfer = new Transfer({
      organisationId: orgId,
      employee: emp._id,
      employeeName: name,
      employeeIdCode: idCode,
      type,
      currentValue,
      proposedValue,
      currentRef,
      proposedRef,
      effectiveDate,
      reason,
      status: "Pending",
      initiator: name
    });

    await transfer.save();
    return res.status(201).json({ success: true, data: transfer });
  } catch (error) {
    console.error("[EmployeePortal ApplyTransfer]", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getEmployeeMasterData = async (req, res) => {
  try {
    const orgId = req.employee.organisationId;
    const Department = require("../models/departmentModels/Department");
    const Location = require("../models/locationModels/Location");
    const Designation = require("../models/designationModels/Designation");
    const Grade = require("../models/gradeModels/Grade");

    const [departments, locations, designations, grades] = await Promise.all([
      Department.find({ organisationId: orgId, isActive: true }).sort({ name: 1 }),
      Location.find({ organisationId: orgId, isActive: true }).sort({ name: 1 }),
      Designation.find({ organisationId: orgId, isActive: true }).sort({ name: 1 }),
      Grade.find({ organisationId: orgId, isActive: true }).sort({ name: 1 }),
    ]);

    return res.json({
      success: true,
      departments,
      locations,
      designations,
      grades
    });
  } catch (error) {
    console.error("[EmployeePortal getEmployeeMasterData]", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const applyRegularization = async (req, res) => {
  try {
    const { date, requestedIn, requestedOut, reason, remarks } = req.body;
    const emp = req.employee;
    const orgId = emp.organisationId;

    if (!date || !requestedIn || !requestedOut || !reason) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const DailyAttendance = require("../models/attendance/DailyAttendance");
    const Regularization = require("../models/attendance/Regularization");

    const dateObj = new Date(date);
    const dateString = dateObj.toISOString().split("T")[0];

    const existingAttendance = await DailyAttendance.findOne({
      organisationId: orgId,
      personId: emp._id,
      dateString
    });

    const checkIn = existingAttendance && existingAttendance.status !== "Absent" ? "09:00 AM" : "-";
    const checkOut = existingAttendance && existingAttendance.status !== "Absent" ? "06:00 PM" : "-";

    const name = `${emp.personalInfo?.firstName || ""} ${emp.personalInfo?.lastName || ""}`.trim();
    const idCode = emp.personalInfo?.employeeId || "";
    const departmentName = emp.employment?.departmentName || "";

    const regularization = new Regularization({
      organisationId: orgId,
      employee: emp._id,
      employeeName: name,
      employeeIdCode: idCode,
      departmentName,
      date: dateObj,
      dateString,
      checkIn,
      checkOut,
      requestedIn,
      requestedOut,
      reason,
      remarks: remarks || "",
      status: "Pending"
    });

    await regularization.save();
    return res.status(201).json({ success: true, data: regularization });
  } catch (error) {
    console.error("[EmployeePortal ApplyRegularization]", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getEmployeeRegularizations = async (req, res) => {
  try {
    const Regularization = require("../models/attendance/Regularization");
    const list = await Regularization.find({
      employee: req.employee._id,
      organisationId: req.employee.organisationId
    }).sort({ date: -1 });

    return res.json({ success: true, data: list });
  } catch (err) {
    console.error("[EmployeePortal GetRegularizations]", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  employeeLogin,
  getMe,
  getTransfers,
  applyTransfer,
  getEmployeeMasterData,
  applyRegularization,
  getEmployeeRegularizations
};
