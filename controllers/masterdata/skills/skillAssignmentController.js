const SkillAssignment = require("../../../models/skillModels/SkillAssignment");

const getOrgId = (req) => req.user?.organisationId;

// ── GET /api/skill-assignments ─────────────────────────────────────────────────
// Returns all assignments, fully populated with employee name and skill name.
exports.getAssignments = async (req, res) => {
  try {
    const assignments = await SkillAssignment.find({ organisationId: getOrgId(req) })
      .populate({
        path: "employee",
        select: "personalInfo.firstName personalInfo.lastName employeeId",
      })
      .populate({ path: "skill", select: "name" })
      .sort({ createdAt: -1 });

    // Flatten for frontend consumption
    const data = assignments.map((a) => ({
      _id: a._id,
      employeeId: a.employee?._id,
      employeeName:
        [
          a.employee?.personalInfo?.firstName,
          a.employee?.personalInfo?.lastName,
        ]
          .filter(Boolean)
          .join(" ") || a.employee?.employeeId || "Unknown",
      employeeCode: a.employee?.employeeId || "",
      skillId: a.skill?._id,
      skillName: a.skill?.name || "—",
      assignedAt: a.createdAt,
    }));

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/skill-assignments ────────────────────────────────────────────────
// Assigns a skill to an employee. Silently returns existing record if duplicate.
exports.createAssignment = async (req, res) => {
  try {
    const { employeeId, skillId } = req.body;
    if (!employeeId || !skillId) {
      return res
        .status(400)
        .json({ success: false, message: "employeeId and skillId are required" });
    }

    let assignment = await SkillAssignment.findOne({
      organisationId: getOrgId(req),
      employee: employeeId,
      skill: skillId,
    });

    if (assignment) {
      return res
        .status(200)
        .json({ success: true, data: assignment, message: "Already assigned" });
    }

    assignment = await SkillAssignment.create({
      organisationId: getOrgId(req),
      employee: employeeId,
      skill: skillId,
      assignedBy: req.user?._id,
    });

    // Populate for immediate response
    await assignment.populate({ path: "employee", select: "personalInfo.firstName personalInfo.lastName employeeId" });
    await assignment.populate({ path: "skill", select: "name" });

    const data = {
      _id: assignment._id,
      employeeId: assignment.employee?._id,
      employeeName:
        [
          assignment.employee?.personalInfo?.firstName,
          assignment.employee?.personalInfo?.lastName,
        ]
          .filter(Boolean)
          .join(" ") || assignment.employee?.employeeId || "Unknown",
      employeeCode: assignment.employee?.employeeId || "",
      skillId: assignment.skill?._id,
      skillName: assignment.skill?.name || "—",
      assignedAt: assignment.createdAt,
    };

    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE /api/skill-assignments/:id ─────────────────────────────────────────
exports.deleteAssignment = async (req, res) => {
  try {
    const assignment = await SkillAssignment.findOneAndDelete({
      _id: req.params.id,
      organisationId: getOrgId(req),
    });

    if (!assignment) {
      return res
        .status(404)
        .json({ success: false, message: "Assignment not found" });
    }

    res.json({ success: true, message: "Assignment removed" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
