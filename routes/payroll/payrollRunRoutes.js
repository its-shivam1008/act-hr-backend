const express = require("express");
const router  = express.Router();
const { protect } = require("../../middleware/authMiddleware");
const ctrl = require("../../controllers/payroll/payrollRunController");

router.use(protect);

router.get("/",          ctrl.getPayrollRuns);
router.get("/summary",   ctrl.getPayrollSummary);
router.get("/:id",       ctrl.getPayrollRunById);
router.post("/",         ctrl.createPayrollRun);
router.post("/process",  ctrl.processPayroll);
router.put("/:id",       ctrl.updatePayrollRun);
router.delete("/:id",    ctrl.deletePayrollRun);

module.exports = router;
