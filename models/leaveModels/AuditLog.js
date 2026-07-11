const mongoose = require("mongoose");
const { Schema } = mongoose;
const OID = Schema.Types.ObjectId;

const AuditLogSchema = new Schema(
  {
    organisationId: {
      type: String,
      required: true,
    },
    employeeId: {
      type: OID,
      ref: "Employee",
      required: true,
    },
    action: {
      type: String,
      required: true,
    },
    oldStatus: {
      type: String,
    },
    newStatus: {
      type: String,
    },
    createdBy: {
      type: OID,
      ref: "User",
    },
    approvedBy: {
      type: OID,
      ref: "User",
    },
    rejectedBy: {
      type: OID,
      ref: "User",
    },
  },
  { timestamps: true }
);

AuditLogSchema.index({ organisationId: 1, employeeId: 1 });

module.exports = mongoose.model("AuditLog", AuditLogSchema);
