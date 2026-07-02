const express = require("express");
const router  = express.Router();
const { protect } = require("../../middleware/authMiddleware");
const {
  getWages,
  saveWages,
  searchMaster,
  addIndividual
} = require("../../controllers/payroll/internalWageController");

router.use(protect);

router.get("/", getWages);
router.post("/save", saveWages);
router.get("/search-master", searchMaster);
router.post("/add-individual", addIndividual);

module.exports = router;
