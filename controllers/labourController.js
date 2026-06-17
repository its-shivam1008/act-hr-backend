const Labour             = require("../models/Labour");
const { LabourFormConfig } = require("../models/LabourFormConfig");
const Department         = require("../models/departmentModels/Department");
const Designation        = require("../models/designationModels/Designation");
const EmploymentType     = require("../models/employmentTypeModels/EmploymentType");
const Location           = require("../models/locationModels/Location");
const SkillLevel         = require("../models/skillLevelModels/SkillLevel");
const Agency             = require("../models/agencyModels/Agency");
const ComplianceZone     = require("../models/wageCategories/ComplianceZone");
const mongoose           = require("mongoose");

// ── Resolve denormalised name fields from master data ─────────────────────────
const resolveNames = async (body) => {
  const extra = {};
  const tryName = async (Model, id, key, nameField = "name") => {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return;
    const doc = await Model.findById(id).select(`${nameField}`).lean();
    if (doc) extra[key] = doc[nameField] || "";
  };
  await Promise.all([
    tryName(Location,      body.locationId,          "locationName"),
    tryName(EmploymentType,body.employmentType,       "employmentTypeName"),
    tryName(Agency,        body.agencyId,             "agencyName", "agencyName"),
    tryName(Department,    body.department,           "departmentName"),
    tryName(Designation,   body.designation,          "designationName"),
    tryName(ComplianceZone,body.complianceZone,       "complianceZoneName"),
    tryName(SkillLevel,    body.complianceSkillLevel, "complianceSkillLevelName"),
    tryName(SkillLevel,    body.skillLevel,           "skillLevelName"),
  ]);
  return extra;
};

const POPULATE = [
  { path: "locationId",         select: "name city" },
  { path: "employmentType",     select: "name" },
  { path: "agencyId",           select: "agencyName" },
  { path: "department",         select: "name" },
  { path: "designation",        select: "name" },
  { path: "complianceZone",     select: "name" },
  { path: "complianceSkillLevel",select: "name levelNumber" },
  { path: "skillLevel",         select: "name levelNumber" },
];

// ── GET /api/labours ──────────────────────────────────────────────────────────
const getLabours = async (req, res) => {
  try {
    const { search, department, status, page = 1, limit = 20 } = req.query;
    const orgId = req.user.organisationId;
    const query = { organisationId: orgId };

    if (department && department !== "All") query.department = department;
    if (status && status !== "All") query.status = status;
    if (search) {
      const s = new RegExp(search, "i");
      query.$or = [
        { firstName: s }, { lastName: s },
        { email: s }, { labourId: s },
        { department: s }, { designation: s },
      ];
    }

    const total   = await Labour.countDocuments(query);
    const labours = await Labour.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * Number(limit))
      .limit(Number(limit))
      .populate(POPULATE);

    return res.json({ success: true, total, page: Number(page), labours });
  } catch (err) {
    console.error("[GetLabours]", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/labours/:id ──────────────────────────────────────────────────────
const getLabour = async (req, res) => {
  try {
    const labour = await Labour.findOne({ _id: req.params.id, organisationId: req.user.organisationId })
      .populate(POPULATE);
    if (!labour) return res.status(404).json({ success: false, message: "Labour record not found" });
    return res.json({ success: true, labour });
  } catch (err) {
    console.error("[GetLabour]", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/labours ─────────────────────────────────────────────────────────
const createLabour = async (req, res) => {
  try {
    const orgId = req.user.organisationId;

    // Validate required fields from form config
    const config = await LabourFormConfig.findOne({ organisationId: orgId });
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
    const labour = await Labour.create({
      ...req.body,
      ...nameFields,
      organisationId: orgId,
      createdBy: req.user._id,
    });

    return res.status(201).json({ success: true, labour });
  } catch (err) {
    console.error("[CreateLabour]", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── PUT /api/labours/:id ──────────────────────────────────────────────────────
const updateLabour = async (req, res) => {
  try {
    const nameFields = await resolveNames(req.body);
    const labour = await Labour.findOneAndUpdate(
      { _id: req.params.id, organisationId: req.user.organisationId },
      { ...req.body, ...nameFields },
      { new: true, runValidators: true }
    ).populate(POPULATE);
    if (!labour) return res.status(404).json({ success: false, message: "Labour record not found" });
    return res.json({ success: true, labour });
  } catch (err) {
    console.error("[UpdateLabour]", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE /api/labours/:id ───────────────────────────────────────────────────
const deleteLabour = async (req, res) => {
  try {
    const labour = await Labour.findOneAndDelete({ _id: req.params.id, organisationId: req.user.organisationId });
    if (!labour) return res.status(404).json({ success: false, message: "Labour record not found" });
    return res.json({ success: true, message: "Labour record deleted" });
  } catch (err) {
    console.error("[DeleteLabour]", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/labours/form-config ──────────────────────────────────────────────
const getFormConfig = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    let config = await LabourFormConfig.findOne({ organisationId: orgId });

    if (!config) {
      const defaultData = LabourFormConfig.buildDefault(orgId);
      config = await LabourFormConfig.create(defaultData);
    } else {
      // Reconcile and update fields: merge code-defined LABOUR_FIELD_DEFINITIONS with DB config
      const { LABOUR_FIELD_DEFINITIONS } = require("../models/LabourFormConfig");
      const dbFieldsMap = new Map(config.fields.map(f => [f.fieldKey, f]));
      let hasChanges = false;

      const reconciledFields = LABOUR_FIELD_DEFINITIONS.map((def, idx) => {
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
    console.error("[GetLabourFormConfig]", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── PUT /api/labours/form-config ──────────────────────────────────────────────
const updateFormConfig = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const { fields } = req.body;

    if (!Array.isArray(fields)) {
      return res.status(422).json({ success: false, message: "fields must be an array" });
    }

    const config = await LabourFormConfig.findOneAndUpdate(
      { organisationId: orgId },
      { fields, updatedBy: req.user._id },
      { new: true, upsert: true }
    );

    return res.json({ success: true, config });
  } catch (err) {
    console.error("[UpdateLabourFormConfig]", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getLabours, getLabour,
  createLabour, updateLabour, deleteLabour,
  getFormConfig, updateFormConfig,
};
