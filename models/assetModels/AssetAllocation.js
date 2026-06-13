const mongoose = require('mongoose');

const assetAllocationSchema = new mongoose.Schema({
  asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }, // Can be null if allocated to department
  department: { type: String }, // Optional, if allocated to a department instead of a person
  location: { type: String },
  allocationDate: { type: Date, required: true, default: Date.now },
  returnDate: { type: Date }, // Set when asset is returned
  conditionAtAllocation: { type: String },
  conditionAtReturn: { type: String },
  status: {
    type: String,
    enum: ['Active', 'Returned'],
    default: 'Active'
  },
  notes: { type: String }
}, {
  timestamps: true
});

module.exports = mongoose.model('AssetAllocation', assetAllocationSchema);
