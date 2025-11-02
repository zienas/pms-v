// src/routes/portRoutes.js
const express = require('express');
const router = express.Router();
const portController = require('../controllers/portController');
const { isLoggedIn, isAdmin } = require('../middleware/authMiddleware');

// All port routes should require login
router.use(isLoggedIn);

router.get('/', portController.getAllPorts);
router.post('/', isAdmin, portController.createPort);
router.put('/:id', isAdmin, portController.updatePort);
router.delete('/:id', isAdmin, portController.deletePort);

router.get('/:portId/ships', portController.getShipsByPort);
router.get('/:portId/berths', portController.getBerthsByPort);
router.get('/:portId/trips', portController.getTripsByPort);
router.get('/:portId/movements', portController.getMovementsByPort);

module.exports = router;
