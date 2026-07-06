const express = require("express");
const router  = express.Router();
const { protect } = require("../../middleware/authMiddleware");
const ctrl = require("../../controllers/payroll/salaryStructureController");

router.use(protect);

router.get("/",                               ctrl.getStructures);
router.get("/:id",                            ctrl.getStructureById);
router.post("/",                              ctrl.createStructure);
router.put("/:id",                            ctrl.updateStructure);
router.delete("/:id",                         ctrl.deleteStructure);
router.post("/:id/components",                ctrl.addComponent);
router.delete("/:id/components/:componentId", ctrl.removeComponent);
router.post("/simulate",                      ctrl.simulateCTC);

module.exports = router;
