const mongoose = require("mongoose");
const { Schema } = mongoose;

const BonusSchema = new Schema(
  {
    organisationId: {
      type: String,
      default: "default_org",
    },
    // Who is this bonus for?
    personType: {
      type: String,
      enum: ["Labour", "Employee"],
      required: true,
    },
    // Common fields
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    bonusAmount: {
      type: Number,
      required: [true, "Bonus amount is required"],
      min: [0, "Bonus amount must be non-negative"],
    },
    reason: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
    bonusDate: {
      type: Date,
      default: Date.now,
    },
    location: {
      type: String,
      trim: true,
      default: "",
    },

    // Labour-specific fields
    formA: {
      type: String,
      trim: true,
    },
    climsId: {
      type: String,
      trim: true,
    },
    agency: {
      type: String,
      trim: true,
    },

    // Employee-specific fields
    employeeId: {
      type: String,
      trim: true,
    },
    department: {
      type: String,
      trim: true,
    },
    designation: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Bonus", BonusSchema);
