const express = require("express");
const router  = express.Router();
const { protect } = require("../../middleware/authMiddleware");
const {
  getZones, getZone, createZone, updateZone, deleteZone,
  addRate, updateRate, deleteRate,
  getZoneSkillLevels,
} = require("../../controllers/wageCategories/wageCategoryController");

router.use(protect);

// ── Zones ──────────────────────────────────────────────────────────────────────
router.route("/zones")
  .get(getZones)
  .post(createZone);

router.route("/zones/:id")
  .get(getZone)
  .put(updateZone)
  .delete(deleteZone);

// ── Wage Rates (nested under zone) ────────────────────────────────────────────
router.get   ("/zones/:id/skill-levels",   getZoneSkillLevels);
router.post  ("/zones/:id/rates",          addRate);
router.put   ("/zones/:id/rates/:rateId",  updateRate);
router.delete("/zones/:id/rates/:rateId",  deleteRate);

module.exports = router;
