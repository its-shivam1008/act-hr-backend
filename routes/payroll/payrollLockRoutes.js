const express = require("express");
const router  = express.Router();
const { protect } = require("../../middleware/authMiddleware");
const ctrl = require("../../controllers/payroll/payrollLockController");

router.use(protect);

router.get("/",        ctrl.getLocks);
router.get("/status",  ctrl.getLockStatus);
router.post("/lock",   ctrl.lockMonth);
router.post("/unlock", ctrl.unlockMonth);

module.exports = router;
