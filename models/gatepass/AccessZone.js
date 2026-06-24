const mongoose = require("mongoose");

const AccessZoneSchema = new mongoose.Schema(
  {
    organisationId: { type: String, required: true, index: true },
    name:           { type: String, required: true },
    description:    { type: String, default: "" },
    color:          { type: String, default: "#3B82F6" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("AccessZone", AccessZoneSchema);
