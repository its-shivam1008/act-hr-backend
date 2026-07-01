const Onboarding = require("../../models/recruitment/Onboarding");
const Employee = require("../../models/Employee");

// GET /api/recruitment/onboarding
const getOnboardings = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const { status, page = 1, limit = 20 } = req.query;
    const query = { organisationId: orgId };
    if (status && status !== "All") query.status = status;
    const total = await Onboarding.countDocuments(query);
    const data = await Onboarding.find(query).sort({ createdAt: -1 }).skip((page - 1) * Number(limit)).limit(Number(limit)).lean();
    res.json({ success: true, total, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/recruitment/onboarding/:id
const getOnboarding = async (req, res) => {
  try {
    const doc = await Onboarding.findOne({ _id: req.params.id, organisationId: req.user.organisationId }).lean();
    if (!doc) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/recruitment/onboarding/:id
const updateOnboarding = async (req, res) => {
  try {
    const doc = await Onboarding.findOneAndUpdate(
      { _id: req.params.id, organisationId: req.user.organisationId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!doc) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/recruitment/onboarding/:id/checklist/:itemId
const updateChecklistItem = async (req, res) => {
  try {
    const doc = await Onboarding.findOne({ _id: req.params.id, organisationId: req.user.organisationId });
    if (!doc) return res.status(404).json({ success: false, message: "Not found" });

    const item = doc.checklist.id(req.params.itemId);
    if (!item) return res.status(404).json({ success: false, message: "Checklist item not found" });

    Object.assign(item, req.body);
    if (req.body.status === "Completed" && !item.completedAt) item.completedAt = new Date();

    // Auto-compute overall onboarding status
    const total = doc.checklist.length;
    const completed = doc.checklist.filter(i => i.status === "Completed" || i.status === "Skipped").length;
    if (completed === total) doc.status = "Completed";
    else if (completed > 0) doc.status = "In Progress";

    await doc.save();
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/recruitment/onboarding/:id/activate
// INTERCONNECTION: Completed onboarding → creates Active Employee record
const activateEmployee = async (req, res) => {
  try {
    const doc = await Onboarding.findOne({ _id: req.params.id, organisationId: req.user.organisationId });
    if (!doc) return res.status(404).json({ success: false, message: "Not found" });
    if (doc.status !== "Completed") {
      return res.status(400).json({ success: false, message: "Onboarding must be Completed before activating" });
    }

    // Build employee from onboarding + self-service data
    const selfData = doc.selfServiceData || {};
    const employee = await Employee.create({
      organisationId: doc.organisationId,
      personalInfo: {
        firstName: (selfData.firstName || doc.candidateName?.split(" ")[0] || ""),
        lastName: (selfData.lastName || doc.candidateName?.split(" ").slice(1).join(" ") || ""),
        workEmail: selfData.workEmail || doc.candidateEmail,
        phone: selfData.phone,
        gender: selfData.gender,
        dateOfBirth: selfData.dateOfBirth,
      },
      employment: {
        designation: doc.designation,
        designationName: doc.designationName,
        grade: doc.grade,
        gradeName: doc.gradeName,
        department: doc.department,
        departmentName: doc.departmentName,
        workLocation: doc.location,
        workLocationName: doc.locationName,
        dateOfJoining: doc.joiningDate,
        reportingManager: doc.reportingManager,
        status: "Active",
      },
      financial: { ctc: doc.annualCTC },
    });

    doc.employeeId = employee._id;
    doc.activatedAt = new Date();
    await doc.save();

    res.json({ success: true, message: "Employee activated successfully", employee, onboarding: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/recruitment/onboarding/:id/self-service
// New hire submits personal details via self-service portal
const submitSelfService = async (req, res) => {
  try {
    const doc = await Onboarding.findOne({ _id: req.params.id, organisationId: req.user.organisationId });
    if (!doc) return res.status(404).json({ success: false, message: "Not found" });
    doc.selfServiceData = req.body;
    doc.selfServiceStatus = "Completed";
    doc.selfServiceFilledAt = new Date();
    await doc.save();
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getOnboardings, getOnboarding, updateOnboarding, updateChecklistItem, activateEmployee, submitSelfService };
