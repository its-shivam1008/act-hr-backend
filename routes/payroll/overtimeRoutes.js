const express = require("express");
const router  = express.Router();
const { protect } = require("../../middleware/authMiddleware");
const ctrl = require("../../controllers/payroll/overtimeController");

router.use(protect);

router.get("/",              ctrl.getOvertimes);
router.post("/",             ctrl.createOvertime);
router.put("/:id",           ctrl.updateOvertime);
router.delete("/:id",        ctrl.deleteOvertime);
router.patch("/:id/approve", ctrl.approveOvertime);

module.exports = router;
