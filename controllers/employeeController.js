const Employee        = require("../models/Employee");
const { EmployeeFormConfig } = require("../models/EmployeeFormConfig");
const Department      = require("../models/departmentModels/Department");
const Designation     = require("../models/designationModels/Designation");
const EmploymentType  = require("../models/employmentTypeModels/EmploymentType");
const Location        = require("../models/locationModels/Location");
const SkillLevel      = require("../models/skillLevelModels/SkillLevel");
const ComplianceZone  = require("../models/wageCategories/ComplianceZone");
const mongoose        = require("mongoose");

// ── Resolve denormalised name fields from master data ─────────────────────────
const resolveNames = async (body) => {
  const extra = {};
  const tryName = async (Model, id, key) => {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return;
    const doc = await Model.findById(id).select("name agencyName").lean();
    if (doc) extra[key] = doc.name || doc.agencyName || "";
  };
  await Promise.all([
    tryName(Department,     body.department,          "departmentName"),
    tryName(Designation,    body.designation,          "designationName"),
    tryName(EmploymentType, body.employmentType,       "employmentTypeName"),
    tryName(Location,       body.workLocation,         "workLocationName"),
    tryName(ComplianceZone, body.complianceZone,       "complianceZoneName"),
    tryName(SkillLevel,     body.complianceSkillLevel, "complianceSkillLevelName"),
    tryName(SkillLevel,     body.skillLevel,           "skillLevelName"),
  ]);
  return extra;
};

// ── populate helper for reads ─────────────────────────────────────────────────
const POPULATE = [
  { path: "department",          select: "name" },
  { path: "designation",         select: "name" },
  { path: "employmentType",      select: "name" },
  { path: "workLocation",        select: "name" },
  { path: "complianceZone",      select: "name" },
  { path: "complianceSkillLevel",select: "name levelNumber" },
  { path: "skillLevel",          select: "name levelNumber" },
];

// ── GET /api/employees ─────────────────────────────────────────────────────
const getEmployees = async (req, res) => {
  try {
    const { search, department, status, page = 1, limit = 20 } = req.query;
    const orgId = req.user.organisationId;

    const query = { organisationId: orgId };

    if (department && department !== "All") query.department = department; // ObjectId or name
    if (status && status !== "All")         query.status     = status;
    if (search) {
      const s = new RegExp(search, "i");
      query.$or = [
        { firstName: s }, { lastName: s },
        { workEmail: s }, { employeeId: s },
        { departmentName: s }, { designationName: s },
      ];
    }

    const total = await Employee.countDocuments(query);
    const employees = await Employee.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * Number(limit))
      .limit(Number(limit))
      .populate(POPULATE);

    return res.json({ success: true, total, page: Number(page), employees });
  } catch (err) {
    console.error("[GetEmployees]", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/employees/:id ─────────────────────────────────────────────────
const getEmployee = async (req, res) => {
  try {
    const emp = await Employee
      .findOne({ _id: req.params.id, organisationId: req.user.organisationId })
      .populate(POPULATE);
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

    const nameFields = await resolveNames(req.body);
    const employee = await Employee.create({
      ...req.body,
      ...nameFields,
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

    const existing = await Employee.findOne({
      _id: req.params.id,
      organisationId: req.user.organisationId,
    }).select("+password");
    if (!existing) return res.status(404).json({ success: false, message: "Employee not found" });

    const nameFields = await resolveNames(otherFields);
    const updateData = { ...otherFields, ...nameFields };
    if (newEmployeeId !== undefined) {
      updateData.employeeId = newEmployeeId;
      if (newEmployeeId && newEmployeeId !== existing.employeeId) {
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

    if (!config) {
      const defaultData = EmployeeFormConfig.buildDefault(orgId);
      config = await EmployeeFormConfig.create(defaultData);
    } else {
      // Reconcile and update fields: merge code-defined FIELD_DEFINITIONS with DB config
      const { FIELD_DEFINITIONS } = require("../models/EmployeeFormConfig");
      const dbFieldsMap = new Map(config.fields.map(f => [f.fieldKey, f]));
      let hasChanges = false;

      const reconciledFields = FIELD_DEFINITIONS.map((def, idx) => {
        const dbField = dbFieldsMap.get(def.fieldKey);
        if (dbField) {
          const isChanged = (
            dbField.inputType !== def.inputType ||
            dbField.label !== def.label ||
            dbField.section !== def.section
          );
          if (isChanged) {
            hasChanges = true;
          }
          return {
            fieldKey:  def.fieldKey,
            label:     def.label,
            section:   def.section,
            inputType: def.inputType,
            visible:   dbField.visible,
            required:  dbField.required,
            order:     dbField.order !== undefined ? dbField.order : idx,
          };
        } else {
          // New field added in code definition
          hasChanges = true;
          return {
            fieldKey:  def.fieldKey,
            label:     def.label,
            section:   def.section,
            inputType: def.inputType,
            visible:   def.defaultVisible,
            required:  def.defaultRequired,
            order:     idx,
          };
        }
      });

      if (hasChanges) {
        config.fields = reconciledFields;
        await config.save();
      }
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
