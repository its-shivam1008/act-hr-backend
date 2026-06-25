const express = require("express");
const router = express.Router();
const { protect } = require("../../middleware/authMiddleware");

const {
  getGatePasses, getPublicGatePass, getPersonsList,
  createGatePass, updateGatePassStatus, updateGatePass, deleteGatePass
} = require("../../controllers/gatepass/gatePassController");

const {
  getZones, createZone, updateZone, deleteZone
} = require("../../controllers/gatepass/accessZoneController");

// Public — no auth (QR scan)
router.get("/public/:passId", getPublicGatePass);

// Auth required
router.use(protect);

// Gate passes
router.get("/",            getGatePasses);
router.get("/persons",     getPersonsList);
router.post("/",           createGatePass);
router.put("/:id",         updateGatePass);
router.patch("/:id/status", updateGatePassStatus);
router.delete("/:id",      deleteGatePass);

// Access zones
router.get("/zones",       getZones);
router.post("/zones",      createZone);
router.put("/zones/:id",   updateZone);
router.delete("/zones/:id", deleteZone);

module.exports = router;
