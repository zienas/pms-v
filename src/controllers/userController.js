// src/controllers/userController.js
const userService = require('../services/userService');

const getAllUsers = async (req, res) => {
    try {
        const users = await userService.getAll();
        res.status(200).json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Failed to retrieve users.' });
    }
};

const createUser = async (req, res) => {
    try {
        const newUser = await userService.create(req.body);
        res.status(201).json(newUser);
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ message: 'Failed to create user.' });
    }
};

const updateUser = async (req, res) => {
    try {
        const updatedUser = await userService.update(req.params.id, req.body);
        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found.' });
        }
        res.status(200).json(updatedUser);
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ message: 'Failed to update user.' });
    }
};

const updateOwnPassword = async (req, res) => {
    const { id } = req.params;
    const { newPassword } = req.body;

    // Security check: ensure the logged-in user is only changing their own password
    if (req.session.user.id !== id) {
        return res.status(403).json({ message: 'Forbidden: You can only change your own password.' });
    }

    if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    try {
        const updatedUser = await userService.updatePassword(id, newPassword);
        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found.' });
        }
        res.status(200).json(updatedUser);
    } catch (error) {
        console.error('Error updating password:', error);
        res.status(500).json({ message: 'Failed to update password.' });
    }
};

const deleteUser = async (req, res) => {
    try {
        const success = await userService.deleteById(req.params.id);
        if (!success) {
            return res.status(404).json({ message: 'User not found.' });
        }
        res.status(204).send(); // No Content
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Failed to delete user.' });
    }
};

module.exports = {
    getAllUsers,
    createUser,
    updateUser,
    updateOwnPassword,
    deleteUser,
};
