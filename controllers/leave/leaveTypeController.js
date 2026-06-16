const LeaveType = require('../../models/leaveModels/LeaveType');

exports.getLeaveTypes = async (req, res) => {
  try {
    const leaveTypes = await LeaveType.find();
    res.json(leaveTypes);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.createLeaveType = async (req, res) => {
  try {
    const newType = new LeaveType(req.body);
    const savedType = await newType.save();
    res.status(201).json(savedType);
  } catch (err) {
    res.status(500).json({ error: 'Error creating leave type', details: err.message });
  }
};

exports.updateLeaveType = async (req, res) => {
  try {
    const updated = await LeaveType.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Error updating leave type' });
  }
};

exports.deleteLeaveType = async (req, res) => {
  try {
    await LeaveType.findByIdAndDelete(req.params.id);
    res.json({ message: 'Leave type deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Error deleting leave type' });
  }
};
