const express = require("express");
const router  = express.Router();

const { protect } = require("../../../middleware/authMiddleware");
const {
  getDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  toggleDepartmentStatus,
} = require("../../../controllers/masterdata/departments/departmentController");

router.use(protect);

router.route("/")
  .get(getDepartments)
  .post(createDepartment);

router.route("/:id")
  .get(getDepartment)
  .put(updateDepartment)
  .delete(deleteDepartment);

router.patch("/:id/toggle", toggleDepartmentStatus);

module.exports = router;
