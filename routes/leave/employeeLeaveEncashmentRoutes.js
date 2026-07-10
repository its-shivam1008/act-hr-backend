const express = require('express');
const router = express.Router();
const leaveEncashmentController = require('../../controllers/leave/leaveEncashmentController');
const { combinedAuth } = require('../../middleware/authMiddleware');

router.use(combinedAuth);

router.get('/policy', leaveEncashmentController.getPolicy);
router.get('/history', leaveEncashmentController.getEncashments);
router.post('/request', leaveEncashmentController.requestEncashment);

module.exports = router;
