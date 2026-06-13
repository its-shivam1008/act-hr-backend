const express = require('express');
const router = express.Router();
const assetController = require('../../controllers/assets/assetController');
// const { protect } = require('../../middleware/authMiddleware');

// If authentication middleware is available, use it. For now, public or simple routing
// router.use(protect); 

// Asset Master
router.route('/')
  .get(assetController.getAssets)
  .post(assetController.createAsset);

router.route('/:id')
  .put(assetController.updateAsset)
  .delete(assetController.deleteAsset);

// Asset Allocation
router.route('/allocations')
  .get(assetController.getAllocations)
  .post(assetController.allocateAsset);

router.put('/allocations/:allocationId/return', assetController.returnAsset);

// Asset Maintenance
router.route('/maintenance')
  .get(assetController.getMaintenanceLogs)
  .post(assetController.logMaintenance);

// Asset Damage
router.route('/damage')
  .get(assetController.getDamageReports)
  .post(assetController.reportDamage);

// Asset Audit
router.post('/audits', assetController.createAudit);
router.get('/audits', assetController.getAudits);
router.put('/audits/:id', assetController.updateAudit);

module.exports = router;
