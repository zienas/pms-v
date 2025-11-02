// src/services/tripService.js
const db = require('../db');

const toCamelCase = (obj) => ({
    ...obj,
    shipId: obj.ship_id,
    portId: obj.port_id,
    arrivalTimestamp: obj.arrival_timestamp,
    departureTimestamp: obj.departure_timestamp,
    vesselName: obj.vessel_name,
    vesselImo: obj.vessel_imo,
    agentId: obj.agent_id,
    pilotId: obj.pilot_id,
});

const getById = async (id) => {
    const { rows } = await db.query('SELECT * FROM trips WHERE id = $1', [id]);
    return toCamelCase(rows[0]);
};

const update = async (id, tripData) => {
    const { agentId, pilotId } = tripData;
    const { rows } = await db.query(
        'UPDATE trips SET agent_id = $1, pilot_id = $2 WHERE id = $3 RETURNING *',
        [agentId, pilotId, id]
    );
    return toCamelCase(rows[0]);
};

module.exports = { getById, update };
