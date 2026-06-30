const NightShiftPolicy = require('../../models/attendance/NightShiftPolicy');

exports.getPolicy = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    let policy = await NightShiftPolicy.findOne({ organisationId: orgId });
    if (!policy) {
      policy = new NightShiftPolicy({ organisationId: orgId });
      await policy.save();
    }
    res.json(policy);
  } catch (err) {
    res.status(500).json({ error: 'Server error fetching night shift policy', details: err.message });
  }
};

exports.updatePolicy = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    let policy = await NightShiftPolicy.findOne({ organisationId: orgId });
    if (!policy) {
      policy = new NightShiftPolicy({ organisationId: orgId });
    }
    
    const updateData = req.body;
    Object.assign(policy, updateData);
    policy.status = 'Configured';
    await policy.save();
    
    res.json(policy);
  } catch (err) {
    res.status(500).json({ error: 'Server error updating night shift policy', details: err.message });
  }
};
