const express = require("express");
const router  = express.Router();
const {
  getAdvances,
  createAdvance,
  approveAdvance,
  rejectAdvance,
  recoverAdvance,
} = require("../../controllers/payroll/advanceController");

router.get   ("/",              getAdvances);
router.post  ("/",              createAdvance);
router.patch ("/:id/approve",  approveAdvance);
router.patch ("/:id/reject",   rejectAdvance);
router.patch ("/:id/recover",  recoverAdvance);

module.exports = router;
