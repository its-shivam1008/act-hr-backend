const express = require("express");
const router = express.Router();
const { protect } = require("../../../middleware/authMiddleware");
const {
  getSkills,
  createSkill,
  updateSkill,
  deleteSkill,
  toggleSkill,
} = require("../../../controllers/masterdata/skills/skillController");

router.use(protect);

router.get("/", getSkills);
router.post("/", createSkill);
router.put("/:id", updateSkill);
router.delete("/:id", deleteSkill);
router.patch("/:id/toggle", toggleSkill);

module.exports = router;
