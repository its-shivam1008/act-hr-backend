const LeaveBalance = require('../../models/leaveModels/LeaveBalance');
const LeaveType = require('../../models/leaveModels/LeaveType');

exports.getBalances = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    // Handle both employee side and admin side fetch
    let employeeId = req.query.employeeId;
    if (!employeeId && req.user.personalInfo && req.user.personalInfo.employeeId) {
      // It's an employee logged in
      employeeId = req.user._id;
    } else if (!employeeId && req.user.role === 'admin') {
      // In case admin hits without an employee ID, return bad request or fetch their own if they have employee record
      // Let's assume admin hitting for themselves
      employeeId = req.user._id;
    }

    if (!employeeId) {
      return res.status(400).json({ error: 'employeeId is required' });
    }

    const year = new Date().getFullYear();
    const balances = await LeaveBalance.find({
      organisationId: orgId,
      employeeId,
      year
    }).populate('leaveType', 'name code lopIfExceeded encashmentAllowed');

    res.json(balances);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch leave balances' });
  }
};
