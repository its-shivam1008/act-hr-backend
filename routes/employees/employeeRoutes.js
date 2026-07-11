const express  = require("express");
const router   = express.Router();
const { protect } = require("../../middleware/authMiddleware");
const { canRead, canCreate, canUpdate, canDelete } = require("../../middleware/rbacMiddleware");

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

router.get ("/",     protect, canRead("emp_master"), getEmployees);
router.post("/",     protect, canCreate("emp_master"), createEmployee);
router.get ("/:id",  protect, canRead("emp_master"), getEmployee);
router.put ("/:id",  protect, canUpdate("emp_master"), updateEmployee);
router.delete("/:id", protect, canDelete("emp_master"), deleteEmployee);

module.exports = router;
