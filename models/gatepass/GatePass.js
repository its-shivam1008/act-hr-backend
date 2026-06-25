const mongoose = require("mongoose");
const { Schema } = mongoose;

const GatePassSchema = new Schema(
  {
    organisationId: {
      type: String,
      required: true,
      index: true
    },
    passId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    passType: {
      type: String,
      enum: ["Worker Pass", "Visitor Pass"],
      required: true
    },
    personType: {
      type: String,
      enum: ["Labour", "Employee", "Visitor"],
      required: true
    },
    personId: {
      type: Schema.Types.ObjectId,
      default: null
    },
    name: {
      type: String,
      required: true
    },
    companyName: {
      type: String, // Company name (for visitor) or Contractor name (for worker)
      default: ""
    },
    purpose: {
      type: String, // Purpose of visit
      default: ""
    },
    hostName: {
      type: String, // Host person name
      default: ""
    },
    contactNumber: {
      type: String,
      default: ""
    },
    issueDate: {
      type: Date,
      default: Date.now
    },
    expiryDate: {
      type: Date,
      required: true
    },
    accessZones: {
      type: [String],
      default: []
    },
    status: {
      type: String,
      enum: ["Active", "Expired", "Revoked"],
      default: "Active"
    },
    tradeOrRole: {
      type: String,
      default: ""
    },
    remarks: {
      type: String,
      default: ""
    },
    avatar: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("GatePass", GatePassSchema);
