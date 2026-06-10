const Designation = require("../../../models/designationModels/Designation");

// ── Helper ─────────────────────────────────────────────────────────────────
const getOrgId = (req) => req.user?.organisationId;

// ── GET /api/masterdata/designations ──────────────────────────────────────
exports.getDesignations = async (req, res) => {
  try {
    const { search = "", isActive } = req.query;
    const filter = { organisationId: getOrgId(req) };

    if (search) {
      filter.$or = [
        { name:           { $regex: search, $options: "i" } },
        { departmentName: { $regex: search, $options: "i" } },
        { levelName:      { $regex: search, $options: "i" } },
      ];
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    const designations = await Designation.find(filter)
      .populate("department", "name")   // safe even if Department doesn't exist yet
      .populate("level",      "name")   // safe even if SkillLevel doesn't exist yet
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: designations.length, data: designations });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/masterdata/designations/:id ─────────────────────────────────
exports.getDesignation = async (req, res) => {
  try {
    const designation = await Designation.findOne({
      _id: req.params.id,
      organisationId: getOrgId(req),
    })
      .populate("department", "name")
      .populate("level",      "name");

    if (!designation)
      return res.status(404).json({ success: false, message: "Designation not found" });

    res.status(200).json({ success: true, data: designation });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/masterdata/designations ─────────────────────────────────────
exports.createDesignation = async (req, res) => {
  try {
    const { name, department, departmentName, level, levelName, isActive } = req.body;

    const designation = await Designation.create({
      organisationId: getOrgId(req),
      name,
      department:     department     || null,
      departmentName: departmentName || "",
      level:          level          || null,
      levelName:      levelName      || "",
      isActive:       isActive !== undefined ? isActive : true,
    });

    res.status(201).json({ success: true, data: designation });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "A designation with this name already exists in your organisation",
      });
    }
    res.status(400).json({ success: false, message: err.message });
  }
};

// ── PUT /api/masterdata/designations/:id ─────────────────────────────────
exports.updateDesignation = async (req, res) => {
  try {
    const allowed = ["name", "department", "departmentName", "level", "levelName", "isActive"];
    const updates = {};
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    });

    const designation = await Designation.findOneAndUpdate(
      { _id: req.params.id, organisationId: getOrgId(req) },
      updates,
      { new: true, runValidators: true }
    )
      .populate("department", "name")
      .populate("level",      "name");

    if (!designation)
      return res.status(404).json({ success: false, message: "Designation not found" });

    res.status(200).json({ success: true, data: designation });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "A designation with this name already exists in your organisation",
      });
    }
    res.status(400).json({ success: false, message: err.message });
  }
};

// ── DELETE /api/masterdata/designations/:id ───────────────────────────────
exports.deleteDesignation = async (req, res) => {
  try {
    const designation = await Designation.findOneAndDelete({
      _id: req.params.id,
      organisationId: getOrgId(req),
    });

    if (!designation)
      return res.status(404).json({ success: false, message: "Designation not found" });

    res.status(200).json({ success: true, message: "Designation deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PATCH /api/masterdata/designations/:id/toggle ─────────────────────────
exports.toggleDesignationStatus = async (req, res) => {
  try {
    const designation = await Designation.findOne({
      _id: req.params.id,
      organisationId: getOrgId(req),
    });

    if (!designation)
      return res.status(404).json({ success: false, message: "Designation not found" });

    designation.isActive = !designation.isActive;
    await designation.save();

    res.status(200).json({ success: true, data: designation });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
