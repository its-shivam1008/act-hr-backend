const express = require("express");
const router  = express.Router();
const { protect } = require("../../../middleware/authMiddleware");
const {
  getGrades, getGrade,
  createGrade, updateGrade, deleteGrade, toggleGradeStatus,
} = require("../../../controllers/masterdata/grades/gradeController");

router.use(protect);

router.route("/")
  .get(getGrades)
  .post(createGrade);

router.route("/:id")
  .get(getGrade)
  .put(updateGrade)
  .delete(deleteGrade);

router.patch("/:id/toggle", toggleGradeStatus);

module.exports = router;
