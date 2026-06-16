const ComplianceZone = require("../../models/wageCategories/ComplianceZone");
const SkillLevel     = require("../../models/skillLevelModels/SkillLevel");

const getOrgId = (req) => req.user?.organisationId;

const populate = (q) => q.populate("locations", "name city state").populate("rates.addedBy", "name");

exports.getZones = async (req, res) => {
  try {
    const zones = await populate(ComplianceZone.find({ organisationId: getOrgId(req) }).sort({ createdAt: 1 }));
    res.json({ success: true, zones });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getZone = async (req, res) => {
  try {
    const zone = await populate(ComplianceZone.findOne({ _id: req.params.id, organisationId: getOrgId(req) }));
    if (!zone) return res.status(404).json({ success: false, message: "Zone not found" });
    res.json({ success: true, zone });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.createZone = async (req, res) => {
  try {
    const { name, locations } = req.body;
    if (!name?.trim()) return res.status(422).json({ success: false, message: "Zone name is required" });
    const zone = await ComplianceZone.create({
      organisationId: getOrgId(req),
      name: name.trim(),
      locations: Array.isArray(locations) ? locations : (locations ? [locations] : []),
      createdBy: req.user._id,
    });
    const populated = await populate(ComplianceZone.findById(zone._id));
    res.status(201).json({ success: true, zone: populated });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ success: false, message: "Zone name already exists" });
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateZone = async (req, res) => {
  try {
    const { name, locations } = req.body;
    const update = {};
    if (name      !== undefined) update.name      = name.trim();
    if (locations !== undefined) update.locations = Array.isArray(locations) ? locations : [locations];
    const zone = await populate(ComplianceZone.findOneAndUpdate(
      { _id: req.params.id, organisationId: getOrgId(req) }, update, { new: true, runValidators: true }
    ));
    if (!zone) return res.status(404).json({ success: false, message: "Zone not found" });
    res.json({ success: true, zone });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ success: false, message: "Zone name already exists" });
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteZone = async (req, res) => {
  try {
    const zone = await ComplianceZone.findOneAndDelete({ _id: req.params.id, organisationId: getOrgId(req) });
    if (!zone) return res.status(404).json({ success: false, message: "Zone not found" });
    res.json({ success: true, message: "Zone deleted" });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.addRate = async (req, res) => {
  try {
    const { skillLevelId, basic, vda, effectiveDate } = req.body;
    if (!skillLevelId || basic === undefined || !effectiveDate)
      return res.status(422).json({ success: false, message: "skillLevelId, basic and effectiveDate are required" });

    const skill = await SkillLevel.findOne({ _id: skillLevelId, organisationId: getOrgId(req) });
    if (!skill) return res.status(404).json({ success: false, message: "Skill level not found" });

    const zone = await ComplianceZone.findOne({ _id: req.params.id, organisationId: getOrgId(req) });
    if (!zone) return res.status(404).json({ success: false, message: "Zone not found" });

    zone.rates.push({ skillLevelId, skillLevelName: skill.name, basic: Number(basic), vda: Number(vda ?? 0), effectiveDate: new Date(effectiveDate), isActive: true, addedBy: req.user._id });
    await zone.save();
    const populated = await populate(ComplianceZone.findById(zone._id));
    res.status(201).json({ success: true, zone: populated });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.updateRate = async (req, res) => {
  try {
    const zone = await ComplianceZone.findOne({ _id: req.params.id, organisationId: getOrgId(req) });
    if (!zone) return res.status(404).json({ success: false, message: "Zone not found" });
    const rate = zone.rates.id(req.params.rateId);
    if (!rate) return res.status(404).json({ success: false, message: "Rate not found" });
    const { basic, vda, effectiveDate, isActive } = req.body;
    if (basic         !== undefined) rate.basic         = Number(basic);
    if (vda           !== undefined) rate.vda           = Number(vda);
    if (effectiveDate !== undefined) rate.effectiveDate = new Date(effectiveDate);
    if (isActive      !== undefined) rate.isActive      = Boolean(isActive);
    await zone.save();
    const populated = await populate(ComplianceZone.findById(zone._id));
    res.json({ success: true, zone: populated });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.deleteRate = async (req, res) => {
  try {
    const zone = await ComplianceZone.findOne({ _id: req.params.id, organisationId: getOrgId(req) });
    if (!zone) return res.status(404).json({ success: false, message: "Zone not found" });
    zone.rates.pull({ _id: req.params.rateId });
    await zone.save();
    const populated = await populate(ComplianceZone.findById(zone._id));
    res.json({ success: true, zone: populated });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── GET /api/wage-categories/zones/:id/skill-levels ───────────────────────────
// Returns the distinct skill levels that have rates in the given zone.
// Used by Add Employee / Add Labour forms for the "Compliance Skill Level" dropdown.
exports.getZoneSkillLevels = async (req, res) => {
  try {
    const zone = await ComplianceZone.findOne({ _id: req.params.id, organisationId: getOrgId(req) })
      .populate("rates.skillLevelId", "name levelNumber");
    if (!zone) return res.status(404).json({ success: false, message: "Zone not found" });

    // Deduplicate by skillLevelId
    const seen = new Set();
    const skillLevels = [];
    zone.rates.forEach(r => {
      if (r.isActive && r.skillLevelId && !seen.has(String(r.skillLevelId._id ?? r.skillLevelId))) {
        seen.add(String(r.skillLevelId._id ?? r.skillLevelId));
        skillLevels.push({
          _id:         r.skillLevelId._id ?? r.skillLevelId,
          name:        r.skillLevelName,
          levelNumber: r.skillLevelId.levelNumber,
        });
      }
    });
    res.json({ success: true, skillLevels });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
