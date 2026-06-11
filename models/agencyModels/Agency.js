const mongoose = require("mongoose");

const AgencySchema = new mongoose.Schema(
  {
    // ── Organisation scope ─────────────────────────────────────────────────
    organisationId: {
      type: String,
      required: [true, "Organisation ID is required"],
      index: true,
    },

    // ── Core fields ────────────────────────────────────────────────────────
    agencyName: {
      type: String,
      required: [true, "Agency name is required"],
      trim: true,
      minlength: [2, "Agency name must be at least 2 characters"],
      maxlength: [100, "Agency name cannot exceed 100 characters"],
    },

    contactPerson: {
      type: String,
      required: [true, "Contact person is required"],
      trim: true,
      minlength: [2, "Contact person name must be at least 2 characters"],
      maxlength: [60, "Contact person name cannot exceed 60 characters"],
    },

    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      match: [/^[+\d\s\-().]{7,20}$/, "Please enter a valid phone number"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },

    address: {
      type: String,
      trim: true,
      maxlength: [250, "Address cannot exceed 250 characters"],
      default: "",
    },

    // ── Status ─────────────────────────────────────────────────────────────
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Compound index – agency name unique per organisation
AgencySchema.index({ organisationId: 1, agencyName: 1 }, { unique: true });

module.exports = mongoose.model("Agency", AgencySchema);
