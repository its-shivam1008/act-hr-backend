const Asset = require('../../models/assetModels/Asset');
const AssetAllocation = require('../../models/assetModels/AssetAllocation');
const AssetMaintenance = require('../../models/assetModels/AssetMaintenance');
const AssetDamage = require('../../models/assetModels/AssetDamage');
const AssetAudit = require('../../models/assetModels/AssetAudit');

// -- Asset Master --

exports.createAsset = async (req, res) => {
  try {
    const asset = new Asset(req.body);
    await asset.save();
    res.status(201).json({ success: true, asset });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.getAssets = async (req, res) => {
  try {
    const assets = await Asset.find();
    res.status(200).json({ success: true, count: assets.length, assets });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateAsset = async (req, res) => {
  try {
    const asset = await Asset.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!asset) return res.status(404).json({ success: false, message: 'Asset not found' });
    res.status(200).json({ success: true, asset });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.deleteAsset = async (req, res) => {
  try {
    const asset = await Asset.findByIdAndDelete(req.params.id);
    if (!asset) return res.status(404).json({ success: false, message: 'Asset not found' });
    res.status(200).json({ success: true, message: 'Asset deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// -- Asset Allocation --

exports.allocateAsset = async (req, res) => {
  try {
    const { assetId, employeeId, department, location, conditionAtAllocation } = req.body;
    
    // Create allocation record
    const allocation = new AssetAllocation({
      asset: assetId,
      employee: employeeId,
      department,
      location,
      conditionAtAllocation
    });
    await allocation.save();
    
    // Update asset status
    await Asset.findByIdAndUpdate(assetId, { status: 'Allocated' });
    
    res.status(201).json({ success: true, allocation });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.returnAsset = async (req, res) => {
  try {
    const { allocationId } = req.params;
    const { conditionAtReturn, notes } = req.body;
    
    const allocation = await AssetAllocation.findById(allocationId);
    if (!allocation) return res.status(404).json({ success: false, message: 'Allocation not found' });
    
    allocation.status = 'Returned';
    allocation.returnDate = new Date();
    allocation.conditionAtReturn = conditionAtReturn;
    allocation.notes = notes;
    await allocation.save();
    
    // Update asset status back to Available
    await Asset.findByIdAndUpdate(allocation.asset, { status: 'Available' });
    
    res.status(200).json({ success: true, allocation });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.getAllocations = async (req, res) => {
  try {
    const allocations = await AssetAllocation.find().populate('asset').populate('employee');
    res.status(200).json({ success: true, allocations });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// -- Asset Maintenance --

exports.logMaintenance = async (req, res) => {
  try {
    const maintenance = new AssetMaintenance(req.body);
    await maintenance.save();
    
    // Optionally update asset status to Repair if it's currently being maintained
    if (req.body.status === 'In Progress') {
      await Asset.findByIdAndUpdate(req.body.asset, { status: 'Repair' });
    }
    
    res.status(201).json({ success: true, maintenance });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.getMaintenanceLogs = async (req, res) => {
  try {
    const logs = await AssetMaintenance.find().populate('asset');
    res.status(200).json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// -- Asset Damage --

exports.reportDamage = async (req, res) => {
  try {
    const damage = new AssetDamage(req.body);
    await damage.save();
    
    await Asset.findByIdAndUpdate(req.body.asset, { status: 'Damaged' });
    
    // Here we could trigger a payroll deduction webhook or event
    
    res.status(201).json({ success: true, damage });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.getDamageReports = async (req, res) => {
  try {
    const reports = await AssetDamage.find().populate('asset').populate('employee');
    res.status(200).json({ success: true, reports });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// -- Asset Audit --

exports.createAudit = async (req, res) => {
  try {
    const audit = new AssetAudit(req.body);
    await audit.save();
    res.status(201).json({ success: true, audit });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.getAudits = async (req, res) => {
  try {
    const audits = await AssetAudit.find().populate('findings.asset');
    res.status(200).json({ success: true, audits });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateAudit = async (req, res) => {
  try {
    const audit = await AssetAudit.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!audit) return res.status(404).json({ success: false, message: 'Audit not found' });
    res.status(200).json({ success: true, audit });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
