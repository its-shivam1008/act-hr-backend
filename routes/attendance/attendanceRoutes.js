const express = require("express");
const router = express.Router();
const { protect } = require("../../middleware/authMiddleware");
const {
  getTakeAttendanceState,
  submitAttendance,
  getMusterRoll
} = require("../../controllers/attendance/attendanceController");
const nightShiftController = require("../../controllers/attendance/nightShiftController");

router.use(protect);

router.get("/state", getTakeAttendanceState);
router.post("/submit", submitAttendance);
router.get("/muster-roll", getMusterRoll);

// Night Shift Rules
router.get("/night-shift-policy", nightShiftController.getPolicy);
router.put("/night-shift-policy", nightShiftController.updatePolicy);

module.exports = router;
