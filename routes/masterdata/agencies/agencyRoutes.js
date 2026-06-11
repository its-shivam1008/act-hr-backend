const express = require("express");
const router  = express.Router();

const { protect } = require("../../../middleware/authMiddleware");
const {
  getAgencies,
  getAgency,
  createAgency,
  updateAgency,
  deleteAgency,
  toggleAgencyStatus,
} = require("../../../controllers/masterdata/agencies/agencyController");

// All routes require authentication
router.use(protect);

// Collection routes
router.route("/")
  .get(getAgencies)     // GET  /api/masterdata/agencies
  .post(createAgency);  // POST /api/masterdata/agencies

// Document routes
router.route("/:id")
  .get(getAgency)       // GET    /api/masterdata/agencies/:id
  .put(updateAgency)    // PUT    /api/masterdata/agencies/:id
  .delete(deleteAgency);// DELETE /api/masterdata/agencies/:id

// Toggle active/inactive
router.patch("/:id/toggle", toggleAgencyStatus); // PATCH /api/masterdata/agencies/:id/toggle

module.exports = router;
