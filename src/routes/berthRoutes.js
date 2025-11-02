// src/routes/berthRoutes.js
const express = require('express');
const router = express.Router();
const berthController = require('../controllers/berthController');
const { isLoggedIn, isAdmin } = require('../middleware/authMiddleware');

// All berth routes should require login
router.use(isLoggedIn);

router.get('/', berthController.getAllBerths);
router.post('/ports/:portId/berths', isAdmin, berthController.createBerth);
router.put('/:id', isAdmin, berthController.updateBerth);
router.delete('/:id', isAdmin, berthController.deleteBerth);

module.exports = router;
