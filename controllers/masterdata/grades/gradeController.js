const Grade = require("../../../models/gradeModels/Grade");
const Designation = require("../../../models/designationModels/Designation");

const getOrgId = (req) => req.user?.organisationId;

// ── GET /api/masterdata/grades ─────────────────────────────────────────────
exports.getGrades = async (req, res) => {
  try {
    const { search = "", isActive } = req.query;
    const filter = { organisationId: getOrgId(req) };

    if (search) {
      filter.$or = [
        { name:            { $regex: search, $options: "i" } },
        { code:            { $regex: search, $options: "i" } },
        { designationName: { $regex: search, $options: "i" } },
      ];
    }
    if (isActive !== undefined) filter.isActive = isActive === "true";

    const grades = await Grade.find(filter)
      .populate("designation", "name")
      .sort({ name: 1 });

    res.status(200).json({ success: true, count: grades.length, data: grades });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/masterdata/grades/:id ─────────────────────────────────────────
exports.getGrade = async (req, res) => {
  try {
    const grade = await Grade.findOne({ _id: req.params.id, organisationId: getOrgId(req) })
      .populate("designation", "name");
    if (!grade) return res.status(404).json({ success: false, message: "Grade not found" });
    res.status(200).json({ success: true, data: grade });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/masterdata/grades ────────────────────────────────────────────
exports.createGrade = async (req, res) => {
  try {
    const { name, code, designation, designationName, minSalary, maxSalary, description, isActive } = req.body;

    // Auto-resolve designationName if designation ObjectId given but name not
    let resolvedDesignationName = designationName || "";
    if (designation && !resolvedDesignationName) {
      const des = await Designation.findById(designation).lean();
      if (des) resolvedDesignationName = des.name;
    }

    const grade = await Grade.create({
      organisationId: getOrgId(req),
      name,
      code: code || "",
      designation: designation || null,
      designationName: resolvedDesignationName,
      minSalary: minSalary || 0,
      maxSalary: maxSalary || 0,
      description: description || "",
      isActive: isActive !== undefined ? isActive : true,
    });

    res.status(201).json({ success: true, data: grade });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: "A grade with this name already exists in your organisation" });
    }
    res.status(400).json({ success: false, message: err.message });
  }
};

// ── PUT /api/masterdata/grades/:id ─────────────────────────────────────────
exports.updateGrade = async (req, res) => {
  try {
    const allowed = ["name", "code", "designation", "designationName", "minSalary", "maxSalary", "description", "isActive"];
    const updates = {};
    allowed.forEach((key) => { if (req.body[key] !== undefined) updates[key] = req.body[key]; });

    // Auto-resolve designation name if designation id provided
    if (updates.designation && !updates.designationName) {
      const des = await Designation.findById(updates.designation).lean();
      if (des) updates.designationName = des.name;
    }

    const grade = await Grade.findOneAndUpdate(
      { _id: req.params.id, organisationId: getOrgId(req) },
      updates,
      { new: true, runValidators: true }
    ).populate("designation", "name");

    if (!grade) return res.status(404).json({ success: false, message: "Grade not found" });
    res.status(200).json({ success: true, data: grade });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: "A grade with this name already exists in your organisation" });
    }
    res.status(400).json({ success: false, message: err.message });
  }
};

// ── DELETE /api/masterdata/grades/:id ──────────────────────────────────────
exports.deleteGrade = async (req, res) => {
  try {
    const grade = await Grade.findOneAndDelete({ _id: req.params.id, organisationId: getOrgId(req) });
    if (!grade) return res.status(404).json({ success: false, message: "Grade not found" });
    res.status(200).json({ success: true, message: "Grade deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PATCH /api/masterdata/grades/:id/toggle ────────────────────────────────
exports.toggleGradeStatus = async (req, res) => {
  try {
    const grade = await Grade.findOne({ _id: req.params.id, organisationId: getOrgId(req) });
    if (!grade) return res.status(404).json({ success: false, message: "Grade not found" });
    grade.isActive = !grade.isActive;
    await grade.save();
    res.status(200).json({ success: true, data: grade });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
