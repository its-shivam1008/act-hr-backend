const express = require("express");
const router = express.Router();
const { protect } = require("../../middleware/authMiddleware");
const ctrl = require("../../controllers/recruitment/requisitionController");

router.use(protect);

router.route("/").get(ctrl.getRequisitions).post(ctrl.createRequisition);
router.route("/:id").get(ctrl.getRequisition).put(ctrl.updateRequisition).delete(ctrl.deleteRequisition);
router.put("/:id/approve", ctrl.approveRequisition);
router.put("/:id/post", ctrl.postRequisition);

module.exports = router;
