const express = require("express");
const router = express.Router();
const { protect } = require("../../middleware/authMiddleware");
const ctrl = require("../../controllers/recruitment/interviewController");

router.use(protect);

router.route("/").get(ctrl.getInterviews).post(ctrl.createInterview);
router.route("/:id").get(ctrl.getInterview).put(ctrl.updateInterview).delete(ctrl.deleteInterview);
router.put("/:id/feedback", ctrl.submitFeedback);

module.exports = router;
