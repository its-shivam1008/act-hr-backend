const mongoose = require("mongoose");

const ProcessStepSchema = new mongoose.Schema({
  stepName: { type: String, required: true },
  points: { type: Number, default: 0 },
});

const LocationSchema = new mongoose.Schema(
  {
    // ── Organisation scope ─────────────────────────────────────────────────
    organisationId: {
      type: String,
      required: [true, "Organisation ID is required"],
      index: true,
    },

    // ── Basic Info ─────────────────────────────────────────────────────────
    name: {
      type: String,
      required: [true, "Location name is required"],
      trim: true,
    },
    locationType: {
      type: String,
      trim: true,
      default: "Office",
    },
    address: {
      type: String,
      trim: true,
      default: "",
    },
    city: {
      type: String,
      trim: true,
      default: "",
    },
    state: {
      type: String,
      trim: true,
      default: "",
    },
    pincode: {
      type: String,
      trim: true,
      default: "",
    },
    capacity: {
      type: Number,
      default: 0,
    },
    latitude: {
      type: String,
      trim: true,
      default: "",
    },
    longitude: {
      type: String,
      trim: true,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },

    // ── Working Hours ──────────────────────────────────────────────────────
    workingHours: {
      startTime: { type: String, default: "09:00" },
      endTime: { type: String, default: "18:00" },
      workingDays: { type: [String], default: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] },
      shiftConfiguration: { type: String, default: "Standard" },
    },

    // ── Contact & Details ──────────────────────────────────────────────────
    contactDetails: {
      contactPerson: { type: String, trim: true, default: "" },
      contactPhone: { type: String, trim: true, default: "" },
    },

    // ── Facilities ─────────────────────────────────────────────────────────
    facilities: {
      type: [String],
      default: [],
    },

    // ── Select Date ────────────────────────────────────────────────────────
    dateRange: {
      type: String,
      enum: ["1-30", "26-25"],
      default: "1-30",
    },

    // ── Processes ──────────────────────────────────────────────────────────
    processes: {
      labours: {
        isSequential: { type: Boolean, default: false },
        steps: [ProcessStepSchema],
      },
      employees: {
        isSequential: { type: Boolean, default: false },
        steps: [ProcessStepSchema],
      },
    },
  },
  { timestamps: true }
);

// Location name unique per organisation
LocationSchema.index({ organisationId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("Location", LocationSchema);
