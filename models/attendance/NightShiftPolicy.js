const mongoose = require('mongoose');

const NightShiftPolicySchema = new mongoose.Schema(
  {
    organisationId: { type: String, required: true, index: true },
    nightWindowStart: { type: String, default: '22:00' },
    nightWindowEnd: { type: String, default: '06:00' },
    minDurationHours: { type: Number, default: 4 },
    
    allowanceType: { type: String, enum: ['Flat Amount', 'Percentage of Basic'], default: 'Flat Amount' },
    allowanceAmount: { type: Number, default: 50 },
    payrollComponent: { type: String, default: 'Special Allowances' },
    allowanceEnabled: { type: Boolean, default: true },

    maxConsecutiveShifts: { type: Number, default: 5 },
    mandatoryRestDays: { type: Number, default: 2 },
    excludeInterns: { type: Boolean, default: true },
    excludePregnantWomen: { type: Boolean, default: true },

    cabFacility: { type: Boolean, default: true },
    securityEscort: { type: Boolean, default: true },
    transportEnabled: { type: Boolean, default: true },

    status: { type: String, enum: ['Configured', 'Not Configured'], default: 'Not Configured' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('NightShiftPolicy', NightShiftPolicySchema);
