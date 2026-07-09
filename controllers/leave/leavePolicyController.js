const LeavePolicy = require('../../models/leaveModels/LeavePolicy');

exports.getPolicy = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    let policy = await LeavePolicy.findOne({ organisationId: orgId });
    if (!policy) {
      policy = await LeavePolicy.create({ organisationId: orgId });
    }
    res.json(policy);
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

exports.updatePolicy = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const policy = await LeavePolicy.findOneAndUpdate(
      { organisationId: orgId },
      req.body,
      { new: true, upsert: true }
    );
    res.json(policy);
  } catch (err) {
    res.status(500).json({ error: 'Error updating policy', details: err.message });
  }
};
