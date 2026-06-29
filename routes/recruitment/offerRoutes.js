const express = require("express");
const router = express.Router();
const { protect } = require("../../middleware/authMiddleware");
const ctrl = require("../../controllers/recruitment/offerController");

router.use(protect);

router.route("/").get(ctrl.getOffers).post(ctrl.createOffer);
router.route("/:id").get(ctrl.getOffer).put(ctrl.updateOffer).delete(ctrl.deleteOffer);
router.put("/:id/send", ctrl.sendOffer);
router.put("/:id/respond", ctrl.respondOffer);

module.exports = router;
