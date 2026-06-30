const LeaveApplication = require('../../models/leaveModels/LeaveApplication');
const LeaveBalance = require('../../models/leaveModels/LeaveBalance');
const LeaveType = require('../../models/leaveModels/LeaveType');
const Holiday = require('../../models/leaveModels/Holiday');
const LeavePolicy = require('../../models/leaveModels/LeavePolicy');
const Employee = require('../../models/Employee');

const calculateWorkingDays = async (organisationId, employeeId, startDate, endDate) => {
  let count = 0;
  let currentDate = new Date(startDate);
  currentDate.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  
  const employee = await Employee.findById(employeeId);
  const userLocation = employee?.employment?.workLocationName;

  const policy = await LeavePolicy.findOne({ organisationId }) || { excludeWeekends: true, sandwichRule: false };
  let holidays = await Holiday.find({
    organisationId,
    date: { $gte: currentDate, $lte: end }
  });

  // Filter location-specific holidays
  holidays = holidays.filter(h => {
    if (!h.locations || h.locations.length === 0) return true;
    if (userLocation && h.locations.includes(userLocation)) return true;
    return false;
  });

  const holidayDates = holidays.map(h => h.date.toDateString());

  while (currentDate <= end) {
    const day = currentDate.getDay();
    const isWeekend = (day === 0 || day === 6);
    const isHoliday = holidayDates.includes(currentDate.toDateString());
    
    if (policy.excludeWeekends && isWeekend) {
      // skip
    } else if (isHoliday) {
      // skip
    } else {
      count++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return count;
};

exports.getApplications = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    let query = { organisationId: orgId };
    
    if (req.user.role === 'employee' || (req.user.personalInfo && req.user.personalInfo.employeeId)) {
      query.employeeId = req.user._id;
    }
    
    const applications = await LeaveApplication.find(query)
      .populate('employeeId', 'personalInfo employment')
      .populate('leaveType', 'name code')
      .populate('managerId', 'personalInfo');
    res.json(applications);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.applyLeave = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    let { employeeId, leaveType, startDate, endDate, reason, managerId } = req.body;
    
    if (req.user.personalInfo && req.user.personalInfo.employeeId) {
      employeeId = req.user._id;
    }
    
    const employee = await Employee.findById(employeeId);
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    
    const days = await calculateWorkingDays(orgId, employeeId, startDate, endDate);
    if (days === 0) {
      return res.status(400).json({ error: 'Selected range contains no working days.' });
    }
    
    const year = new Date(startDate).getFullYear();
    const balanceRecord = await LeaveBalance.findOne({ organisationId: orgId, employeeId, leaveType, year });
    const typeRecord = await LeaveType.findOne({ _id: leaveType, organisationId: orgId });
    const policy = await LeavePolicy.findOne({ organisationId: orgId }) || { allowNegativeBalance: false };
    
    if (employee.employment && employee.employment.status === 'Resigned' && typeRecord.code === 'PL') {
      return res.status(400).json({ error: 'Privilege Leave cannot be applied during Notice Period.' });
    }

    let isLop = false;
    let balance = balanceRecord ? balanceRecord.balance : 0;
    
    if (balance < days) {
      if ((typeRecord && typeRecord.lopIfExceeded) || policy.allowNegativeBalance) {
        isLop = true;
      } else {
        return res.status(400).json({ error: 'Insufficient leave balance and LOP not allowed.' });
      }
    }
    
    // Decrement balance immediately to reserve days
    if (!isLop && balanceRecord) {
      balanceRecord.balance -= days;
      await balanceRecord.save();
    }
    
    const newApp = new LeaveApplication({
      organisationId: orgId,
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
    const orgId = req.user.organisationId;
    const app = await LeaveApplication.findOne({ _id: req.params.id, organisationId: orgId });
    if (!app) return res.status(404).json({ error: 'Leave not found' });
    if (app.status !== 'Pending') return res.status(400).json({ error: 'Leave already processed' });
    
    const year = new Date(app.startDate).getFullYear();
    const balanceRecord = await LeaveBalance.findOne({ organisationId: orgId, employeeId: app.employeeId, leaveType: app.leaveType, year });
    
    if (balanceRecord && !app.isLop) {
      balanceRecord.used += app.days;
      await balanceRecord.save();
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
    const orgId = req.user.organisationId;
    const { rejectionReason } = req.body;
    const app = await LeaveApplication.findOne({ _id: req.params.id, organisationId: orgId });
    if (!app) return res.status(404).json({ error: 'Leave not found' });
    
    if (app.status === 'Pending' && !app.isLop) {
      const year = new Date(app.startDate).getFullYear();
      const balanceRecord = await LeaveBalance.findOne({ organisationId: orgId, employeeId: app.employeeId, leaveType: app.leaveType, year });
      if (balanceRecord) {
        balanceRecord.balance += app.days; // Restore balance
        await balanceRecord.save();
      }
    }
    
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
    const orgId = req.user.organisationId;
    const app = await LeaveApplication.findOne({ _id: req.params.id, organisationId: orgId });
    if (!app) return res.status(404).json({ error: 'Leave not found' });
    
    if (app.status !== 'Cancelled' && !app.isLop) {
      const year = new Date(app.startDate).getFullYear();
      const balanceRecord = await LeaveBalance.findOne({ organisationId: orgId, employeeId: app.employeeId, leaveType: app.leaveType, year });
      if (balanceRecord) {
        balanceRecord.balance += app.days; // Restore available balance
        if (app.status === 'Approved') {
          balanceRecord.used -= app.days; // Decrement used if it was approved
        }
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
