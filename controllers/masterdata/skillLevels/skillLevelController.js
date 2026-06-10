const SkillLevel = require("../../../models/skillLevelModels/SkillLevel");

const getOrgId = (req) => req.user?.organisationId;

exports.getSkillLevels = async (req, res) => {
  try {
    const { search = "", isActive } = req.query;
    const filter = { organisationId: getOrgId(req) };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
      // Note: regex on numbers isn't directly supported in Mongoose without converting.
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    const levels = await SkillLevel.find(filter).sort({ levelNumber: 1 });
    res.status(200).json({ success: true, count: levels.length, data: levels });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getSkillLevel = async (req, res) => {
  try {
    const level = await SkillLevel.findOne({ _id: req.params.id, organisationId: getOrgId(req) });
    if (!level) return res.status(404).json({ success: false, message: "Skill level not found" });
    res.status(200).json({ success: true, data: level });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createSkillLevel = async (req, res) => {
  try {
    const { name, levelNumber, description, isActive } = req.body;
    const level = await SkillLevel.create({
      organisationId: getOrgId(req),
      name,
      levelNumber,
      description,
      isActive: isActive !== undefined ? isActive : true,
    });
    res.status(201).json({ success: true, data: level });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "A skill level with this name or number already exists in your organisation",
      });
    }
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.updateSkillLevel = async (req, res) => {
  try {
    const allowed = ["name", "levelNumber", "description", "isActive"];
    const updates = {};
    allowed.forEach(key => { if (req.body[key] !== undefined) updates[key] = req.body[key]; });

    const level = await SkillLevel.findOneAndUpdate(
      { _id: req.params.id, organisationId: getOrgId(req) },
      updates,
      { new: true, runValidators: true }
    );
    if (!level) return res.status(404).json({ success: false, message: "Skill level not found" });
    res.status(200).json({ success: true, data: level });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "A skill level with this name or number already exists in your organisation",
      });
    }
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.deleteSkillLevel = async (req, res) => {
  try {
    const level = await SkillLevel.findOneAndDelete({ _id: req.params.id, organisationId: getOrgId(req) });
    if (!level) return res.status(404).json({ success: false, message: "Skill level not found" });
    res.status(200).json({ success: true, message: "Skill level deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.toggleSkillLevelStatus = async (req, res) => {
  try {
    const level = await SkillLevel.findOne({ _id: req.params.id, organisationId: getOrgId(req) });
    if (!level) return res.status(404).json({ success: false, message: "Skill level not found" });

    level.isActive = !level.isActive;
    await level.save();
    res.status(200).json({ success: true, data: level });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
