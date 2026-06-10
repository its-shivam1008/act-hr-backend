const express = require("express");
const router  = express.Router();

const { protect } = require("../../../middleware/authMiddleware");
const {
  getDesignations,
  getDesignation,
  createDesignation,
  updateDesignation,
  deleteDesignation,
  toggleDesignationStatus,
} = require("../../../controllers/masterdata/designations/designationController");

// All routes require authentication
router.use(protect);

// Collection routes
router.route("/")
  .get(getDesignations)      // GET  /api/masterdata/designations
  .post(createDesignation);  // POST /api/masterdata/designations

// Document routes
router.route("/:id")
  .get(getDesignation)          // GET    /api/masterdata/designations/:id
  .put(updateDesignation)       // PUT    /api/masterdata/designations/:id
  .delete(deleteDesignation);   // DELETE /api/masterdata/designations/:id

// Toggle active/inactive
router.patch("/:id/toggle", toggleDesignationStatus);

module.exports = router;
