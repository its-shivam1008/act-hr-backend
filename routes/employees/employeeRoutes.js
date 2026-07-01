const express  = require("express");
const router   = express.Router();
const { protect } = require("../../middleware/authMiddleware");

const {
  getEmployees, getEmployee,
  createEmployee, updateEmployee, deleteEmployee,
  getFormConfig, saveFormConfig, getHierarchy,
  bulkImportEmployees,
} = require("../../controllers/employeeController");

// Form config must come before /:id to avoid route collision
router.get ("/form-config",   protect, getFormConfig);
router.put ("/form-config",   protect, saveFormConfig);
router.get ("/hierarchy",     protect, getHierarchy);
router.post("/bulk-import",   protect, bulkImportEmployees);

router.get ("/",     protect, getEmployees);
router.post("/",     protect, createEmployee);
router.get ("/:id",  protect, getEmployee);
router.put ("/:id",  protect, updateEmployee);
router.delete("/:id", protect, deleteEmployee);

module.exports = router;
