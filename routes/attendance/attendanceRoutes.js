const express = require("express");
const router = express.Router();
const { protect } = require("../../middleware/authMiddleware");
const {
  getTakeAttendanceState,
  submitAttendance,
  getMusterRoll
} = require("../../controllers/attendance/attendanceController");

router.use(protect);

router.get("/state", getTakeAttendanceState);
router.post("/submit", submitAttendance);
router.get("/muster-roll", getMusterRoll);

module.exports = router;
