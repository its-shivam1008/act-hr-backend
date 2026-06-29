const CustomSetting = require("../../models/settings/CustomSetting");

// Get all settings
const getSettings = async (req, res) => {
  try {
    const { organisationId, category } = req.query;
    const query = {};
    if (organisationId) query.organisationId = organisationId;
    if (category) query.category = category;
    
    const settings = await CustomSetting.find(query).sort({ createdAt: -1 });
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Create a new setting
const createSetting = async (req, res) => {
  try {
    const { organisationId, key, value, description, category, status } = req.body;
    
    // Check if key already exists
    const existing = await CustomSetting.findOne({ key });
    if (existing) {
      return res.status(400).json({ message: `Setting with key "${key}" already exists.` });
    }

    const setting = new CustomSetting({
      organisationId: organisationId || "default_org",
      key,
      value,
      description,
      category,
      status
    });

    const saved = await setting.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Update an existing setting
const updateSetting = async (req, res) => {
  try {
    const { key } = req.body;
    
    // Check if updating key to something that already exists elsewhere
    if (key) {
      const existing = await CustomSetting.findOne({ key, _id: { $ne: req.params.id } });
      if (existing) {
        return res.status(400).json({ message: `Setting with key "${key}" already exists.` });
      }
    }

    const updated = await CustomSetting.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Setting not found" });
    }
    
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Delete a setting
const deleteSetting = async (req, res) => {
  try {
    const deleted = await CustomSetting.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Setting not found" });
    }
    res.json({ message: "Setting deleted successfully", id: req.params.id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getSettings,
  createSetting,
  updateSetting,
  deleteSetting
};
