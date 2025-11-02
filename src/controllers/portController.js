// src/controllers/portController.js
const portService = require('../services/portService');

const getAllPorts = async (req, res) => {
    try {
        const ports = await portService.getAll();
        res.status(200).json(ports);
    } catch (error) {
        res.status(500).json({ message: 'Failed to retrieve ports.' });
    }
};

const createPort = async (req, res) => {
    try {
        const newPort = await portService.create(req.body);
        res.status(201).json(newPort);
    } catch (error) {
        res.status(500).json({ message: 'Failed to create port.' });
    }
};

const updatePort = async (req, res) => {
    try {
        const updatedPort = await portService.update(req.params.id, req.body);
        res.status(200).json(updatedPort);
    } catch (error) {
        res.status(500).json({ message: 'Failed to update port.' });
    }
};

const deletePort = async (req, res) => {
    try {
        await portService.deleteById(req.params.id);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete port.' });
    }
};

const getShipsByPort = async (req, res) => {
    try {
        const ships = await portService.getShips(req.params.portId);
        res.status(200).json(ships);
    } catch (error) {
        res.status(500).json({ message: 'Failed to retrieve ships for port.' });
    }
};

const getBerthsByPort = async (req, res) => {
    try {
        const berths = await portService.getBerths(req.params.portId);
        res.status(200).json(berths);
    } catch (error) {
        res.status(500).json({ message: 'Failed to retrieve berths for port.' });
    }
};

const getTripsByPort = async (req, res) => {
    try {
        const trips = await portService.getTrips(req.params.portId);
        res.status(200).json(trips);
    } catch (error) {
        res.status(500).json({ message: 'Failed to retrieve trips for port.' });
    }
};

const getMovementsByPort = async (req, res) => {
    try {
        const movements = await portService.getMovements(req.params.portId);
        res.status(200).json(movements);
    } catch (error) {
        res.status(500).json({ message: 'Failed to retrieve movements for port.' });
    }
};


module.exports = {
    getAllPorts, createPort, updatePort, deletePort,
    getShipsByPort, getBerthsByPort, getTripsByPort, getMovementsByPort
};
