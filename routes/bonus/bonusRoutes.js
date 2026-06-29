const express = require("express");
const router = express.Router();
const {
  getBonuses,
  getBonusById,
  createBonus,
  bulkCreateBonuses,
  updateBonus,
  updateBonusStatus,
  bulkUpdateStatus,
  deleteBonus,
} = require("../../controllers/bonus/bonusController");

// ── Main CRUD ──────────────────────────────────────────────────────────────────
router.get("/", getBonuses);
router.get("/:id", getBonusById);
router.post("/", createBonus);
router.put("/:id", updateBonus);
router.delete("/:id", deleteBonus);

// ── Special Operations ─────────────────────────────────────────────────────────
router.post("/bulk/import", bulkCreateBonuses);
router.patch("/:id/status", updateBonusStatus);
router.patch("/bulk/status", bulkUpdateStatus);

module.exports = router;
