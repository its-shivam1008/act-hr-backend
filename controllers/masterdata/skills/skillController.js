const Skill = require("../../../models/skillModels/Skill");

const getOrgId = (req) => req.user?.organisationId;

// ── GET /api/masterdata/skills ────────────────────────────────────────────────
exports.getSkills = async (req, res) => {
  try {
    const list = await Skill.find({ organisationId: getOrgId(req) }).sort({ name: 1 });
    res.json({ success: true, data: list });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/masterdata/skills ───────────────────────────────────────────────
exports.createSkill = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "Skill name is required" });

    const existing = await Skill.findOne({ organisationId: getOrgId(req), name: new RegExp(`^${name.trim()}$`, "i") });
    if (existing) return res.status(400).json({ success: false, message: "Skill already exists" });

    const item = await Skill.create({
      organisationId: getOrgId(req),
      name: name.trim(),
      description,
    });
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PUT /api/masterdata/skills/:id ────────────────────────────────────────────
exports.updateSkill = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "Skill name is required" });

    const existing = await Skill.findOne({
      _id: { $ne: req.params.id },
      organisationId: getOrgId(req),
      name: new RegExp(`^${name.trim()}$`, "i"),
    });
    if (existing) return res.status(400).json({ success: false, message: "Another skill with this name already exists" });

    const item = await Skill.findOneAndUpdate(
      { _id: req.params.id, organisationId: getOrgId(req) },
      { name: name.trim(), description },
      { new: true }
    );
    if (!item) return res.status(404).json({ success: false, message: "Skill not found" });

    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE /api/masterdata/skills/:id ─────────────────────────────────────────
exports.deleteSkill = async (req, res) => {
  try {
    const item = await Skill.findOneAndDelete({ _id: req.params.id, organisationId: getOrgId(req) });
    if (!item) return res.status(404).json({ success: false, message: "Skill not found" });
    res.json({ success: true, message: "Skill deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PATCH /api/masterdata/skills/:id/toggle ───────────────────────────────────
exports.toggleSkill = async (req, res) => {
  try {
    const item = await Skill.findOne({ _id: req.params.id, organisationId: getOrgId(req) });
    if (!item) return res.status(404).json({ success: false, message: "Skill not found" });

    item.isActive = !item.isActive;
    await item.save();

    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
