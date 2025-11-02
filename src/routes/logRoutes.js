// src/routes/logRoutes.js
const express = require('express');
const router = express.Router();
const logController = require('../controllers/logController');
const { isLoggedIn, isSupervisorOrAdmin } = require('../middleware/authMiddleware');

router.use(isLoggedIn);

router.get('/login-history', isSupervisorOrAdmin, logController.getLoginHistory);
router.get('/interaction', isSupervisorOrAdmin, logController.getInteractionLogs);
router.get('/api', isSupervisorOrAdmin, logController.getApiLogs);

module.exports = router;
