const LeaveBalance = require('../../models/leaveModels/LeaveBalance');
const LeaveType = require('../../models/leaveModels/LeaveType');
const Employee = require('../../models/Employee');

exports.runMonthlyAccrual = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const year = new Date().getFullYear();
    
    // Find the CL type
    const clType = await LeaveType.findOne({ organisationId: orgId, code: 'CL' });
    if (!clType) return res.status(404).json({ error: 'CL leave type not found' });
    
    // Find all active employees
    const employees = await Employee.find({ 
      organisationId: orgId, 
      'employment.status': { $in: ['Active', 'On Leave'] }
    });
    
    let updatedCount = 0;
    
    for (const emp of employees) {
      const balanceRec = await LeaveBalance.findOne({
        organisationId: orgId,
        employeeId: emp._id,
        leaveType: clType._id,
        year
      });
      
      if (balanceRec) {
        // Accrue 1 day, but respect max limit (e.g. daysPerYear)
        if (balanceRec.total < clType.daysPerYear) {
          balanceRec.total += 1;
          balanceRec.balance += 1;
          await balanceRec.save();
          updatedCount++;
        }
      }
    }
    
    res.json({ message: `Monthly CL Accrual completed. Updated ${updatedCount} employees.` });
  } catch (err) {
    res.status(500).json({ error: 'Error running monthly accrual', details: err.message });
  }
};

exports.runYearlyCarryForward = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const currentYear = new Date().getFullYear();
    const prevYear = currentYear - 1;
    
    const types = await LeaveType.find({ organisationId: orgId });
    const employees = await Employee.find({ 
      organisationId: orgId, 
      'employment.status': { $in: ['Active', 'On Leave'] }
    });
    
    let processedCount = 0;
    
    for (const emp of employees) {
      for (const type of types) {
        if (!type.isCarryForward) continue;
        
        const prevBal = await LeaveBalance.findOne({
          organisationId: orgId,
          employeeId: emp._id,
          leaveType: type._id,
          year: prevYear
        });
        
        if (!prevBal) continue;
        
        let carryForwardDays = prevBal.balance;
        if (type.code === 'SL' && carryForwardDays > 15) {
          carryForwardDays = 15; // Cap SL CF to 15
        } else if (type.maxCarryForward && carryForwardDays > type.maxCarryForward) {
          carryForwardDays = type.maxCarryForward;
        }
        
        if (carryForwardDays > 0) {
          await LeaveBalance.findOneAndUpdate(
            { organisationId: orgId, employeeId: emp._id, leaveType: type._id, year: currentYear },
            {
              $inc: { total: carryForwardDays, balance: carryForwardDays }
            },
            { upsert: true }
          );
        }
      }
      processedCount++;
    }
    
    res.json({ message: `Yearly carry forward processed for ${processedCount} employees.` });
  } catch (err) {
    res.status(500).json({ error: 'Error running yearly carry forward', details: err.message });
  }
};
