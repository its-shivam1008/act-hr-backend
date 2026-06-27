const AccessZone = require("../../models/gatepass/AccessZone");

exports.getZones = async (req, res) => {
  try {
    const zones = await AccessZone.find({ organisationId: req.user.organisationId }).sort({ name: 1 });
    res.json({ success: true, data: zones });
  } catch (e) { res.status(500).json({ success: false, message: "Server error" }); }
};

exports.createZone = async (req, res) => {
  try {
    const { name, description, color } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "Zone name required" });
    const zone = await AccessZone.create({ organisationId: req.user.organisationId, name, description, color });
    res.status(201).json({ success: true, data: zone });
  } catch (e) { res.status(500).json({ success: false, message: "Server error" }); }
};

exports.updateZone = async (req, res) => {
  try {
    const zone = await AccessZone.findOneAndUpdate(
      { _id: req.params.id, organisationId: req.user.organisationId },
      { $set: req.body }, { new: true }
    );
    if (!zone) return res.status(404).json({ success: false, message: "Zone not found" });
    res.json({ success: true, data: zone });
  } catch (e) { res.status(500).json({ success: false, message: "Server error" }); }
};

exports.deleteZone = async (req, res) => {
  try {
    await AccessZone.findOneAndDelete({ _id: req.params.id, organisationId: req.user.organisationId });
    res.json({ success: true, message: "Zone deleted" });
  } catch (e) { res.status(500).json({ success: false, message: "Server error" }); }
};
