const User       = require("../models/User");
const Permission = require("../models/Permission");

// GET /api/permissions/members
// Returns ALL active org members (any role) with their saved permissions
exports.getOrgMembersWithPermissions = async (req, res) => {
  try {
    const { organisationId } = req.user;

    // Fetch all users in the org regardless of role (include super_admin, admin, team_member, and legacy roles)
    const members = await User.find({
      organisationId,
    })
      .select("name email role isActive createdAt inviteStatus")
      .sort({ createdAt: -1 });

    // Fetch all permission records for this org
    const perms = await Permission.find({ organisationId });

    // Build a quick lookup by userId
    const permMap = {};
    perms.forEach(p => {
      // p.permissions is a Mongoose Map — convert to plain object
      const plain = {};
      if (p.permissions && typeof p.permissions.forEach === "function") {
        p.permissions.forEach((val, key) => {
          plain[key] = {
            read:   !!val.read,
            create: !!val.create,
            update: !!val.update,
            delete: !!val.delete,
          };
        });
      }
      permMap[p.userId.toString()] = plain;
    });

    const result = members.map(m => ({
      _id:         m._id,
      name:        m.name,
      email:       m.email,
      role:        m.role,
      isActive:    m.isActive,
      createdAt:   m.createdAt,
      permissions: permMap[m._id.toString()] || {},
    }));

    return res.json({ success: true, members: result });
  } catch (err) {
    console.error("[getOrgMembersWithPermissions]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/permissions/:userId
// Upsert full permission set for a user
exports.saveUserPermissions = async (req, res) => {
  try {
    const { userId } = req.params;
    const { organisationId, role: callerRole } = req.user;
    const { permissions } = req.body;

    console.log('[saveUserPermissions] callerRole:', callerRole, '| userId:', req.user._id);

    if (!["super_admin", "admin"].includes(callerRole)) {
      return res.status(403).json({ success: false, message: "Only admins can modify permissions" });
    }

    if (!permissions || typeof permissions !== "object") {
      return res.status(400).json({ success: false, message: "permissions object required" });
    }

    // Target user must be in the same org
    const targetUser = await User.findOne({ _id: userId, organisationId });
    if (!targetUser) {
      return res.status(404).json({ success: false, message: "User not found in your organisation" });
    }

    const permMap = new Map();
    Object.entries(permissions).forEach(([key, val]) => {
      const v = val || {};
      permMap.set(key, {
        read:   !!v.read,
        create: !!v.create,
        update: !!v.update,
        delete: !!v.delete,
      });
    });

    const perm = await Permission.findOneAndUpdate(
      { userId, organisationId },
      { $set: { permissions: permMap } },
      { upsert: true, new: true }
    );

    return res.json({ success: true, message: "Permissions saved", permission: perm });
  } catch (err) {
    console.error("[saveUserPermissions]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/permissions/role/:userId
// Update the role of a team member (admin or team_member only)
exports.updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { organisationId, role: callerRole } = req.user;
    const { role } = req.body;

    if (!["admin", "team_member"].includes(role)) {
      return res.status(400).json({ success: false, message: "Role must be admin or team_member" });
    }

    if (!["super_admin", "admin"].includes(callerRole)) {
      return res.status(403).json({ success: false, message: "Only admins can change roles" });
    }

    const user = await User.findOne({ _id: userId, organisationId });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    if (user.role === "super_admin") {
      return res.status(403).json({ success: false, message: "Cannot change super admin role" });
    }

    user.role = role;
    await user.save({ validateBeforeSave: false });

    return res.json({ success: true, message: "Role updated", user: user.toSafeObject() });
  } catch (err) {
    console.error("[updateUserRole]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
