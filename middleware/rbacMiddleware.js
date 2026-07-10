const Permission = require("../models/Permission");

const checkPermission = (pageKey, action) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: "Not authenticated" });
      }

      // Organization super admin and admin get full access automatically
      if (req.user.role === "super_admin" || req.user.role === "admin") {
        return next();
      }

      // Find permission record
      const perm = await Permission.findOne({
        userId: req.user._id,
        organisationId: req.user.organisationId || req.user.organizationId,
      });

      if (!perm) {
        return res.status(403).json({
          success: false,
          message: `Access denied – no permissions configured.`,
        });
      }

      const pagePerm = perm.permissions.get(pageKey);
      if (pagePerm && pagePerm[action]) {
        return next();
      }

      return res.status(403).json({
        success: false,
        message: `Access denied – requires ${action} permission for ${pageKey}`,
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  };
};

module.exports = {
  checkPermission,
  canRead: (pageKey) => checkPermission(pageKey, "read"),
  canCreate: (pageKey) => checkPermission(pageKey, "create"),
  canUpdate: (pageKey) => checkPermission(pageKey, "update"),
  canDelete: (pageKey) => checkPermission(pageKey, "delete"),
};
