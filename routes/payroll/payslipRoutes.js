const express = require("express");
const router  = express.Router();
const { protect } = require("../../middleware/authMiddleware");
const ctrl = require("../../controllers/payroll/payslipController");

router.use(protect);

router.get("/",                               ctrl.getMonthlyPayslips);
router.get("/report",                         ctrl.getPayrollReport);
router.get("/:employeeId/:month/:year",        ctrl.getPayslip);
router.patch("/:id/paid",                     ctrl.markPaid);

module.exports = router;
