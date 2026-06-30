const express = require("express");
const router = express.Router();
const { protect } = require("../../middleware/authMiddleware");
const {
  getHolidays,
  createHoliday,
  deleteHoliday
} = require("../../controllers/attendance/holidayController");

router.use(protect);

router.get("/", getHolidays);
router.post("/", createHoliday);
router.delete("/:id", deleteHoliday);

module.exports = router;
