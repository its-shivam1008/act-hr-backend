const express = require("express");
const router = express.Router();
const { protect } = require("../../middleware/authMiddleware");
const {
  initiateRegularization,
  getRegularizations,
  approveRegularization,
  rejectRegularization
} = require("../../controllers/attendance/regularizationController");

router.use(protect);

router.route("/")
  .post(initiateRegularization)
  .get(getRegularizations);

router.put("/:id/approve", approveRegularization);
router.put("/:id/reject", rejectRegularization);

module.exports = router;
