const LeaveEncashment = require('../../models/leaveModels/LeaveEncashment');
const LeaveBalance = require('../../models/leaveModels/LeaveBalance');
const Employee = require('../../models/Employee');

exports.getEncashments = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    let query = { organisationId: orgId };
    if (req.user.role === 'employee' || (req.user.personalInfo && req.user.personalInfo.employeeId)) {
      query.employeeId = req.user._id;
    }
    const encashments = await LeaveEncashment.find(query)
      .populate('employeeId', 'personalInfo employment')
      .populate('leaveType', 'name code');
    res.json(encashments);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.requestEncashment = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    let { employeeId, leaveType, days, month, year } = req.body;
    
    if (req.user.personalInfo && req.user.personalInfo.employeeId) {
      employeeId = req.user._id;
    }
    
    // Verify balance
    const balance = await LeaveBalance.findOne({ organisationId: orgId, employeeId, leaveType, year });
    if (!balance || balance.balance < days) {
      return res.status(400).json({ error: 'Insufficient leave balance for encashment.' });
    }
    
    const emp = await Employee.findById(employeeId);
    let amount = 0;
    if (emp && emp.financial) {
      const basic = emp.financial.basicSalary || 0;
      const da = emp.financial.da || 0;
      amount = Math.round(((basic + da) / 26) * days);
    }
    
    const newRequest = new LeaveEncashment({
      organisationId: orgId,
      employeeId,
      leaveType,
      days,
      month,
      year,
      amount,
      status: 'Pending'
    });
    
    await newRequest.save();
    
    // Deduct balance
    balance.balance -= days;
    await balance.save();
    
    res.status(201).json(newRequest);
  } catch (err) {
    res.status(500).json({ error: 'Error requesting encashment', details: err.message });
  }
};

exports.approveEncashment = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const reqId = req.params.id;
    const encashment = await LeaveEncashment.findOne({ _id: reqId, organisationId: orgId });
    if (!encashment) return res.status(404).json({ error: 'Request not found' });
    
    encashment.status = 'Approved';
    await encashment.save();
    res.json(encashment);
  } catch (err) {
    res.status(500).json({ error: 'Error approving request' });
  }
};

exports.rejectEncashment = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const reqId = req.params.id;
    const encashment = await LeaveEncashment.findOne({ _id: reqId, organisationId: orgId });
    if (!encashment) return res.status(404).json({ error: 'Request not found' });
    
    // Restore balance
    const balance = await LeaveBalance.findOne({ 
      organisationId: orgId, 
      employeeId: encashment.employeeId, 
      leaveType: encashment.leaveType, 
      year: encashment.year 
    });
    if (balance) {
      balance.balance += encashment.days;
      await balance.save();
    }
    
    encashment.status = 'Rejected';
    await encashment.save();
    res.json(encashment);
  } catch (err) {
    res.status(500).json({ error: 'Error rejecting request' });
  }
};
