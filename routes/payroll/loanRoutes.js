const express = require("express");
const router  = express.Router();
const {
  getLoans,
  createLoan,
  approveLoan,
  rejectLoan,
  getLoanEMIs,
  recoverEMI,
} = require("../../controllers/payroll/loanController");

router.get   ("/",                  getLoans);
router.post  ("/",                  createLoan);
router.patch ("/:id/approve",       approveLoan);
router.patch ("/:id/reject",        rejectLoan);
router.get   ("/:id/emis",          getLoanEMIs);
router.patch ("/:id/recover-emi",   recoverEMI);

module.exports = router;
