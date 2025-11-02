// src/services/shipService.js
const db = require('../db');

const toCamelCase = (obj) => ({
    ...obj,
    portId: obj.port_id,
    callSign: obj.call_sign,
    maxLength: obj.max_length,
    maxDraft: obj.max_draft,
    quayId: obj.quay_id,
    positionOnQuay: obj.position_on_quay,
    departureDate: obj.departure_date,
    pilotId: obj.pilot_id,
    agentId: obj.agent_id,
    currentTripId: obj.current_trip_id,
    hasDangerousGoods: obj.has_dangerous_goods,
    rateOfTurn: obj.rate_of_turn,
    targetLat: obj.target_lat,
    targetLon: obj.target_lon,
});

const createMovement = (ship, eventType, details) => {
    const movementId = `mov-${Date.now()}-${Math.random()}`;
    db.query(
        'INSERT INTO ship_movements (id, ship_id, port_id, trip_id, event_type, "timestamp", details) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [movementId, ship.id, ship.port_id, ship.current_trip_id, eventType, new Date().toISOString(), JSON.stringify(details)]
    );
};

const getAll = async () => db.query('SELECT * FROM ships').then(res => res.rows.map(toCamelCase));
const getById = async (id) => db.query('SELECT * FROM ships WHERE id = $1', [id]).then(res => toCamelCase(res.rows[0]));
const getHistory = async (shipId) => db.query('SELECT * FROM ship_movements WHERE ship_id = $1 ORDER BY "timestamp" DESC', [shipId]).then(res => res.rows);
const deleteById = (id) => db.query('DELETE FROM ships WHERE id = $1', [id]);

const create = async (shipData) => {
    const { portId, name, imo, callSign, type, length, draft, flag, eta, etd, status, berthIds, pilotId, agentId, hasDangerousGoods } = shipData;
    const newShipId = `ship-${Date.now()}`;
    const newTripId = `trip-${Date.now()}`;

    // Create ship and trip in a transaction
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        const shipRes = await client.query(
            `INSERT INTO ships (id, port_id, name, imo, call_sign, type, length, draft, flag, eta, etd, status, pilot_id, agent_id, current_trip_id, has_dangerous_goods)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING *`,
            [newShipId, portId, name, imo, callSign, type, length, draft, flag, eta, etd, status, pilotId, agentId, newTripId, hasDangerousGoods]
        );
        const newShip = shipRes.rows[0];

        await client.query(
            `INSERT INTO trips (id, ship_id, port_id, arrival_timestamp, status, vessel_name, vessel_imo, agent_id, pilot_id)
             VALUES ($1, $2, $3, $4, 'Active', $5, $6, $7, $8)`,
            [newTripId, newShipId, portId, eta, name, imo, agentId, pilotId]
        );

        if (berthIds && berthIds.length > 0) {
            for (const berthId of berthIds) {
                await client.query('INSERT INTO ship_berth_assignments (ship_id, berth_id) VALUES ($1, $2)', [newShipId, berthId]);
            }
        }
        await client.query('COMMIT');
        createMovement(newShip, 'Vessel Registered', { message: `Vessel ${name} was registered.` });
        return toCamelCase(newShip);
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
};

const update = async (id, shipData) => {
    const { name, imo, callSign, type, length, draft, flag, eta, etd, status, berthIds, pilotId, agentId, hasDangerousGoods } = shipData;
    
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        const oldShipRes = await client.query('SELECT * FROM ships WHERE id = $1 FOR UPDATE', [id]);
        const oldShip = oldShipRes.rows[0];
        
        const shipRes = await client.query(
            `UPDATE ships SET name=$1, imo=$2, call_sign=$3, type=$4, length=$5, draft=$6, flag=$7, eta=$8, etd=$9, status=$10, pilot_id=$11, agent_id=$12, has_dangerous_goods=$13
             WHERE id = $14 RETURNING *`,
            [name, imo, callSign, type, length, draft, flag, eta, etd, status, pilotId, agentId, hasDangerousGoods, id]
        );
        const updatedShip = shipRes.rows[0];

        // Handle berth assignments
        await client.query('DELETE FROM ship_berth_assignments WHERE ship_id = $1', [id]);
        if (berthIds && berthIds.length > 0) {
            for (const berthId of berthIds) {
                await client.query('INSERT INTO ship_berth_assignments (ship_id, berth_id) VALUES ($1, $2)', [id, berthId]);
            }
        }
        await client.query('COMMIT');

        // Logging movements (outside transaction)
        if (oldShip.status !== updatedShip.status) createMovement(updatedShip, 'Status Change', { message: `Status changed from ${oldShip.status} to ${updatedShip.status}` });
        if (oldShip.pilot_id !== updatedShip.pilot_id) createMovement(updatedShip, 'Pilot Assignment', { message: `Pilot changed.` });
        if (oldShip.agent_id !== updatedShip.agent_id) createMovement(updatedShip, 'Agent Assignment', { message: `Agent changed.` });
        // more detailed logging can be added here
        
        return toCamelCase(updatedShip);
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
};

module.exports = { getAll, getById, create, update, deleteById, getHistory };
