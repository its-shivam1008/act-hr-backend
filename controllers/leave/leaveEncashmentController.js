const LeaveEncashment = require('../../models/leaveModels/LeaveEncashment');
const LeaveBalance = require('../../models/leaveModels/LeaveBalance');
const LeaveType = require('../../models/leaveModels/LeaveType');
const Employee = require('../../models/Employee');
const Adjustment = require('../../models/payrollModels/Adjustment');
const Transaction = require('../../models/payrollModels/Transaction');
const AuditLog = require('../../models/leaveModels/AuditLog');
const { resolveEmployeeSnapshot } = require('../../utils/payrollIdentity');

// Get all encashments for organization/employee
exports.getEncashments = async (req, res) => {
  try {
    const orgId = req.user.organisationId || req.user.organizationId;
    let query = { organisationId: orgId };

    // If request is from employee, only show their requests
    if (req.user.personalInfo && req.user.personalInfo.employeeId) {
      query.employeeId = req.user._id;
    } else if (req.query.employeeId) {
      query.employeeId = req.query.employeeId;
    }

    if (req.query.status && req.query.status !== 'All') {
      if (req.query.status === 'History') {
        query.status = { $in: ['Approved', 'Rejected'] };
      } else {
        query.status = req.query.status;
      }
    }

    if (req.query.leaveTypeId) {
      query.leaveType = req.query.leaveTypeId;
    }

    const encashments = await LeaveEncashment.find(query)
      .populate('employeeId', 'personalInfo employment financial')
      .populate('leaveType', 'name code')
      .sort({ createdAt: -1 });

    const year = new Date().getFullYear();
    const resolvedEncashments = await Promise.all(encashments.map(async (reqDoc) => {
      const balanceDoc = await LeaveBalance.findOne({
        organisationId: orgId,
        employeeId: reqDoc.employeeId?._id,
        leaveType: reqDoc.leaveType?._id,
        year
      });
      const lean = reqDoc.toObject();
      lean.currentBalance = balanceDoc ? balanceDoc.balance : 0;
      return lean;
    }));

    res.json(resolvedEncashments);
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

// Get single request (for admin)
exports.getEncashmentById = async (req, res) => {
  try {
    const orgId = req.user.organisationId || req.user.organizationId;
    const request = await LeaveEncashment.findOne({ _id: req.params.id, organisationId: orgId })
      .populate('employeeId', 'personalInfo employment financial')
      .populate('leaveType', 'name code');

    if (!request) {
      return res.status(404).json({ error: 'Encashment request not found' });
    }

    const year = new Date().getFullYear();
    const balanceDoc = await LeaveBalance.findOne({
      organisationId: orgId,
      employeeId: request.employeeId?._id,
      leaveType: request.leaveType?._id,
      year
    });

    const lean = request.toObject();
    lean.currentBalance = balanceDoc ? balanceDoc.balance : 0;

    res.json(lean);
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

// Request leave encashment (employee)
exports.requestEncashment = async (req, res) => {
  try {
    const orgId = req.user.organisationId || req.user.organizationId;
    const employeeId = req.user._id;
    const { leaveTypeId, requestedDays, paymentMethod } = req.body;

    if (!leaveTypeId || !requestedDays || !paymentMethod) {
      return res.status(400).json({ error: 'All fields (leaveTypeId, requestedDays, paymentMethod) are required.' });
    }

    // 1. Verify employee exists and is active
    const employee = await Employee.findOne({ _id: employeeId, organisationId: orgId });
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found.' });
    }
    if (employee.employment?.status !== 'Active') {
      return res.status(400).json({ error: 'Employee is not active.' });
    }

    // 2. Verify leave type exists and is encashable
    const leaveType = await LeaveType.findOne({ _id: leaveTypeId, organisationId: orgId });
    if (!leaveType) {
      return res.status(404).json({ error: 'Leave type not found.' });
    }
    if (!leaveType.encashable) {
      return res.status(400).json({ error: `Leave type "${leaveType.name}" is not marked as encashable. Please ask your admin to enable encashment for this leave type from Leave Types settings.` });
    }

    // 3. Verify leave balance exists
    const year = new Date().getFullYear();
    const balance = await LeaveBalance.findOne({ organisationId: orgId, employeeId, leaveType: leaveTypeId, year });
    if (!balance) {
      return res.status(400).json({ error: 'Leave balance not found.' });
    }

    // 4. Validate days
    if (requestedDays <= 0) {
      return res.status(400).json({ error: 'Requested days must be greater than 0.' });
    }
    if (requestedDays > balance.balance) {
      return res.status(400).json({ error: 'Requested days exceed available balance.' });
    }

    // 5. Minimum balance rule (minimum 15 days balance must remain)
    const remaining = balance.balance - requestedDays;
    if (remaining < 15) {
      return res.status(400).json({ error: 'Policy rule violation: You must maintain a minimum balance of 15 days after encashment.' });
    }

    // 6. Maximum yearly encashment not exceeded (max 15 days per year)
    const currentYearRequests = await LeaveEncashment.find({
      employeeId,
      leaveType: leaveTypeId,
      status: { $ne: 'Rejected' },
      createdAt: { $gte: new Date(year, 0, 1), $lt: new Date(year + 1, 0, 1) }
    });
    const totalEncashedThisYear = currentYearRequests.reduce((sum, r) => sum + r.requestedDays, 0);
    if (totalEncashedThisYear + requestedDays > 15) {
      return res.status(400).json({ error: 'Policy rule violation: Maximum encashable limit is 15 days per year.' });
    }

    // 7. Duplicate pending request verification
    const duplicate = await LeaveEncashment.findOne({ employeeId, leaveType: leaveTypeId, status: 'Pending' });
    if (duplicate) {
      return res.status(400).json({ error: 'Duplicate request: You already have a pending encashment request for this leave type.' });
    }

    // Payout calculation (Basic Salary / 30)
    const basicSalary = employee.financial?.basicSalary || 0;
    const perDaySalary = basicSalary / 30;
    const estimatedAmount = Math.round(perDaySalary * requestedDays);

    const newRequest = new LeaveEncashment({
      organisationId: orgId,
      employeeId,
      leaveType: leaveTypeId,
      requestedDays,
      approvedDays: 0,
      estimatedAmount,
      actualAmount: 0,
      paymentMethod,
      status: 'Pending'
    });

    await newRequest.save();

    // Create Audit Log for request creation
    await AuditLog.create({
      organisationId: orgId,
      employeeId,
      action: 'Requested Leave Encashment',
      newStatus: 'Pending',
      createdBy: req.user._id
    });

    res.status(201).json({ success: true, request: newRequest });
  } catch (err) {
    res.status(500).json({ error: 'Error requesting encashment', details: err.message });
  }
};

// Approve leave encashment (admin)
exports.approveEncashment = async (req, res) => {
  try {
    const orgId = req.user.organisationId || req.user.organizationId;
    const reqId = req.params.id;

    const request = await LeaveEncashment.findOne({ _id: reqId, organisationId: orgId });
    if (!request) {
      return res.status(404).json({ error: 'Encashment request not found.' });
    }
    if (request.status !== 'Pending') {
      return res.status(400).json({ error: 'Request is already processed.' });
    }

    // Deduct leave balance
    const year = new Date().getFullYear();
    const balance = await LeaveBalance.findOne({
      organisationId: orgId,
      employeeId: request.employeeId,
      leaveType: request.leaveType,
      year
    });
    if (!balance || balance.balance < request.requestedDays) {
      return res.status(400).json({ error: 'Insufficient leave balance to approve this request.' });
    }

    balance.balance -= request.requestedDays;
    balance.used += request.requestedDays;
    await balance.save();

    // Calculate final actual amount
    const employee = await Employee.findById(request.employeeId);
    const basicSalary = employee.financial?.basicSalary || 0;
    const perDaySalary = basicSalary / 30;
    const actualAmount = Math.round(perDaySalary * request.requestedDays);

    // Update status
    request.status = 'Approved';
    request.approvedDays = request.requestedDays;
    request.actualAmount = actualAmount;
    request.approvedBy = req.user._id;
    request.approvedAt = new Date();
    await request.save();

    // Integrate with payroll adjustments / transactions
    if (request.paymentMethod === 'Next Payroll') {
      const snapshot = await resolveEmployeeSnapshot(orgId, request.employeeId);
      await Adjustment.create({
        organisationId: orgId,
        employee: request.employeeId,
        ...snapshot,
        adjustmentType: 'Addition',
        componentName: 'Leave Encashment Payout',
        componentCode: 'LENC',
        amount: actualAmount,
        isRecurring: false,
        status: 'Active',
        payrollMonth: `${year}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
        reason: `Leave Encashment for ${request.requestedDays} days`
      });
    } else if (request.paymentMethod === 'Separate Check') {
      await Transaction.create({
        organisationId: orgId,
        employeeId: request.employeeId,
        amount: actualAmount,
        paymentMethod: 'Separate Check',
        type: 'Leave Encashment',
        status: 'Pending'
      });
    }

    // Create Audit Log
    await AuditLog.create({
      organisationId: orgId,
      employeeId: request.employeeId,
      action: 'Approved Leave Encashment',
      oldStatus: 'Pending',
      newStatus: 'Approved',
      approvedBy: req.user._id
    });

    res.json({ success: true, request });
  } catch (err) {
    res.status(500).json({ error: 'Error approving request', details: err.message });
  }
};

// Reject leave encashment (admin)
exports.rejectEncashment = async (req, res) => {
  try {
    const orgId = req.user.organisationId || req.user.organizationId;
    const reqId = req.params.id;
    const { rejectedReason } = req.body;

    if (!rejectedReason) {
      return res.status(400).json({ error: 'Rejection reason is required.' });
    }

    const request = await LeaveEncashment.findOne({ _id: reqId, organisationId: orgId });
    if (!request) {
      return res.status(404).json({ error: 'Encashment request not found.' });
    }
    if (request.status !== 'Pending') {
      return res.status(400).json({ error: 'Request is already processed.' });
    }

    request.status = 'Rejected';
    request.rejectedReason = rejectedReason;
    await request.save();

    // Create Audit Log
    await AuditLog.create({
      organisationId: orgId,
      employeeId: request.employeeId,
      action: 'Rejected Leave Encashment',
      oldStatus: 'Pending',
      newStatus: 'Rejected',
      rejectedBy: req.user._id
    });

    res.json({ success: true, request });
  } catch (err) {
    res.status(500).json({ error: 'Error rejecting request', details: err.message });
  }
};

// Get dynamic policy (Employee & Admin)
exports.getPolicy = async (req, res) => {
  try {
    res.json({
      success: true,
      policy: {
        minBalanceRequired: 15,
        maxEncashmentPerYear: 15,
        formula: 'Basic / 30 * Days',
        taxability: 'Taxable',
        allowedLeaveTypes: ['Privilege Leave', 'Earned Leave']
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};
