const express = require("express");
const router  = express.Router();
const { protect } = require("../../middleware/authMiddleware");
const ctrl = require("../../controllers/payroll/arrearController");

router.use(protect);

router.get("/",        ctrl.getArrears);
router.post("/",       ctrl.createArrear);
router.put("/:id",     ctrl.updateArrear);
router.delete("/:id",  ctrl.deleteArrear);

module.exports = router;
