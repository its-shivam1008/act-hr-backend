const express = require('express');
const router = express.Router();

const leaveTypeController = require('../../controllers/leave/leaveTypeController');
const leaveAppController = require('../../controllers/leave/leaveAppController');
const compOffController = require('../../controllers/leave/compOffController');
const leaveEncashmentController = require('../../controllers/leave/leaveEncashmentController');
const holidayController = require('../../controllers/leave/holidayController');
const leavePolicyController = require('../../controllers/leave/leavePolicyController');
const leaveBalanceController = require('../../controllers/leave/leaveBalanceController');
const { combinedAuth } = require('../../middleware/authMiddleware');

router.use(combinedAuth);

// Balances
router.get('/balances', leaveBalanceController.getBalances);

// Holidays
router.get('/holidays', holidayController.getHolidays);
router.post('/holidays', holidayController.createHoliday);
router.delete('/holidays/:id', holidayController.deleteHoliday);

// Policies
router.get('/policies', leavePolicyController.getPolicy);
router.put('/policies', leavePolicyController.updatePolicy);

// Leave Types
router.get('/types', leaveTypeController.getLeaveTypes);
router.post('/types', leaveTypeController.createLeaveType);
router.put('/types/:id', leaveTypeController.updateLeaveType);
router.delete('/types/:id', leaveTypeController.deleteLeaveType);

// Applications
router.get('/applications', leaveAppController.getApplications);
router.post('/applications/apply', leaveAppController.applyLeave);
router.put('/applications/:id/approve', leaveAppController.approveLeave);
router.put('/applications/:id/reject', leaveAppController.rejectLeave);
router.put('/applications/:id/cancel', leaveAppController.cancelLeave);

// Comp Off
router.get('/comp-off', compOffController.getCompOffs);
router.post('/comp-off/credit', compOffController.creditCompOff);

// Encashment
router.get('/encashment', leaveEncashmentController.getEncashments);
router.post('/encashment/request', leaveEncashmentController.requestEncashment);
router.put('/encashment/:id/approve', leaveEncashmentController.approveEncashment);
router.put('/encashment/:id/reject', leaveEncashmentController.rejectEncashment);

module.exports = router;
