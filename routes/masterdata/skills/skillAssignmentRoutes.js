const express = require("express");
const router = express.Router();
const { protect } = require("../../../middleware/authMiddleware");
const {
  getAssignments,
  createAssignment,
  deleteAssignment,
} = require("../../../controllers/masterdata/skills/skillAssignmentController");

router.use(protect);

router.get("/", getAssignments);
router.post("/", createAssignment);
router.delete("/:id", deleteAssignment);

module.exports = router;
