const express = require('express');
const router = express.Router();

const appraisalController = require('../controllers/performance/appraisalController');
const goalController = require('../controllers/performance/goalController');
const reviewController = require('../controllers/performance/reviewController');
const incrementController = require('../controllers/performance/incrementController');
const promotionController = require('../controllers/performance/promotionController');
const letterController = require('../controllers/performance/letterController');
const kpiController = require('../controllers/performance/kpiController');

// Appraisal Cycles
router.post('/cycles', appraisalController.createCycle);
router.get('/cycles', appraisalController.getCycles);
router.get('/cycles/:id', appraisalController.getCycleById);
router.put('/cycles/:id', appraisalController.updateCycle);

// Performance Goals
router.post('/goals', goalController.createGoal);
router.get('/goals', goalController.getGoals);
router.put('/goals/:id', goalController.updateGoal);

// Performance Reviews
router.post('/reviews', reviewController.createReview);
router.get('/reviews', reviewController.getReviews);
router.put('/reviews/:id', reviewController.updateReview);

// Increments
router.post('/increments', incrementController.createIncrement);
router.get('/increments', incrementController.getIncrements);
router.put('/increments/:id/approve', incrementController.approveIncrement);

// Promotions
router.post('/promotions', promotionController.createPromotion);
router.get('/promotions', promotionController.getPromotions);
router.put('/promotions/:id/approve', promotionController.approvePromotion);

// Letters
router.get('/letters/templates', letterController.getTemplates);
router.post('/letters/templates', letterController.createTemplate);
router.put('/letters/templates/:id', letterController.updateTemplate);
router.delete('/letters/templates/:id', letterController.deleteTemplate);
router.get('/letters/issued', letterController.getIssuedLetters);
router.post('/letters/issue', letterController.issueLetter);
router.put('/letters/issued/:id/status', letterController.updateLetterStatus);

// KPI Tracking
router.get('/kpis', kpiController.getKPIs);
router.post('/kpis', kpiController.createKPI);
router.put('/kpis/:id', kpiController.updateKPI);
router.put('/kpis/:id/progress', kpiController.updateProgress);
router.delete('/kpis/:id', kpiController.deleteKPI);

module.exports = router;
