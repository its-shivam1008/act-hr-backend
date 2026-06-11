const EmploymentType = require("../../../models/employmentTypeModels/EmploymentType");

// ── Helper ─────────────────────────────────────────────────────────────────
const getOrgId = (req) => req.user?.organisationId;

// ── GET /api/masterdata/employment-types ───────────────────────────────────
exports.getEmploymentTypes = async (req, res) => {
  try {
    const { search = "", isActive } = req.query;
    const filter = { organisationId: getOrgId(req) };

    if (search) {
      filter.$or = [
        { name:        { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    const types = await EmploymentType.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: types.length, data: types });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/masterdata/employment-types/:id ──────────────────────────────
exports.getEmploymentType = async (req, res) => {
  try {
    const type = await EmploymentType.findOne({
      _id: req.params.id,
      organisationId: getOrgId(req),
    });
    if (!type) return res.status(404).json({ success: false, message: "Employment type not found" });
    res.status(200).json({ success: true, data: type });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/masterdata/employment-types ─────────────────────────────────
exports.createEmploymentType = async (req, res) => {
  try {
    const { name, description, isActive } = req.body;

    const type = await EmploymentType.create({
      organisationId: getOrgId(req),
      name,
      description,
      isActive: isActive !== undefined ? isActive : true,
    });

    res.status(201).json({ success: true, data: type });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "An employment type with this name already exists in your organisation",
      });
    }
    res.status(400).json({ success: false, message: err.message });
  }
};

// ── PUT /api/masterdata/employment-types/:id ──────────────────────────────
exports.updateEmploymentType = async (req, res) => {
  try {
    const allowed = ["name", "description", "isActive"];
    const updates = {};
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    });

    const type = await EmploymentType.findOneAndUpdate(
      { _id: req.params.id, organisationId: getOrgId(req) },
      updates,
      { new: true, runValidators: true }
    );

    if (!type) return res.status(404).json({ success: false, message: "Employment type not found" });
    res.status(200).json({ success: true, data: type });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "An employment type with this name already exists in your organisation",
      });
    }
    res.status(400).json({ success: false, message: err.message });
  }
};

// ── DELETE /api/masterdata/employment-types/:id ───────────────────────────
exports.deleteEmploymentType = async (req, res) => {
  try {
    const type = await EmploymentType.findOneAndDelete({
      _id: req.params.id,
      organisationId: getOrgId(req),
    });
    if (!type) return res.status(404).json({ success: false, message: "Employment type not found" });
    res.status(200).json({ success: true, message: "Employment type deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PATCH /api/masterdata/employment-types/:id/toggle ─────────────────────
exports.toggleEmploymentTypeStatus = async (req, res) => {
  try {
    const type = await EmploymentType.findOne({
      _id: req.params.id,
      organisationId: getOrgId(req),
    });
    if (!type) return res.status(404).json({ success: false, message: "Employment type not found" });

    type.isActive = !type.isActive;
    await type.save();

    res.status(200).json({ success: true, data: type });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
