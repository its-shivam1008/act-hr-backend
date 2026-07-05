const mongoose = require("mongoose");

// Each document stores permissions for one user in one org.
// permissions is a flat map: { "pageKey": { read, create, update, delete } }
const PermissionSchema = new mongoose.Schema(
  {
    userId:         { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    organisationId: { type: String, required: true },
    // flat map: key = "module_page" or just "page_key"
    // value: { read, create, update, delete }
    permissions: {
      type: Map,
      of: new mongoose.Schema({
        read:   { type: Boolean, default: false },
        create: { type: Boolean, default: false },
        update: { type: Boolean, default: false },
        delete: { type: Boolean, default: false },
      }, { _id: false }),
      default: {},
    },
  },
  { timestamps: true }
);

PermissionSchema.index({ userId: 1, organisationId: 1 }, { unique: true });

module.exports = mongoose.model("Permission", PermissionSchema);
