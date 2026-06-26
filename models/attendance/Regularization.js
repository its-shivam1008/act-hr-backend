const mongoose = require("mongoose");
const { Schema } = mongoose;

const RegularizationSchema = new Schema(
  {
    organisationId: {
      type: String,
      required: true,
      index: true
    },
    employee: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: true
    },
    employeeName: {
      type: String,
      required: true
    },
    employeeIdCode: {
      type: String,
      required: true
    },
    departmentName: {
      type: String,
      default: ""
    },
    date: {
      type: Date,
      required: true
    },
    dateString: {
      type: String, // YYYY-MM-DD format
      required: true
    },
    checkIn: {
      type: String,
      default: "-"
    },
    checkOut: {
      type: String,
      default: "-"
    },
    requestedIn: {
      type: String,
      required: true
    },
    requestedOut: {
      type: String,
      required: true
    },
    reason: {
      type: String,
      required: true
    },
    remarks: {
      type: String,
      default: ""
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending"
    },
    submittedOn: {
      type: Date,
      default: Date.now
    },
    approvedBy: {
      type: String,
      default: ""
    },
    approvalDate: {
      type: Date
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Regularization", RegularizationSchema);
