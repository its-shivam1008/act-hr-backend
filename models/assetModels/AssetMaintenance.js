const mongoose = require('mongoose');

const assetMaintenanceSchema = new mongoose.Schema({
  asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true },
  maintenanceDate: { type: Date, required: true },
  cost: { type: Number, required: true, default: 0 },
  description: { type: String, required: true },
  provider: { type: String },
  status: {
    type: String,
    enum: ['Scheduled', 'In Progress', 'Completed', 'Cancelled'],
    default: 'Completed'
  },
  nextDueDate: { type: Date }
}, {
  timestamps: true
});

module.exports = mongoose.model('AssetMaintenance', assetMaintenanceSchema);
