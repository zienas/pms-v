// src/routes/tripRoutes.js
const express = require('express');
const router = express.Router();
const tripController = require('../controllers/tripController');
const { isLoggedIn, isSupervisorOrAdmin } = require('../middleware/authMiddleware');

router.use(isLoggedIn);

router.get('/:id', tripController.getTripById);
router.put('/:id', isSupervisorOrAdmin, tripController.updateTrip);

module.exports = router;
