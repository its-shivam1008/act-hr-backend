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

// GET /api/recruitment/requisitions
const getRequisitions = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const { status, search, page = 1, limit = 20 } = req.query;
    const query = { organisationId: orgId };
    if (status && status !== "All") query.status = status;
    if (search) {
      const s = new RegExp(search, "i");
      query.$or = [{ title: s }, { departmentName: s }, { requisitionId: s }];
    }
    const total = await JobRequisition.countDocuments(query);
    const data = await JobRequisition.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * Number(limit))
      .limit(Number(limit))
      .lean();
    res.json({ success: true, total, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/recruitment/requisitions/:id
const getRequisition = async (req, res) => {
  try {
    const doc = await JobRequisition.findOne({ _id: req.params.id, organisationId: req.user.organisationId }).lean();
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

// POST /api/recruitment/requisitions
const createRequisition = async (req, res) => {
  try {
    const orgId = req.user.organisationId;
    const cleanedBody = cleanEmptyStrings(req.body);
    const names = await resolveNames(cleanedBody);
    const doc = await JobRequisition.create({
      ...cleanedBody,
      ...names,
      organisationId: orgId,
      requestorName: req.user.name || req.user.email,
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/recruitment/requisitions/:id
const updateRequisition = async (req, res) => {
  try {
    const cleanedBody = cleanEmptyStrings(req.body);
    const names = await resolveNames(cleanedBody);
    const doc = await JobRequisition.findOneAndUpdate(
      { _id: req.params.id, organisationId: req.user.organisationId },
      { ...cleanedBody, ...names },
      { new: true, runValidators: true }
    );
    if (!doc) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/recruitment/requisitions/:id/approve
const approveRequisition = async (req, res) => {
  try {
    const { action, comments } = req.body; // action: 'approve' | 'reject'
    const status = action === "approve" ? "Approved" : "Rejected";
    const doc = await JobRequisition.findOneAndUpdate(
      { _id: req.params.id, organisationId: req.user.organisationId },
      { status, approvalComments: comments, approvedAt: new Date() },
      { new: true }
    );
    if (!doc) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/recruitment/requisitions/:id/post
const postRequisition = async (req, res) => {
  try {
    const doc = await JobRequisition.findOneAndUpdate(
      { _id: req.params.id, organisationId: req.user.organisationId, status: "Approved" },
      { status: "Open", postedAt: new Date() },
      { new: true }
    );
    if (!doc) return res.status(404).json({ success: false, message: "Not found or not approved" });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/recruitment/requisitions/:id
const deleteRequisition = async (req, res) => {
  try {
    const doc = await JobRequisition.findOneAndDelete({ _id: req.params.id, organisationId: req.user.organisationId });
    if (!doc) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getRequisitions, getRequisition, createRequisition, updateRequisition, approveRequisition, postRequisition, deleteRequisition };
