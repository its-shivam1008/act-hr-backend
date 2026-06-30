const Holiday = require('../../models/leaveModels/Holiday');

exports.getHolidays = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const holidays = await Holiday.find({ organisationId: orgId }).sort({ date: 1 });
    res.json(holidays);
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

exports.createHoliday = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const newHoliday = new Holiday({ ...req.body, organisationId: orgId });
    const savedHoliday = await newHoliday.save();
    res.status(201).json(savedHoliday);
  } catch (err) {
    res.status(500).json({ error: 'Error creating holiday', details: err.message });
  }
};

exports.deleteHoliday = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    await Holiday.findOneAndDelete({ _id: req.params.id, organisationId: orgId });
    res.json({ message: 'Holiday deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Error deleting holiday', details: err.message });
  }
};
