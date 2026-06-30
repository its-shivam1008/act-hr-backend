const mongoose = require('mongoose');

const CompOffSchema = new mongoose.Schema(
  {
    organisationId: { type: String, required: true, index: true },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    workedDate: { type: Date, required: true },
    creditDays: { type: Number, required: true },
    expiryDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['Active', 'Used', 'Lapsed'],
      default: 'Active',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CompOff', CompOffSchema);
