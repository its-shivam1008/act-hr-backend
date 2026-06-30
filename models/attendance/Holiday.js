const mongoose = require("mongoose");
const { Schema } = mongoose;

const HolidaySchema = new Schema(
  {
    organisationId: { type: String, required: true, index: true },
    name:           { type: String, required: true },
    date:           { type: Date, required: true },
    type:           { type: String, enum: ["National", "Regional", "Restricted"], default: "National" },
    location:       { type: String, default: "All" }, // E.g. "All", "India", "USA"
  },
  { timestamps: true }
);

// Unique date per organisation
HolidaySchema.index({ organisationId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Holiday", HolidaySchema);
