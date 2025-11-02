// src/controllers/shipController.js
const shipService = require('../services/shipService');

const getAllShips = async (req, res) => {
    try {
        const ships = await shipService.getAll();
        res.status(200).json(ships);
    } catch (error) {
        res.status(500).json({ message: 'Failed to retrieve ships.' });
    }
};

const getShipById = async (req, res) => {
    try {
        const ship = await shipService.getById(req.params.id);
        if (!ship) return res.status(404).json({ message: 'Ship not found.' });
        res.status(200).json(ship);
    } catch (error) {
        res.status(500).json({ message: 'Failed to retrieve ship.' });
    }
};

const createShip = async (req, res) => {
    try {
        const newShip = await shipService.create(req.body);
        res.status(201).json(newShip);
    } catch (error) {
        res.status(500).json({ message: 'Failed to create ship.' });
    }
};

const updateShip = async (req, res) => {
    try {
        const updatedShip = await shipService.update(req.params.id, req.body);
        res.status(200).json(updatedShip);
    } catch (error) {
        res.status(500).json({ message: 'Failed to update ship.' });
    }
};

const deleteShip = async (req, res) => {
    try {
        await shipService.deleteById(req.params.id);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete ship.' });
    }
};

const getShipHistory = async (req, res) => {
    try {
        const history = await shipService.getHistory(req.params.shipId);
        res.status(200).json(history);
    } catch (error) {
        res.status(500).json({ message: 'Failed to retrieve ship history.' });
    }
};

module.exports = {
    getAllShips, getShipById, createShip, updateShip, deleteShip, getShipHistory
};
