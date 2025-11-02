// src/controllers/authController.js
const userService = require('../services/userService');
const db = require('../db');

const login = async (req, res) => {
    const { name, password, portId } = req.body;

    if (!name || !password || !portId) {
        return res.status(400).json({ message: 'Username, password, and portId are required.' });
    }

    try {
        const user = await userService.authenticate(name, password);

        if (!user) {
            return res.status(401).json({ message: 'Invalid username or password.' });
        }

        // Check if user is assigned to the selected port (Admins are exempt)
        if (user.role !== 'Administrator' && user.port_id !== portId) {
            return res.status(403).json({ message: 'User not assigned to this port.' });
        }

        // Create a session
        req.session.user = {
            id: user.id,
            name: user.name,
            role: user.role,
            portId: user.port_id,
        };

        // Log the login event
        const port = await db.query('SELECT name FROM ports WHERE id = $1', [portId]);
        const portName = port.rows.length > 0 ? port.rows[0].name : 'N/A';
        await db.query(
            'INSERT INTO login_history (id, user_id, user_name, port_id, port_name, "timestamp") VALUES ($1, $2, $3, $4, $5, $6)',
            [`hist-${Date.now()}`, user.id, user.name, portId, portName, new Date().toISOString()]
        );
        
        // Return user object to the client (without the password hash)
        const { password: _, ...userToReturn } = user;
        res.status(200).json(userToReturn);

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'An internal server error occurred during login.' });
    }
};

const logout = async (req, res) => {
    const { userId } = req.body; // Sent from frontend for logging purposes

    try {
        if (userId) {
            // Find the most recent active session for this user to update the logout time
            const result = await db.query(
                `UPDATE login_history SET logout_timestamp = $1 
                 WHERE user_id = $2 AND logout_timestamp IS NULL 
                 RETURNING id`,
                [new Date().toISOString(), userId]
            );
        }

        req.session.destroy(err => {
            if (err) {
                return res.status(500).json({ message: 'Could not log out, please try again.' });
            }
            res.clearCookie('connect.sid'); // The default session cookie name
            res.status(204).send();
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ message: 'An internal server error occurred during logout.' });
    }
};

module.exports = {
    login,
    logout,
};
