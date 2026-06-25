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

module.exports = { employeeLogin, getMe, getTransfers };
