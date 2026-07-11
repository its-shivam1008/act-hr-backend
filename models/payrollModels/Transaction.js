const mongoose = require("mongoose");
const { Schema } = mongoose;
const OID = Schema.Types.ObjectId;

const TransactionSchema = new Schema(
  {
    organisationId: {
      type: String,
      required: true,
    },
    employeeId: {
      type: OID,
      ref: "Employee",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: String,
      required: true,
      enum: ["Separate Check"],
    },
    type: {
      type: String,
      required: true,
      enum: ["Leave Encashment"],
    },
    status: {
      type: String,
      required: true,
      enum: ["Pending", "Paid", "Cancelled"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

TransactionSchema.index({ organisationId: 1, employeeId: 1, status: 1 });

module.exports = mongoose.model("Transaction", TransactionSchema);
