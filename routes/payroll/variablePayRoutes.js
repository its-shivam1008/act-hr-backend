const express = require("express");
const router  = express.Router();
const { protect } = require("../../middleware/authMiddleware");
const ctrl = require("../../controllers/payroll/variablePayController");

router.use(protect);

router.get("/",              ctrl.getVariablePays);
router.post("/",             ctrl.createVariablePay);
router.put("/:id",           ctrl.updateVariablePay);
router.delete("/:id",        ctrl.deleteVariablePay);
router.get("/budget",        ctrl.getBudgetSummary);
router.post("/push",         ctrl.pushToPayroll);

module.exports = router;
