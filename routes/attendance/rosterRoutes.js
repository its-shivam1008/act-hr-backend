const express = require("express");
const router = express.Router();
const { protect } = require("../../middleware/authMiddleware");
const {
  getRosters,
  saveRoster
} = require("../../controllers/attendance/rosterController");

router.use(protect);

router.get("/", getRosters);
router.post("/save", saveRoster);

module.exports = router;
