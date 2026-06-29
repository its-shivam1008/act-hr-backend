const express = require("express");
const router = express.Router();
const { protect } = require("../../middleware/authMiddleware");
const ctrl = require("../../controllers/recruitment/onboardingController");

router.use(protect);

router.route("/").get(ctrl.getOnboardings);
router.route("/:id").get(ctrl.getOnboarding).put(ctrl.updateOnboarding);
router.put("/:id/checklist/:itemId", ctrl.updateChecklistItem);
router.put("/:id/activate", ctrl.activateEmployee);
router.put("/:id/self-service", ctrl.submitSelfService);

module.exports = router;
