const mongoose = require("mongoose");
const { Schema } = mongoose;
const OID = Schema.Types.ObjectId;

const TransferSchema = new Schema(
  {
    organisationId: {
      type: String,
      required: true,
      index: true
    },
    employee: {
      type: OID,
      ref: "Employee",
      required: true
    },
    employeeName: {
      type: String,
      default: ""
    },
    employeeIdCode: {
      type: String,
      default: ""
    },
    type: {
      type: String,
      enum: ["Department", "Location", "Role", "Grade"],
      required: true
    },
    currentValue: {
      type: String,
      required: true
    },
    proposedValue: {
      type: String,
      required: true
    },
    currentRef: {
      type: OID,
      default: null
    },
    proposedRef: {
      type: OID,
      default: null
    },
    effectiveDate: {
      type: Date,
      required: true
    },
    reason: {
      type: String,
      default: ""
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending"
    },
    initiator: {
      type: String,
      default: "System"
    },
    approvedBy: {
      type: String,
      default: ""
    },
    approvalDate: {
      type: Date
    },
    salaryIncreasePercentage: {
      type: Number,
      default: 0
    },
    payrollRevisionTriggered: {
      type: Boolean,
      default: false
    },
    transferNature: {
      type: String,
      enum: ["Permanent", "Temporary"],
      default: "Permanent"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Transfer", TransferSchema);
