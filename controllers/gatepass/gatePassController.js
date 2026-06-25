const GatePass = require("../../models/gatepass/GatePass");
const Labour = require("../../models/Labour");
const Employee = require("../../models/Employee");

// Helper to generate a unique Pass ID
const generatePassId = async (passType) => {
  const prefix = passType === "Worker Pass" ? "WP" : "VP";
  const year = new Date().getFullYear();
  const count = await GatePass.countDocuments();
  const sequence = String(count + 1).padStart(4, "0");
  return `${prefix}-${year}-${sequence}`;
};

// 0. Get persons list (Labours + Employees) for Worker Pass dropdown
exports.getPersonsList = async (req, res) => {
  try {
    const organisationId = req.user.organisationId;
    const labours = await Labour.find({ organisationId }, {
      "personalInfo.firstName": 1, "personalInfo.lastName": 1,
      "employment.climsId": 1, "employment.formA": 1,
      "employment.departmentName": 1, "employment.agencyName": 1,
      "employment.designationName": 1
    });
    const employees = await Employee.find({ organisationId }, {
      "personalInfo.firstName": 1, "personalInfo.lastName": 1,
      "personalInfo.employeeId": 1, "employment.departmentName": 1,
      "employment.designationName": 1
    });

    const persons = [
      ...labours.map(l => ({
        _id: l._id,
        name: `${l.personalInfo?.firstName || ""} ${l.personalInfo?.lastName || ""}`.trim(),
        personType: "Labour",
        identifier: l.employment?.climsId || l.employment?.formA || "",
        formA: l.employment?.formA || "",
        climsId: l.employment?.climsId || "",
        companyName: l.employment?.agencyName || "",
        departmentName: l.employment?.departmentName || "",
        tradeOrRole: l.employment?.designationName || ""
      })),
      ...employees.map(e => ({
        _id: e._id,
        name: `${e.personalInfo?.firstName || ""} ${e.personalInfo?.lastName || ""}`.trim(),
        personType: "Employee",
        identifier: e.personalInfo?.employeeId || "",
        formA: "",
        climsId: "",
        companyName: "",
        departmentName: e.employment?.departmentName || "",
        tradeOrRole: e.employment?.designationName || ""
      }))
    ];
    return res.json({ success: true, data: persons });
  } catch (error) {
    console.error("getPersonsList error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// 1. Get all passes
exports.getGatePasses = async (req, res) => {
  try {
    const organisationId = req.user.organisationId;
    const passes = await GatePass.find({ organisationId }).sort({ createdAt: -1 });
    return res.json({ success: true, data: passes });
  } catch (error) {
    console.error("Error fetching gate passes:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const AccessZone = require("../../models/gatepass/AccessZone");

// 2. Public view of a single pass details (for scanned QR code, no auth required)
exports.getPublicGatePass = async (req, res) => {
  try {
    const { passId } = req.params;
    const pass = await GatePass.findOne({ passId });
    if (!pass) {
      return res.status(404).json({ success: false, message: "Gate pass not found" });
    }
    // Fetch associated access zones to get their color markers
    const zones = await AccessZone.find({ organisationId: pass.organisationId });
    return res.json({ success: true, data: pass, zones });
  } catch (error) {
    console.error("Error fetching public gate pass:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// 3. Create a gate pass
exports.createGatePass = async (req, res) => {
  try {
    const organisationId = req.user.organisationId;
    const {
      passType, personType, personId, name, companyName,
      purpose, hostName, contactNumber, expiryDate,
      accessZones, tradeOrRole, remarks
    } = req.body;

    if (!passType || !personType || !name || !expiryDate) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const passId = await generatePassId(passType);
    
    // Set a default avatar if none exists
    const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff`;

    const newPass = new GatePass({
      organisationId,
      passId,
      passType,
      personType,
      personId: personId || null,
      name,
      companyName: companyName || "",
      purpose: purpose || "",
      hostName: hostName || "",
      contactNumber: contactNumber || "",
      expiryDate: new Date(expiryDate),
      accessZones: accessZones || [],
      tradeOrRole: tradeOrRole || "",
      remarks: remarks || "",
      avatar
    });

    await newPass.save();
    return res.status(201).json({ success: true, data: newPass });
  } catch (error) {
    console.error("Error creating gate pass:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// 4. Update status
exports.updateGatePassStatus = async (req, res) => {
  try {
    const organisationId = req.user.organisationId;
    const { id } = req.params;
    const { status } = req.body;

    if (!["Active", "Expired", "Revoked"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const pass = await GatePass.findOneAndUpdate(
      { _id: id, organisationId },
      { status },
      { new: true }
    );

    if (!pass) {
      return res.status(404).json({ success: false, message: "Gate pass not found" });
    }

    return res.json({ success: true, data: pass });
  } catch (error) {
    console.error("Error updating status:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// 4b. Full update a gate pass
exports.updateGatePass = async (req, res) => {
  try {
    const organisationId = req.user.organisationId;
    const { id } = req.params;
    const updates = req.body;
    if (updates.expiryDate) updates.expiryDate = new Date(updates.expiryDate);
    const pass = await GatePass.findOneAndUpdate(
      { _id: id, organisationId },
      { $set: updates },
      { new: true }
    );
    if (!pass) return res.status(404).json({ success: false, message: "Gate pass not found" });
    return res.json({ success: true, data: pass });
  } catch (error) {
    console.error("updateGatePass error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// 5. Delete a gate pass
exports.deleteGatePass = async (req, res) => {
  try {
    const organisationId = req.user.organisationId;
    const { id } = req.params;

    const pass = await GatePass.findOneAndDelete({ _id: id, organisationId });
    if (!pass) {
      return res.status(404).json({ success: false, message: "Gate pass not found" });
    }

    return res.json({ success: true, message: "Gate pass deleted successfully" });
  } catch (error) {
    console.error("Error deleting gate pass:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
