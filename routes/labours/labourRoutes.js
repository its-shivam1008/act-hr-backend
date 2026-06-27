const express = require("express");
const router  = express.Router();
const { protect } = require("../../middleware/authMiddleware");

const {
  getLabours, getLabour,
  createLabour, updateLabour, deleteLabour,
  getFormConfig, updateFormConfig,
} = require("../../controllers/labourController");

// Form config routes must come BEFORE /:id to avoid route collision
router.get ("/form-config", protect, getFormConfig);
router.put ("/form-config", protect, updateFormConfig);

router.get   ("/",    protect, getLabours);
router.post  ("/",    protect, createLabour);
router.get   ("/:id", protect, getLabour);
router.put   ("/:id", protect, updateLabour);
router.delete("/:id", protect, deleteLabour);

module.exports = router;
