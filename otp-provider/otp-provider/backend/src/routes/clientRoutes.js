const express = require('express');
const router = express.Router();
const { authenticateClient } = require('../middleware/auth');
const dashboard = require('../controllers/clientDashboardController');

router.use(authenticateClient);

router.get('/dashboard', dashboard.getDashboard);
router.get('/transactions', dashboard.getMyTransactions);
router.get('/otp-logs', dashboard.getMyOtpLogs);
router.post('/regenerate-secret', dashboard.regenerateApiSecret);
router.get('/chat', dashboard.getMyChat);
router.post('/chat', dashboard.sendMyChatMessage);

module.exports = router;
