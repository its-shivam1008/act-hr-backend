const mongoose = require("mongoose");

const WageRateSchema = new mongoose.Schema(
  {
    skillLevelId:   { type: mongoose.Schema.Types.ObjectId, ref: "SkillLevel", required: true },
    skillLevelName: { type: String, required: true },
    basic:          { type: Number, required: true, min: 0 },
    vda:            { type: Number, default: 0, min: 0 },
    effectiveDate:  { type: Date, required: true },
    isActive:       { type: Boolean, default: true },
    addedBy:        { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

const ComplianceZoneSchema = new mongoose.Schema(
  {
    organisationId: { type: String, required: true, index: true },
    name:           { type: String, required: true, trim: true },
    // locations now reference Location master data by ObjectId
    locations: [{ type: mongoose.Schema.Types.ObjectId, ref: "Location" }],
    rates:     [WageRateSchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

ComplianceZoneSchema.index({ organisationId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("ComplianceZone", ComplianceZoneSchema);
