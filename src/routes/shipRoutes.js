// src/routes/shipRoutes.js
const express = require('express');
const router = express.Router();
const shipController = require('../controllers/shipController');
const { isLoggedIn, isSupervisorOrAdmin } = require('../middleware/authMiddleware');

router.use(isLoggedIn);

router.get('/', shipController.getAllShips);
router.post('/', isSupervisorOrAdmin, shipController.createShip);
router.get('/:id', shipController.getShipById);
router.put('/:id', isSupervisorOrAdmin, shipController.updateShip);
router.delete('/:id', isSupervisorOrAdmin, shipController.deleteShip);

router.get('/:shipId/history', shipController.getShipHistory);

module.exports = router;
