const express = require("express");
const router = express.Router();
const { protect } = require("../../middleware/authMiddleware");
const {
  getShifts,
  getShift,
  createShift,
  updateShift,
  deleteShift
} = require("../../controllers/attendance/shiftController");

router.use(protect);

router.get("/", getShifts);
router.get("/:id", getShift);
router.post("/", createShift);
router.put("/:id", updateShift);
router.delete("/:id", deleteShift);

module.exports = router;
