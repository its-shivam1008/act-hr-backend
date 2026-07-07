const express = require("express");
const router  = express.Router();
const { protect } = require("../../middleware/authMiddleware");
const ctrl = require("../../controllers/payroll/attendancePayrollController");

router.use(protect);

router.get("/",         ctrl.getAttendancePayroll);
router.post("/",        ctrl.createAttendancePayroll);
router.post("/sync",    ctrl.syncEmployees);
router.put("/:id",      ctrl.updateAttendancePayroll);
router.delete("/:id",   ctrl.deleteAttendancePayroll);

module.exports = router;
