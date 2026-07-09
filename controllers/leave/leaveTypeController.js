const LeaveType = require('../../models/leaveModels/LeaveType');

exports.getLeaveTypes = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const leaveTypes = await LeaveType.find({ organisationId: orgId });
    res.json(leaveTypes);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.createLeaveType = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const newType = new LeaveType({ ...req.body, organisationId: orgId });
    const savedType = await newType.save();
    res.status(201).json(savedType);
  } catch (err) {
    res.status(500).json({ error: 'Error creating leave type', details: err.message });
  }
};

exports.updateLeaveType = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const updated = await LeaveType.findOneAndUpdate(
      { _id: req.params.id, organisationId: orgId },
      req.body,
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Error updating leave type' });
  }
};

exports.deleteLeaveType = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    await LeaveType.findOneAndDelete({ _id: req.params.id, organisationId: orgId });
    res.json({ message: 'Leave type deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Error deleting leave type' });
  }
};
