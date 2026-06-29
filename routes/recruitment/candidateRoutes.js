const express = require("express");
const router = express.Router();
const { protect } = require("../../middleware/authMiddleware");
const ctrl = require("../../controllers/recruitment/candidateController");

router.use(protect);

router.route("/").get(ctrl.getCandidates).post(ctrl.createCandidate);
router.route("/:id").get(ctrl.getCandidate).put(ctrl.updateCandidate).delete(ctrl.deleteCandidate);
router.put("/:id/stage", ctrl.updateStage);

module.exports = router;
