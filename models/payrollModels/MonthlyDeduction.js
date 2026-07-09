const mongoose = require("mongoose");
const { Schema } = mongoose;

const MonthlyDeductionSchema = new Schema(
  {
    organisationId: { type: String, required: true, index: true },
    month: { type: Number, required: true }, // 0-11
    year: { type: Number, required: true },
    type: { type: String, enum: ["Employee", "Labour"], required: true },
    locationId: {
      type: Schema.Types.ObjectId,
      ref: "Location",
      default: null,
      index: true,
    },
    locationName: { type: String, default: "" },

    // Employee specific
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", default: null },
    employeeName: { type: String },
    department: { type: String },
    location: { type: String },
    taxDeduction: { type: Number, default: 0 },
    healthInsurance: { type: Number, default: 0 },
    professionalTax: { type: Number, default: 0 },
    advance: { type: Number, default: 0 },

    // Labour specific
    labourId: { type: Schema.Types.ObjectId, ref: "Labour", default: null },
    labourName: { type: String },
    formA: { type: String },
    climsId: { type: String },
    agency: { type: String },
    cash: { type: Number, default: 0 },
    miscellaneous: { type: Number, default: 0 },

    // Approval Status
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
    deductedBy: { type: String, default: "" },
  },
  { timestamps: true },
);

MonthlyDeductionSchema.index({ organisationId: 1, month: 1, year: 1, type: 1 });
MonthlyDeductionSchema.index({
  organisationId: 1,
  locationId: 1,
  month: 1,
  year: 1,
  type: 1,
});
MonthlyDeductionSchema.index({
  employeeName: "text",
  employeeId: "text",
  labourName: "text",
  formA: "text",
  climsId: "text",
  agency: "text",
});

module.exports = mongoose.model("MonthlyDeduction", MonthlyDeductionSchema);
