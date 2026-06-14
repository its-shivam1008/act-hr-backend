const Employee = require("../models/Employee");
const { EmployeeFormConfig } = require("../models/EmployeeFormConfig");

// ── GET /api/employees ─────────────────────────────────────────────────────
const getEmployees = async (req, res) => {
  try {
    const { search, department, status, page = 1, limit = 20 } = req.query;
    const orgId = req.user.organisationId;

    const query = { organisationId: orgId };

    if (department && department !== "All") query.department = department;
    if (status && status !== "All")         query.status     = status;
    if (search) {
      const s = new RegExp(search, "i");
      query.$or = [
        { firstName: s }, { lastName: s },
        { workEmail: s }, { employeeId: s },
        { department: s }, { designation: s },
      ];
    }

    const total = await Employee.countDocuments(query);
    const employees = await Employee.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * Number(limit))
      .limit(Number(limit))
      .populate("reportingManager", "firstName lastName employeeId");

    return res.json({ success: true, total, page: Number(page), employees });
  } catch (err) {
    console.error("[GetEmployees]", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/employees/:id ─────────────────────────────────────────────────
const getEmployee = async (req, res) => {
  try {
    const emp = await Employee.findOne({ _id: req.params.id, organisationId: req.user.organisationId })
      .populate("reportingManager", "firstName lastName employeeId");
    if (!emp) return res.status(404).json({ success: false, message: "Employee not found" });
    return res.json({ success: true, employee: emp });
  } catch (err) {
    console.error("[GetEmployee]", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/employees ────────────────────────────────────────────────────
const createEmployee = async (req, res) => {
  try {
    const orgId = req.user.organisationId;

    // Validate required fields from form config
    const config = await EmployeeFormConfig.findOne({ organisationId: orgId });
    if (config) {
      const requiredFields = config.fields.filter(f => f.visible && f.required).map(f => f.fieldKey);
      const missing = requiredFields.filter(k => !req.body[k] && req.body[k] !== 0);
      if (missing.length > 0) {
        return res.status(422).json({
          success: false,
          message: `Missing required fields: ${missing.join(", ")}`,
          missing,
        });
      }
    }

    const employee = await Employee.create({
      ...req.body,
      organisationId: orgId,
      createdBy: req.user._id,
    });

    return res.status(201).json({ success: true, employee });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: "Duplicate value (employeeId or email already exists)" });
    }
    console.error("[CreateEmployee]", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── PUT /api/employees/:id ─────────────────────────────────────────────────
const updateEmployee = async (req, res) => {
  try {
    const { employeeId: newEmployeeId, ...otherFields } = req.body;

    // Find existing employee first to detect employeeId change
    const existing = await Employee.findOne({
      _id: req.params.id,
      organisationId: req.user.organisationId,
    }).select("+password");
    if (!existing) return res.status(404).json({ success: false, message: "Employee not found" });

    // If employeeId is being changed, reset password to the new employeeId
    const updateData = { ...otherFields };
    if (newEmployeeId !== undefined) {
      updateData.employeeId = newEmployeeId;
      if (newEmployeeId && newEmployeeId !== existing.employeeId) {
        // Mark password as modified so pre-save hook hashes the new plain value
        updateData.password = newEmployeeId;
        updateData.passwordChangedAt = new Date();
      }
    }

    Object.assign(existing, updateData);
    await existing.save();

    return res.json({ success: true, employee: existing });
  } catch (err) {
    console.error("[UpdateEmployee]", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE /api/employees/:id ──────────────────────────────────────────────
const deleteEmployee = async (req, res) => {
  try {
    const emp = await Employee.findOneAndDelete({ _id: req.params.id, organisationId: req.user.organisationId });
    if (!emp) return res.status(404).json({ success: false, message: "Employee not found" });
    return res.json({ success: true, message: "Employee deleted" });
  } catch (err) {
    console.error("[DeleteEmployee]", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/employees/form-config ────────────────────────────────────────
const getFormConfig = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    let config = await EmployeeFormConfig.findOne({ organisationId: orgId });

    // Auto-seed default config for this org if none exists yet
    if (!config) {
      const defaultData = EmployeeFormConfig.buildDefault(orgId);
      config = await EmployeeFormConfig.create(defaultData);
    }

    return res.json({ success: true, config });
  } catch (err) {
    console.error("[GetFormConfig]", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── PUT /api/employees/form-config ────────────────────────────────────────
const updateFormConfig = async (req, res) => {
  try {
    const orgId  = req.user.organisationId;
    const { fields } = req.body;

    if (!Array.isArray(fields)) {
      return res.status(422).json({ success: false, message: "fields must be an array" });
    }

    const config = await EmployeeFormConfig.findOneAndUpdate(
      { organisationId: orgId },
      { fields, updatedBy: req.user._id },
      { new: true, upsert: true }
    );

    return res.json({ success: true, config });
  } catch (err) {
    console.error("[UpdateFormConfig]", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getEmployees, getEmployee,
  createEmployee, updateEmployee, deleteEmployee,
  getFormConfig, updateFormConfig,
};
