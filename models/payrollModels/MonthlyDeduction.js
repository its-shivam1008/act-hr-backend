const mongoose = require('mongoose');
const { Schema } = mongoose;

const MonthlyDeductionSchema = new Schema(
  {
    organisationId: { type: String, required: true, index: true },
    month: { type: Number, required: true },  // 0-11
    year:  { type: Number, required: true },
    type:  { type: String, enum: ['Employee', 'Labour'], required: true },

    // Employee specific
    employeeId:     { type: Schema.Types.ObjectId, ref: 'Employee', default: null },
    employeeName:   { type: String },
    department:     { type: String },
    location:       { type: String },
    taxDeduction:   { type: Number, default: 0 },
    healthInsurance:{ type: Number, default: 0 },
    professionalTax:{ type: Number, default: 0 },
    advance:        { type: Number, default: 0 },

    // Labour specific
    labourId:       { type: Schema.Types.ObjectId, ref: 'Labour', default: null },
    labourName:     { type: String },
    formA:          { type: String },
    climsId:        { type: String },
    agency:         { type: String },
    cash:           { type: Number, default: 0 },
    miscellaneous:  { type: Number, default: 0 },
    
    // Approval Status
    status:         { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    deductedBy:     { type: String, default: '' },
  },
  { timestamps: true }
);

MonthlyDeductionSchema.index({ organisationId: 1, month: 1, year: 1, type: 1 });

module.exports = mongoose.model('MonthlyDeduction', MonthlyDeductionSchema);
