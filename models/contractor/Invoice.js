const mongoose = require("mongoose");

const InvoiceSchema = new mongoose.Schema(
  {
    organisationId: {
      type: String,
      required: [true, "Organisation ID is required"],
      index: true,
    },
    invoiceNo: {
      type: String,
      required: [true, "Invoice number is required"],
      trim: true,
    },
    contractorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Agency",
      required: [true, "Contractor/Agency is required"],
    },
    contractorName: {
      type: String,
      required: [true, "Contractor/Agency name is required"],
      trim: true,
    },
    billingPeriod: {
      type: String,
      required: [true, "Billing period is required"],
      trim: true,
    },
    labourCount: {
      type: Number,
      required: [true, "Labour count is required"],
      min: [0, "Labour count cannot be negative"],
    },
    rate: {
      type: Number,
      required: [true, "Rate is required"],
      min: [0, "Rate cannot be negative"],
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0, "Amount cannot be negative"],
    },
    status: {
      type: String,
      enum: ["Pending", "Verified", "Paid", "Disputed"],
      default: "Pending",
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Invoice", InvoiceSchema);
