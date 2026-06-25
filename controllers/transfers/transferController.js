const Transfer = require("../../models/transferModels/Transfer");
const Employee = require("../../models/Employee");
const Department = require("../../models/departmentModels/Department");
const Location = require("../../models/locationModels/Location");
const Designation = require("../../models/designationModels/Designation");
const Grade = require("../../models/gradeModels/Grade");
const mongoose = require("mongoose");

// Initiate a transfer request
exports.initiateTransfer = async (req, res) => {
  try {
    const { employeeId, type, proposedRef, effectiveDate, reason, salaryIncreasePercentage } = req.body;
    const orgId = req.user.organisationId;

    if (!employeeId || !type || !proposedRef || !effectiveDate) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const employee = await Employee.findOne({ _id: employeeId, organisationId: orgId });
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    let currentValue = "";
    let currentRef = null;
    let proposedValue = "";

    // Resolve current and proposed values based on transfer type
    if (type === "Department") {
      currentRef = employee.employment?.department || null;
      currentValue = employee.employment?.departmentName || "Unassigned";

      const proposedDept = await Department.findOne({ _id: proposedRef, organisationId: orgId });
      if (!proposedDept) return res.status(404).json({ success: false, message: "Proposed Department not found" });
      proposedValue = proposedDept.name;

    } else if (type === "Location") {
      currentRef = employee.employment?.workLocation || null;
      currentValue = employee.employment?.workLocationName || "Unassigned";

      const proposedLoc = await Location.findOne({ _id: proposedRef, organisationId: orgId });
      if (!proposedLoc) return res.status(404).json({ success: false, message: "Proposed Location not found" });
      proposedValue = proposedLoc.name;

    } else if (type === "Role") {
      currentRef = employee.employment?.designation || null;
      currentValue = employee.employment?.designationName || "Unassigned";

      const proposedDes = await Designation.findOne({ _id: proposedRef, organisationId: orgId });
      if (!proposedDes) return res.status(404).json({ success: false, message: "Proposed Designation not found" });
      proposedValue = proposedDes.name;

    } else if (type === "Grade") {
      currentRef = employee.employment?.grade || null;
      currentValue = employee.employment?.gradeName || "Unassigned";

      const proposedGrade = await Grade.findOne({ _id: proposedRef, organisationId: orgId });
      if (!proposedGrade) return res.status(404).json({ success: false, message: "Proposed Grade not found" });
      proposedValue = proposedGrade.name;
    } else {
      return res.status(400).json({ success: false, message: "Invalid transfer type" });
    }

    const name = `${employee.personalInfo?.firstName || ""} ${employee.personalInfo?.lastName || ""}`.trim();
    const idCode = employee.personalInfo?.employeeId || "";

    const transfer = new Transfer({
      organisationId: orgId,
      employee: employeeId,
      employeeName: name,
      employeeIdCode: idCode,
      type,
      currentValue,
      proposedValue,
      currentRef,
      proposedRef,
      effectiveDate,
      reason,
      salaryIncreasePercentage: salaryIncreasePercentage || 0,
      initiator: `${req.user.firstName || ""} ${req.user.lastName || ""}`.trim() || "System"
    });

    await transfer.save();
    return res.status(201).json({ success: true, data: transfer });
  } catch (error) {
    console.error("[InitiateTransfer]", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Fetch transfer requests
exports.getTransfers = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const { status, type, search } = req.query;

    const query = { organisationId: orgId };
    if (status) {
      query.status = status;
    }
    if (type) {
      query.type = type;
    }
    if (search) {
      query.$or = [
        { employeeName: new RegExp(search, "i") },
        { employeeIdCode: new RegExp(search, "i") }
      ];
    }

    const transfers = await Transfer.find(query).sort({ createdAt: -1 });
    return res.json({ success: true, data: transfers });
  } catch (error) {
    console.error("[GetTransfers]", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Approve transfer request
exports.approveTransfer = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const transfer = await Transfer.findOne({ _id: req.params.id, organisationId: orgId });

    if (!transfer) {
      return res.status(404).json({ success: false, message: "Transfer request not found" });
    }
    if (transfer.status !== "Pending") {
      return res.status(400).json({ success: false, message: "Transfer is already " + transfer.status });
    }

    const employee = await Employee.findOne({ _id: transfer.employee, organisationId: orgId });
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    // Apply change to employee record
    if (transfer.type === "Department") {
      if (!employee.employment) employee.employment = {};
      employee.employment.department = transfer.proposedRef;
      employee.employment.departmentName = transfer.proposedValue;
    } else if (transfer.type === "Location") {
      if (!employee.employment) employee.employment = {};
      employee.employment.workLocation = transfer.proposedRef;
      employee.employment.workLocationName = transfer.proposedValue;

      // Update employee address state based on new location state for PT slab changes
      const loc = await Location.findById(transfer.proposedRef);
      if (loc && loc.state) {
        if (!employee.address) employee.address = {};
        employee.address.state = loc.state;
      }
    } else if (transfer.type === "Role") {
      if (!employee.employment) employee.employment = {};
      employee.employment.designation = transfer.proposedRef;
      employee.employment.designationName = transfer.proposedValue;
    } else if (transfer.type === "Grade") {
      if (!employee.employment) employee.employment = {};
      employee.employment.grade = transfer.proposedRef;
      employee.employment.gradeName = transfer.proposedValue;

      // Apply automatic salary revision (e.g. 10% increase basic, hra, ctc, etc.)
      const percentage = transfer.salaryIncreasePercentage || 10;
      if (employee.financial) {
        const factor = 1 + (percentage / 100);
        if (employee.financial.basicSalary) employee.financial.basicSalary = Math.round(employee.financial.basicSalary * factor);
        if (employee.financial.hra) employee.financial.hra = Math.round(employee.financial.hra * factor);
        if (employee.financial.da) employee.financial.da = Math.round(employee.financial.da * factor);
        if (employee.financial.ctc) employee.financial.ctc = Math.round(employee.financial.ctc * factor);
      }
      transfer.payrollRevisionTriggered = true;
    }

    // Mark transfer approved
    transfer.status = "Approved";
    transfer.approvedBy = `${req.user.firstName || ""} ${req.user.lastName || ""}`.trim() || "Manager";
    transfer.approvalDate = new Date();

    await employee.save();
    await transfer.save();

    return res.json({ success: true, message: "Transfer approved successfully", data: transfer });
  } catch (error) {
    console.error("[ApproveTransfer]", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Reject transfer request
exports.rejectTransfer = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const transfer = await Transfer.findOne({ _id: req.params.id, organisationId: orgId });

    if (!transfer) {
      return res.status(404).json({ success: false, message: "Transfer request not found" });
    }
    if (transfer.status !== "Pending") {
      return res.status(400).json({ success: false, message: "Transfer is already " + transfer.status });
    }

    transfer.status = "Rejected";
    transfer.approvedBy = `${req.user.firstName || ""} ${req.user.lastName || ""}`.trim() || "Manager";
    transfer.approvalDate = new Date();

    await transfer.save();
    return res.json({ success: true, message: "Transfer rejected successfully", data: transfer });
  } catch (error) {
    console.error("[RejectTransfer]", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Calculate mid-month payroll split for a specific employee and month
exports.getPayrollSplit = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const { employeeId } = req.params;
    const { year, month } = req.query; // 1-indexed month (1 = Jan, 12 = Dec)

    if (!year || !month) {
      return res.status(400).json({ success: false, message: "Year and month query parameters are required" });
    }

    const emp = await Employee.findOne({ _id: employeeId, organisationId: orgId });
    if (!emp) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    const y = parseInt(year);
    const m = parseInt(month) - 1; // 0-indexed for Date
    const daysInMonth = new Date(y, m + 1, 0).getDate();

    // Find if there was any transfer approved during this month
    const startOfMonth = new Date(y, m, 1);
    const endOfMonth = new Date(y, m, daysInMonth, 23, 59, 59);

    const transfers = await Transfer.find({
      employee: employeeId,
      organisationId: orgId,
      status: "Approved",
      effectiveDate: { $gte: startOfMonth, $lte: endOfMonth }
    }).sort({ effectiveDate: 1 });

    const basicSalary = emp.financial?.basicSalary || 0;
    const hra = emp.financial?.hra || 0;
    const ctc = emp.financial?.ctc || 0;

    if (transfers.length === 0) {
      // No transfer in this month: return normal salary
      return res.json({
        success: true,
        hasSplit: false,
        days: daysInMonth,
        breakdown: {
          basicSalary,
          hra,
          ctc,
          netEarning: basicSalary + hra
        }
      });
    }

    // Calculate splits
    const transfer = transfers[0]; // Assume single split for simplicity
    const transferDay = new Date(transfer.effectiveDate).getDate(); // e.g. 15th
    const oldDays = transferDay - 1; // Days before effective date: 14 days
    const newDays = daysInMonth - oldDays; // Days with new salary: 16 days

    // Calculate old salary structure from employee's current state and reverse the increase percentage
    const increaseFactor = 1 + ((transfer.salaryIncreasePercentage || 10) / 100);
    const oldBasic = transfer.type === "Grade" ? Math.round(basicSalary / increaseFactor) : basicSalary;
    const oldHra = transfer.type === "Grade" ? Math.round(hra / increaseFactor) : hra;
    const oldCtc = transfer.type === "Grade" ? Math.round(ctc / increaseFactor) : ctc;

    const oldPeriodBasic = Math.round((oldBasic / daysInMonth) * oldDays);
    const oldPeriodHra = Math.round((oldHra / daysInMonth) * oldDays);

    const newPeriodBasic = Math.round((basicSalary / daysInMonth) * newDays);
    const newPeriodHra = Math.round((hra / daysInMonth) * newDays);

    return res.json({
      success: true,
      hasSplit: true,
      splitDetails: {
        transferType: transfer.type,
        effectiveDate: transfer.effectiveDate,
        totalDays: daysInMonth,
        oldPeriod: {
          days: oldDays,
          monthlyBasic: oldBasic,
          monthlyHra: oldHra,
          earnedBasic: oldPeriodBasic,
          earnedHra: oldPeriodHra
        },
        newPeriod: {
          days: newDays,
          monthlyBasic: basicSalary,
          monthlyHra: hra,
          earnedBasic: newPeriodBasic,
          earnedHra: newPeriodHra
        }
      },
      breakdown: {
        basicSalary: oldPeriodBasic + newPeriodBasic,
        hra: oldPeriodHra + newPeriodHra,
        ctc: Math.round(((oldCtc / daysInMonth) * oldDays) + ((ctc / daysInMonth) * newDays)),
        netEarning: (oldPeriodBasic + newPeriodBasic) + (oldPeriodHra + newPeriodHra)
      }
    });

  } catch (error) {
    console.error("[GetPayrollSplit]", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};
