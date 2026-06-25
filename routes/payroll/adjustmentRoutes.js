const express = require("express");
const router  = express.Router();
const {
  getAdjustments,
  createAdjustment,
  updateAdjustment,
  stopAdjustment,
  deleteAdjustment,
} = require("../../controllers/payroll/adjustmentController");

router.get   ("/",               getAdjustments);
router.post  ("/",               createAdjustment);
router.put   ("/:id",            updateAdjustment);
router.patch ("/:id/stop",       stopAdjustment);
router.delete("/:id",            deleteAdjustment);

module.exports = router;
