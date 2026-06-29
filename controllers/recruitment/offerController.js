const Offer = require("../../models/recruitment/Offer");
const Onboarding = require("../../models/recruitment/Onboarding");
const Candidate = require("../../models/recruitment/Candidate");
const JobRequisition = require("../../models/recruitment/JobRequisition");
const Department = require("../../models/departmentModels/Department");
const Designation = require("../../models/designationModels/Designation");
const Grade = require("../../models/gradeModels/Grade");
const Location = require("../../models/locationModels/Location");
const mongoose = require("mongoose");

// Helper: resolve master data names
async function resolveNames(body) {
  const extra = {};
  const tryName = async (Model, id, key) => {
    if (!id || !mongoose.Types.ObjectId.isValid(String(id))) return;
    const doc = await Model.findById(id).select("name").lean();
    if (doc) extra[key] = doc.name || "";
  };
  await Promise.all([
    tryName(Department, body.department, "departmentName"),
    tryName(Designation, body.designation, "designationName"),
    tryName(Grade, body.grade, "gradeName"),
    tryName(Location, body.location, "locationName"),
  ]);
  return extra;
}

// GET /api/recruitment/offers
const getOffers = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const { status, page = 1, limit = 20 } = req.query;
    const query = { organisationId: orgId };
    if (status && status !== "All") query.status = status;
    const total = await Offer.countDocuments(query);
    const data = await Offer.find(query).sort({ createdAt: -1 }).skip((page - 1) * Number(limit)).limit(Number(limit)).lean();
    res.json({ success: true, total, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/recruitment/offers/:id
const getOffer = async (req, res) => {
  try {
    const doc = await Offer.findOne({ _id: req.params.id, organisationId: req.user.organisationId }).lean();
    if (!doc) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const cleanEmptyStrings = (body) => {
  if (!body) return body;
  const clean = { ...body };
  for (const key in clean) {
    if (clean[key] === "") {
      clean[key] = null;
    }
  }
  return clean;
};

// POST /api/recruitment/offers
// Auto-populate grade, CTC, joining date from requisition
const createOffer = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const cleanedBody = cleanEmptyStrings(req.body);
    const body = { ...cleanedBody, organisationId: orgId, createdBy: req.user._id };

    // Pull candidate info
    if (body.candidate && !body.candidateName) {
      const cand = await Candidate.findById(body.candidate).lean();
      if (cand) {
        body.candidateName = `${cand.firstName} ${cand.lastName || ""}`.trim();
        body.candidateEmail = cand.email;
      }
    }

    // Auto-populate from requisition
    if (body.requisition) {
      const req_doc = await JobRequisition.findById(body.requisition).lean();
      if (req_doc) {
        body.requisitionTitle = req_doc.title;
        if (!body.designation) body.designation = req_doc.designation;
        if (!body.grade) body.grade = req_doc.grade;
        if (!body.department) body.department = req_doc.department;
        if (!body.location) body.location = req_doc.location;
        // CTC band — use midpoint as starting CTC
        if (!body.annualCTC && req_doc.ctcBandMin && req_doc.ctcBandMax) {
          body.annualCTC = Math.round((req_doc.ctcBandMin + req_doc.ctcBandMax) / 2);
        }
      }
    }

    // Resolve names for department, designation, grade, location
    const extraNames = await resolveNames(body);
    const doc = await Offer.create({ ...body, ...extraNames });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/recruitment/offers/:id
const updateOffer = async (req, res) => {
  try {
    const cleanedBody = cleanEmptyStrings(req.body);
    const extraNames = await resolveNames(cleanedBody);
    const doc = await Offer.findOneAndUpdate(
      { _id: req.params.id, organisationId: req.user.organisationId },
      { ...cleanedBody, ...extraNames },
      { new: true, runValidators: true }
    );
    if (!doc) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/recruitment/offers/:id/send
const sendOffer = async (req, res) => {
  try {
    const doc = await Offer.findOneAndUpdate(
      { _id: req.params.id, organisationId: req.user.organisationId },
      { status: "Sent", sentAt: new Date() },
      { new: true }
    );
    if (!doc) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/recruitment/offers/:id/respond
// action: 'accept' | 'decline'
const respondOffer = async (req, res) => {
  try {
    const { action, declineReason } = req.body;
    const status = action === "accept" ? "Accepted" : "Declined";
    const offer = await Offer.findOneAndUpdate(
      { _id: req.params.id, organisationId: req.user.organisationId },
      { status, respondedAt: new Date(), declineReason: declineReason || "" },
      { new: true }
    );
    if (!offer) return res.status(404).json({ success: false, message: "Not found" });

    // If accepted → create onboarding record
    if (action === "accept") {
      const onb = await Onboarding.create({
        organisationId: offer.organisationId,
        offer: offer._id,
        candidate: offer.candidate,
        candidateName: offer.candidateName,
        candidateEmail: offer.candidateEmail,
        requisitionTitle: offer.requisitionTitle,
        joiningDate: offer.joiningDate,
        designation: offer.designation,
        designationName: offer.designationName,
        grade: offer.grade,
        gradeName: offer.gradeName,
        department: offer.department,
        departmentName: offer.departmentName,
        location: offer.location,
        locationName: offer.locationName,
        annualCTC: offer.annualCTC,
        createdBy: req.user._id,
      });
      offer.onboardingId = onb._id;
      offer.status = "Onboarding";
      await offer.save();

      // Update candidate status
      await Candidate.findByIdAndUpdate(offer.candidate, { status: "Hired" });

      return res.json({ success: true, data: offer, onboarding: onb });
    }

    res.json({ success: true, data: offer });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/recruitment/offers/:id
const deleteOffer = async (req, res) => {
  try {
    const doc = await Offer.findOneAndDelete({ _id: req.params.id, organisationId: req.user.organisationId });
    if (!doc) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getOffers, getOffer, createOffer, updateOffer, sendOffer, respondOffer, deleteOffer };
