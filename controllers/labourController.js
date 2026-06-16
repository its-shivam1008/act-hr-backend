const Labour          = require("../models/Labour");
const { LabourFormConfig } = require("../models/LabourFormConfig");

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
      .limit(Number(limit));

    return res.json({ success: true, total, page: Number(page), labours });
  } catch (err) {
    console.error("[GetLabours]", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/labours/:id ──────────────────────────────────────────────────────
const getLabour = async (req, res) => {
  try {
    const labour = await Labour.findOne({ _id: req.params.id, organisationId: req.user.organisationId });
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

    const labour = await Labour.create({
      ...req.body,
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
    const labour = await Labour.findOneAndUpdate(
      { _id: req.params.id, organisationId: req.user.organisationId },
      { ...req.body },
      { new: true, runValidators: true }
    );
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
