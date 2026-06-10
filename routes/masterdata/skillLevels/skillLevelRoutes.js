const express = require("express");
const router  = express.Router();

const { protect } = require("../../../middleware/authMiddleware");
const {
  getSkillLevels,
  getSkillLevel,
  createSkillLevel,
  updateSkillLevel,
  deleteSkillLevel,
  toggleSkillLevelStatus,
} = require("../../../controllers/masterdata/skillLevels/skillLevelController");

router.use(protect);

router.route("/")
  .get(getSkillLevels)
  .post(createSkillLevel);

router.route("/:id")
  .get(getSkillLevel)
  .put(updateSkillLevel)
  .delete(deleteSkillLevel);

router.patch("/:id/toggle", toggleSkillLevelStatus);

module.exports = router;
