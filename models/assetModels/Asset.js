const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema({
  assetId: { type: String, required: true, unique: true }, // e.g. AST-001
  name: { type: String, required: true },
  category: { type: String, required: true }, // Laptop, Mobile, Monitor, etc.
  serialNumber: { type: String, required: true },
  purchaseDate: { type: Date, required: true },
  cost: { type: Number, required: true, default: 0 },
  warrantyExpiry: { type: Date },
  depreciationRate: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['In Stock', 'Allocated', 'Repair', 'Retired', 'Available', 'Damaged', 'Missing', 'Pending'],
    default: 'In Stock'
  },
  health: {
    type: String,
    enum: ['New', 'Excellent', 'Good', 'Fair', 'Poor'],
    default: 'New'
  },
  vendor: { type: String }
}, {
  timestamps: true
});

module.exports = mongoose.model('Asset', assetSchema);
