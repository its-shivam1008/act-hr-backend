const express = require("express");
const router  = express.Router();
const {
  getDeductions, createDeduction, updateDeduction, deleteDeduction,
  getAdditions,  createAddition,  updateAddition,  deleteAddition,
} = require("../../controllers/payroll/payrollMasterController");

// ─── Deductions ───────────────────────────────────────────────────────────────
router.get   ("/deductions",          getDeductions);
router.post  ("/deductions",          createDeduction);
router.put   ("/deductions/:id",      updateDeduction);
router.delete("/deductions/:id",      deleteDeduction);

// ─── Additions ────────────────────────────────────────────────────────────────
router.get   ("/additions",           getAdditions);
router.post  ("/additions",           createAddition);
router.put   ("/additions/:id",       updateAddition);
router.delete("/additions/:id",       deleteAddition);

module.exports = router;
