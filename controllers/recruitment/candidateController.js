const Candidate = require("../../models/recruitment/Candidate");
const JobRequisition = require("../../models/recruitment/JobRequisition");

// GET /api/recruitment/candidates
const getCandidates = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const { search, status, source, page = 1, limit = 20 } = req.query;
    const query = { organisationId: orgId };
    if (status && status !== "All") query.status = status;
    if (source && source !== "All") query.source = source;
    if (search) {
      const s = new RegExp(search, "i");
      query.$or = [{ firstName: s }, { lastName: s }, { email: s }, { candidateId: s }, { currentEmployer: s }];
    }
    const total = await Candidate.countDocuments(query);
    const data = await Candidate.find(query).sort({ createdAt: -1 }).skip((page - 1) * Number(limit)).limit(Number(limit)).lean();
    res.json({ success: true, total, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/recruitment/candidates/:id
const getCandidate = async (req, res) => {
  try {
    const doc = await Candidate.findOne({ _id: req.params.id, organisationId: req.user.organisationId }).lean();
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

// POST /api/recruitment/candidates
const createCandidate = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const cleanedBody = cleanEmptyStrings(req.body);
    const body = { ...cleanedBody, organisationId: orgId, createdBy: req.user._id };
    // If applying to a requisition, add application entry
    if (body.requisitionId) {
      const req_doc = await JobRequisition.findById(body.requisitionId).lean();
      body.applications = [{
        requisition: body.requisitionId,
        requisitionId: req_doc?.requisitionId,
        requisitionTitle: req_doc?.title,
        stage: "Applied",
      }];
      delete body.requisitionId;
    }
    const doc = await Candidate.create(body);
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, message: "Candidate already exists" });
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/recruitment/candidates/:id
const updateCandidate = async (req, res) => {
  try {
    const cleanedBody = cleanEmptyStrings(req.body);
    const doc = await Candidate.findOneAndUpdate(
      { _id: req.params.id, organisationId: req.user.organisationId },
      cleanedBody,
      { new: true, runValidators: true }
    );
    if (!doc) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/recruitment/candidates/:id/stage
const updateStage = async (req, res) => {
  try {
    const { applicationIndex, stage, rejectionReason } = req.body;
    const doc = await Candidate.findOne({ _id: req.params.id, organisationId: req.user.organisationId });
    if (!doc) return res.status(404).json({ success: false, message: "Not found" });
    const idx = applicationIndex ?? 0;
    if (doc.applications[idx]) {
      doc.applications[idx].stage = stage;
      if (rejectionReason) doc.applications[idx].rejectionReason = rejectionReason;
    }
    if (stage === "Hired") doc.status = "Hired";
    if (stage === "Rejected") doc.status = "Rejected";
    await doc.save();
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/recruitment/candidates/:id
const deleteCandidate = async (req, res) => {
  try {
    const doc = await Candidate.findOneAndDelete({ _id: req.params.id, organisationId: req.user.organisationId });
    if (!doc) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getCandidates, getCandidate, createCandidate, updateCandidate, updateStage, deleteCandidate };
