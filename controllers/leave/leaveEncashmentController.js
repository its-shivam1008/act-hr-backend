const LeaveEncashment = require('../../models/leaveModels/LeaveEncashment');
const LeaveBalance = require('../../models/leaveModels/LeaveBalance');

exports.getEncashments = async (req, res) => {
  try {
    const encashments = await LeaveEncashment.find()
      .populate('employeeId', 'name employeeId')
      .populate('leaveType', 'name code');
    res.json(encashments);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.requestEncashment = async (req, res) => {
  try {
    const { employeeId, leaveType, days, month, year } = req.body;
    
    // Verify balance
    const balance = await LeaveBalance.findOne({ employeeId, leaveType, year });
    if (!balance || balance.balance < days) {
      return res.status(400).json({ error: 'Insufficient leave balance for encashment.' });
    }
    
    const newRequest = new LeaveEncashment({
      employeeId,
      leaveType,
      days,
      month,
      year,
      status: 'Pending'
    });
    
    await newRequest.save();
    res.status(201).json(newRequest);
  } catch (err) {
    res.status(500).json({ error: 'Error requesting encashment', details: err.message });
  }
};
