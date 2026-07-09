const express = require("express");
const router  = express.Router();
const { protect } = require("../../middleware/authMiddleware");
const {
  getDeductions, createDeduction, updateDeduction, deleteDeduction,
  getAdditions,  createAddition,  updateAddition,  deleteAddition,
} = require("../../controllers/payroll/payrollMasterController");
const deductionEntryController = require("../../controllers/payroll/deductionEntryController");

router.use(protect);

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

// ─── Deduction Entry (Monthly Batch) ──────────────────────────────────────────
router.get   ("/deduction-entry/locations", deductionEntryController.getLocations);
router.get   ("/deduction-entry",           deductionEntryController.getDeductionEntries);
router.post  ("/deduction-entry",           deductionEntryController.saveDeductionEntries);

// ─── Labour Deductions Management ─────────────────────────────────────────────
router.get   ("/labour-deductions",         deductionEntryController.getLabourDeductions);
router.put   ("/labour-deductions/status",  deductionEntryController.updateLabourDeductionStatus);

module.exports = router;
