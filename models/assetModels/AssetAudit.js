const mongoose = require('mongoose');

const assetAuditSchema = new mongoose.Schema({
  auditName: { type: String, required: true },
  auditDate: { type: Date, required: true, default: Date.now },
  auditor: { type: String, required: true },
  status: {
    type: String,
    enum: ['Scheduled', 'In Progress', 'Completed'],
    default: 'In Progress'
  },
  dueDate: { type: Date },
  location: { type: String },
  findings: [{
    asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset' },
    status: { type: String, enum: ['Verified', 'Missing', 'Pending', 'Damaged'] },
    notes: { type: String }
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('AssetAudit', assetAuditSchema);
