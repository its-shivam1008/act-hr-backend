const express = require("express");
const router  = express.Router();
const { combinedAuth } = require("../middleware/authMiddleware");
const {
  getOrgMembersWithPermissions,
  saveUserPermissions,
  updateUserRole,
} = require("../controllers/permissionController");

// All routes require auth
router.use(combinedAuth);

router.get("/members",          getOrgMembersWithPermissions);
router.put("/:userId",          saveUserPermissions);
router.patch("/role/:userId",   updateUserRole);

module.exports = router;
