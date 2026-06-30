const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Employee = require('../models/Employee');
const LeaveType = require('../models/leaveModels/LeaveType');
const LeaveBalance = require('../models/leaveModels/LeaveBalance');

async function initBalances() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    const currentYear = new Date().getFullYear();
    const employees = await Employee.find({});
    
    for (const emp of employees) {
      if (!emp.organisationId) continue;
      
      const leaveTypes = await LeaveType.find({ organisationId: emp.organisationId });
      
      for (const type of leaveTypes) {
        // Upsert balance
        await LeaveBalance.findOneAndUpdate(
          { 
            organisationId: emp.organisationId, 
            employeeId: emp._id, 
            leaveType: type._id, 
            year: currentYear 
          },
          {
            $setOnInsert: {
              total: type.daysPerYear,
              used: 0,
              balance: type.daysPerYear
            }
          },
          { upsert: true, new: true }
        );
      }
    }
    console.log('Leave balances initialized successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Init failed:', err);
    process.exit(1);
  }
}

initBalances();
