const express = require("express");
const router  = express.Router();

const { protect } = require("../../../middleware/authMiddleware");
const {
  getLocations,
  getLocation,
  createLocation,
  updateLocation,
  deleteLocation,
  toggleLocationStatus,
} = require("../../../controllers/masterdata/locations/locationController");

router.use(protect);

router.route("/")
  .get(getLocations)
  .post(createLocation);

router.route("/:id")
  .get(getLocation)
  .put(updateLocation)
  .delete(deleteLocation);

router.patch("/:id/toggle", toggleLocationStatus);

module.exports = router;
