const Interview = require("../../models/recruitment/Interview");
const Candidate = require("../../models/recruitment/Candidate");

// GET /api/recruitment/interviews
const getInterviews = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const { status, candidateId, page = 1, limit = 20 } = req.query;
    const query = { organisationId: orgId };
    if (status && status !== "All") query.status = status;
    if (candidateId) query.candidate = candidateId;
    const total = await Interview.countDocuments(query);
    const data = await Interview.find(query).sort({ scheduledAt: -1 }).skip((page - 1) * Number(limit)).limit(Number(limit)).lean();
    res.json({ success: true, total, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/recruitment/interviews/:id
const getInterview = async (req, res) => {
  try {
    const doc = await Interview.findOne({ _id: req.params.id, organisationId: req.user.organisationId }).lean();
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

// POST /api/recruitment/interviews
const createInterview = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const cleanedBody = cleanEmptyStrings(req.body);
    // Fetch candidate name/email if not provided
    if (cleanedBody.candidate && !cleanedBody.candidateName) {
      const cand = await Candidate.findById(cleanedBody.candidate).lean();
      if (cand) {
        cleanedBody.candidateName = `${cand.firstName} ${cand.lastName || ""}`.trim();
        cleanedBody.candidateEmail = cand.email;
      }
    }
    const doc = await Interview.create({ ...cleanedBody, organisationId: orgId, createdBy: req.user._id });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/recruitment/interviews/:id
const updateInterview = async (req, res) => {
  try {
    const cleanedBody = cleanEmptyStrings(req.body);
    const doc = await Interview.findOneAndUpdate(
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

// PUT /api/recruitment/interviews/:id/feedback
// Panel member submits feedback for their slot
const submitFeedback = async (req, res) => {
  try {
    const { panelIndex, competencies, recommendation, overallComments } = req.body;
    const doc = await Interview.findOne({ _id: req.params.id, organisationId: req.user.organisationId });
    if (!doc) return res.status(404).json({ success: false, message: "Not found" });

    const panel = doc.panelMembers[panelIndex ?? 0];
    if (!panel) return res.status(400).json({ success: false, message: "Panel member not found" });

    // Compute average score
    const rated = (competencies || []).filter(c => c.rating);
    const avgScore = rated.length > 0 ? rated.reduce((s, c) => s + c.rating, 0) / rated.length : 0;

    panel.feedback = {
      competencies: competencies || [],
      averageScore: Math.round(avgScore * 100) / 100,
      recommendation,
      overallComments,
      submittedAt: new Date(),
    };

    // Recompute aggregate score across all panels
    const submitted = doc.panelMembers.filter(p => p.feedback?.averageScore != null);
    if (submitted.length > 0) {
      doc.aggregateScore = Math.round((submitted.reduce((s, p) => s + p.feedback.averageScore, 0) / submitted.length) * 100) / 100;
    }

    await doc.save();
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/recruitment/interviews/:id
const deleteInterview = async (req, res) => {
  try {
    const doc = await Interview.findOneAndDelete({ _id: req.params.id, organisationId: req.user.organisationId });
    if (!doc) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getInterviews, getInterview, createInterview, updateInterview, submitFeedback, deleteInterview };
