const express = require("express");
const router = express.Router();
const { protect } = require("../../middleware/authMiddleware");
const {
  getStatutoryData,
  getPFSummary,
  getEPSSummary,
  getEPFSummary,
  getESISummary,
  getPTSummary,
  getPTSlabs,
  getTDSSummary
} = require("../../controllers/statutoryController");

router.use(protect);

router.get("/", getStatutoryData);
router.get("/pf", getPFSummary);
router.get("/eps", getEPSSummary);
router.get("/epf", getEPFSummary);
router.get("/esi", getESISummary);
router.get("/pt", getPTSummary);
router.get("/pt/slabs", getPTSlabs);
router.get("/tds", getTDSSummary);

module.exports = router;
