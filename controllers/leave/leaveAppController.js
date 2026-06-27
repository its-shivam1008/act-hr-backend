const LeaveApplication = require('../../models/leaveModels/LeaveApplication');
const LeaveBalance = require('../../models/leaveModels/LeaveBalance');
const LeaveType = require('../../models/leaveModels/LeaveType');

// Simple utility to calculate working days (skips Saturday and Sunday)
const calculateWorkingDays = (startDate, endDate) => {
  let count = 0;
  let currentDate = new Date(startDate);
  const end = new Date(endDate);
  
  while (currentDate <= end) {
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // 0 = Sunday, 6 = Saturday
      count++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return count;
};

exports.getApplications = async (req, res) => {
  try {
    const applications = await LeaveApplication.find()
      .populate('employeeId', 'name employeeId')
      .populate('leaveType', 'name code')
      .populate('managerId', 'name');
    res.json(applications);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.applyLeave = async (req, res) => {
  try {
    const { employeeId, leaveType, startDate, endDate, reason, managerId } = req.body;
    
    const days = calculateWorkingDays(startDate, endDate);
    if (days === 0) {
      return res.status(400).json({ error: 'Selected range contains no working days.' });
    }
    
    const year = new Date(startDate).getFullYear();
    const balanceRecord = await LeaveBalance.findOne({ employeeId, leaveType, year });
    const typeRecord = await LeaveType.findById(leaveType);
    
    let isLop = false;
    let balance = balanceRecord ? balanceRecord.balance : 0;
    
    if (balance < days) {
      if (typeRecord && typeRecord.lopIfExceeded) {
        isLop = true;
      } else {
        return res.status(400).json({ error: 'Insufficient leave balance and LOP not allowed.' });
      }
    }
    
    const newApp = new LeaveApplication({
      employeeId,
      leaveType,
      startDate,
      endDate,
      days,
      reason,
      managerId,
      isLop
    });
    
    await newApp.save();
    res.status(201).json({ ...newApp._doc, isLopWarning: isLop });
  } catch (err) {
    res.status(500).json({ error: 'Error applying for leave', details: err.message });
  }
};

exports.approveLeave = async (req, res) => {
  try {
    const app = await LeaveApplication.findById(req.params.id);
    if (!app) return res.status(404).json({ error: 'Leave not found' });
    if (app.status !== 'Pending') return res.status(400).json({ error: 'Leave already processed' });
    
    const year = new Date(app.startDate).getFullYear();
    const balanceRecord = await LeaveBalance.findOne({ employeeId: app.employeeId, leaveType: app.leaveType, year });
    
    if (balanceRecord) {
      balanceRecord.balance -= app.days;
      await balanceRecord.save();
    } else {
      // If no balance record, we can create one with negative balance or handle LOP
      await LeaveBalance.create({ employeeId: app.employeeId, leaveType: app.leaveType, year, balance: -app.days });
    }
    
    app.status = 'Approved';
    await app.save();
    res.json(app);
  } catch (err) {
    res.status(500).json({ error: 'Error approving leave', details: err.message });
  }
};

exports.rejectLeave = async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    const app = await LeaveApplication.findById(req.params.id);
    if (!app) return res.status(404).json({ error: 'Leave not found' });
    
    app.status = 'Rejected';
    app.rejectionReason = rejectionReason;
    await app.save();
    res.json(app);
  } catch (err) {
    res.status(500).json({ error: 'Error rejecting leave' });
  }
};

exports.cancelLeave = async (req, res) => {
  try {
    const app = await LeaveApplication.findById(req.params.id);
    if (!app) return res.status(404).json({ error: 'Leave not found' });
    
    if (app.status === 'Approved') {
      // Restore balance
      const year = new Date(app.startDate).getFullYear();
      const balanceRecord = await LeaveBalance.findOne({ employeeId: app.employeeId, leaveType: app.leaveType, year });
      if (balanceRecord) {
        balanceRecord.balance += app.days;
        await balanceRecord.save();
      }
    }
    
    app.status = 'Cancelled';
    await app.save();
    res.json(app);
  } catch (err) {
    res.status(500).json({ error: 'Error cancelling leave' });
  }
};
