const express = require('express');
const router = express.Router();
const leaveEncashmentController = require('../../controllers/leave/leaveEncashmentController');
const { combinedAuth } = require('../../middleware/authMiddleware');

router.use(combinedAuth);

router.get('/', leaveEncashmentController.getEncashments);
router.get('/policy', leaveEncashmentController.getPolicy);
router.put('/:id/approve', leaveEncashmentController.approveEncashment);
router.put('/:id/reject', leaveEncashmentController.rejectEncashment);

module.exports = router;
