// src/controllers/logController.js
const logService = require('../services/logService');

const getLoginHistory = async (req, res) => {
    try {
        const logs = await logService.getLoginHistory();
        res.status(200).json(logs);
    } catch (error) {
        res.status(500).json({ message: 'Failed to retrieve login history.' });
    }
};

const getInteractionLogs = async (req, res) => {
    try {
        const logs = await logService.getInteractionLogs();
        res.status(200).json(logs);
    } catch (error) {
        res.status(500).json({ message: 'Failed to retrieve interaction logs.' });
    }
};

const getApiLogs = async (req, res) => {
    try {
        const logs = await logService.getApiLogs();
        res.status(200).json(logs);
    } catch (error) {
        res.status(500).json({ message: 'Failed to retrieve API logs.' });
    }
};

module.exports = { getLoginHistory, getInteractionLogs, getApiLogs };
