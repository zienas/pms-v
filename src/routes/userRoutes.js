// src/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { isLoggedIn, isSupervisorOrAdmin, isAdmin } = require('../middleware/authMiddleware');

// Get all users (accessible to logged-in users)
router.get('/', isLoggedIn, userController.getAllUsers);

// Create a new user (only supervisors and admins)
router.post('/', isSupervisorOrAdmin, userController.createUser);

// Update a user (only supervisors and admins)
router.put('/:id', isSupervisorOrAdmin, userController.updateUser);

// Update own password (any logged-in user)
router.put('/:id/password', isLoggedIn, userController.updateOwnPassword);

// Delete a user (only supervisors and admins)
router.delete('/:id', isSupervisorOrAdmin, userController.deleteUser);

module.exports = router;
