const mongoose = require('mongoose');

const assetDamageSchema = new mongoose.Schema({
  asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  damageDate: { type: Date, required: true },
  reportDescription: { type: String, required: true },
  recoveryCost: { type: Number, required: true, default: 0 },
  deductedFromPayroll: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ['Reported', 'Under Investigation', 'Resolved'],
    default: 'Reported'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('AssetDamage', assetDamageSchema);
