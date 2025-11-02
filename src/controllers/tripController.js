// src/controllers/tripController.js
const tripService = require('../services/tripService');

const getTripById = async (req, res) => {
    try {
        const trip = await tripService.getById(req.params.id);
        if (!trip) return res.status(404).json({ message: 'Trip not found.' });
        res.status(200).json(trip);
    } catch (error) {
        res.status(500).json({ message: 'Failed to retrieve trip.' });
    }
};

const updateTrip = async (req, res) => {
    try {
        const updatedTrip = await tripService.update(req.params.id, req.body);
        res.status(200).json(updatedTrip);
    } catch (error) {
        res.status(500).json({ message: 'Failed to update trip.' });
    }
};

module.exports = { getTripById, updateTrip };
