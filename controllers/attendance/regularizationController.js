const Regularization = require("../../models/attendance/Regularization");
const Employee = require("../../models/Employee");
const DailyAttendance = require("../../models/attendance/DailyAttendance");

// Admin initiates a regularization request for any employee
exports.initiateRegularization = async (req, res) => {
  try {
    const { employeeId, date, requestedIn, requestedOut, reason, remarks } = req.body;
    const orgId = req.user.organisationId;

    if (!employeeId || !date || !requestedIn || !requestedOut || !reason) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const employee = await Employee.findOne({ _id: employeeId, organisationId: orgId });
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    const dateObj = new Date(date);
    const dateString = dateObj.toISOString().split("T")[0];

    // Find if there is an existing DailyAttendance record to show original check-in/out status
    const existingAttendance = await DailyAttendance.findOne({
      organisationId: orgId,
      personId: employeeId,
      dateString
    });

    const checkIn = existingAttendance && existingAttendance.status !== "Absent" ? "09:00 AM" : "-";
    const checkOut = existingAttendance && existingAttendance.status !== "Absent" ? "06:00 PM" : "-";

    const name = `${employee.personalInfo?.firstName || ""} ${employee.personalInfo?.lastName || ""}`.trim();
    const idCode = employee.personalInfo?.employeeId || "";
    const departmentName = employee.employment?.departmentName || "";

    const regularization = new Regularization({
      organisationId: orgId,
      employee: employeeId,
      employeeName: name,
      employeeIdCode: idCode,
      departmentName,
      date: dateObj,
      dateString,
      checkIn,
      checkOut,
      requestedIn,
      requestedOut,
      reason,
      remarks: remarks || "",
      status: "Pending"
    });

    await regularization.save();
    return res.status(201).json({ success: true, data: regularization });
  } catch (error) {
    console.error("[InitiateRegularization]", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Admin fetches all regularization requests
exports.getRegularizations = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const { status, search } = req.query;

    const query = { organisationId: orgId };
    if (status && status !== "All") {
      query.status = status;
    }
    if (search) {
      query.$or = [
        { employeeName: new RegExp(search, "i") },
        { employeeIdCode: new RegExp(search, "i") }
      ];
    }

    const regularizations = await Regularization.find(query).sort({ date: -1 });
    return res.json({ success: true, data: regularizations });
  } catch (error) {
    console.error("[GetRegularizations]", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Admin approves regularization request
exports.approveRegularization = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const reg = await Regularization.findOne({ _id: req.params.id, organisationId: orgId });

    if (!reg) {
      return res.status(404).json({ success: false, message: "Regularization request not found" });
    }
    if (reg.status !== "Pending") {
      return res.status(400).json({ success: false, message: "Request is already " + reg.status });
    }

    // Upsert the DailyAttendance record for this employee on that date
    await DailyAttendance.findOneAndUpdate(
      {
        organisationId: orgId,
        personId: reg.employee,
        dateString: reg.dateString
      },
      {
        organisationId: orgId,
        date: reg.date,
        dateString: reg.dateString,
        personType: "Employee",
        personId: reg.employee,
        name: reg.employeeName,
        employeeId: reg.employeeIdCode,
        departmentName: reg.departmentName,
        status: "Present" // Regularized attendance is marked Present
      },
      { upsert: true, new: true }
    );

    reg.status = "Approved";
    reg.approvedBy = `${req.user.firstName || ""} ${req.user.lastName || ""}`.trim() || "Manager";
    reg.approvalDate = new Date();

    await reg.save();

    return res.json({ success: true, message: "Regularization approved successfully", data: reg });
  } catch (error) {
    console.error("[ApproveRegularization]", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Admin rejects regularization request
exports.rejectRegularization = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const reg = await Regularization.findOne({ _id: req.params.id, organisationId: orgId });

    if (!reg) {
      return res.status(404).json({ success: false, message: "Regularization request not found" });
    }
    if (reg.status !== "Pending") {
      return res.status(400).json({ success: false, message: "Request is already " + reg.status });
    }

    reg.status = "Rejected";
    reg.approvedBy = `${req.user.firstName || ""} ${req.user.lastName || ""}`.trim() || "Manager";
    reg.approvalDate = new Date();

    await reg.save();

    return res.json({ success: true, message: "Regularization request rejected successfully", data: reg });
  } catch (error) {
    console.error("[RejectRegularization]", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};
