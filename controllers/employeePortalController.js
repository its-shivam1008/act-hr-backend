const jwt      = require("jsonwebtoken");
const bcrypt   = require("bcryptjs");
const Employee = require("../models/Employee");

// ── POST /api/employee-portal/login ──────────────────────────────────────────
const employeeLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(422).json({ success: false, message: "Email and password are required" });

    const emp = await Employee.findOne({ workEmail: email.toLowerCase().trim() }).select("+password");
    if (!emp)
      return res.status(401).json({ success: false, message: "Invalid email or password" });

    if (emp.status === "Terminated")
      return res.status(403).json({ success: false, message: "Your account has been deactivated. Contact HR." });

    // If no password set yet (old record), initialise from employeeId as bcrypt hash
    if (!emp.password) {
      emp.password = await bcrypt.hash(emp.employeeId, 10);
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
        employeeId:  emp.employeeId,
        firstName:   emp.firstName,
        lastName:    emp.lastName,
        workEmail:   emp.workEmail,
        department:  emp.department,
        designation: emp.designation,
        status:      emp.status,
        photoUrl:    emp.photoUrl,
        organisationId: emp.organisationId,
      },
    });
  } catch (err) {
    console.error("[EmployeeLogin]", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/employee-portal/me ───────────────────────────────────────────────
const getMe = async (req, res) => {
  try {
    const emp = await Employee.findById(req.employee._id);
    if (!emp) return res.status(404).json({ success: false, message: "Employee not found" });
    return res.json({ success: true, employee: emp });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { employeeLogin, getMe };
