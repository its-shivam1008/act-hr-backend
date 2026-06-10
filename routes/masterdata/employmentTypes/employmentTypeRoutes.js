const express = require("express");
const router  = express.Router();

const { protect } = require("../../../middleware/authMiddleware");
const {
  getEmploymentTypes,
  getEmploymentType,
  createEmploymentType,
  updateEmploymentType,
  deleteEmploymentType,
  toggleEmploymentTypeStatus,
} = require("../../../controllers/masterdata/employmentTypes/employmentTypeController");

// All routes require authentication
router.use(protect);

// Collection routes
router.route("/")
  .get(getEmploymentTypes)     // GET  /api/masterdata/employment-types
  .post(createEmploymentType); // POST /api/masterdata/employment-types

// Document routes
router.route("/:id")
  .get(getEmploymentType)         // GET    /api/masterdata/employment-types/:id
  .put(updateEmploymentType)      // PUT    /api/masterdata/employment-types/:id
  .delete(deleteEmploymentType);  // DELETE /api/masterdata/employment-types/:id

// Toggle active/inactive
router.patch("/:id/toggle", toggleEmploymentTypeStatus);

module.exports = router;
