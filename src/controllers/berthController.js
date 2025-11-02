// src/controllers/berthController.js
const berthService = require('../services/berthService');

const getAllBerths = async (req, res) => {
    try {
        const berths = await berthService.getAll();
        res.status(200).json(berths);
    } catch (error) {
        res.status(500).json({ message: 'Failed to retrieve berths.' });
    }
};

const createBerth = async (req, res) => {
    try {
        const newBerth = await berthService.create(req.params.portId, req.body);
        res.status(201).json(newBerth);
    } catch (error) {
        res.status(500).json({ message: 'Failed to create berth.' });
    }
};

const updateBerth = async (req, res) => {
    try {
        const updatedBerth = await berthService.update(req.params.id, req.body);
        res.status(200).json(updatedBerth);
    } catch (error) {
        res.status(500).json({ message: 'Failed to update berth.' });
    }
};

const deleteBerth = async (req, res) => {
    try {
        await berthService.deleteById(req.params.id);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete berth.' });
    }
};

module.exports = { getAllBerths, createBerth, updateBerth, deleteBerth };
