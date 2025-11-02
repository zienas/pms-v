// src/services/berthService.js
const db = require('../db');

const getAll = async () => {
    const { rows } = await db.query('SELECT * FROM berths ORDER BY name ASC');
    return rows;
};

const create = async (portId, berthData) => {
    const { name, type, maxLength, maxDraft, equipment, quayId, positionOnQuay, geometry, radius } = berthData;
    const newId = `berth-${Date.now()}`;
    const { rows } = await db.query(
        `INSERT INTO berths (id, port_id, name, type, max_length, max_draft, equipment, quay_id, position_on_quay, geometry, radius)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, ST_GeomFromGeoJSON($10), $11) RETURNING *`,
        [newId, portId, name, type, maxLength, maxDraft, equipment, quayId, positionOnQuay, JSON.stringify(geometry), radius]
    );
    return rows[0];
};

const update = async (id, berthData) => {
    const { name, type, maxLength, maxDraft, equipment, quayId, positionOnQuay, geometry, radius } = berthData;
    const { rows } = await db.query(
        `UPDATE berths SET name=$1, type=$2, max_length=$3, max_draft=$4, equipment=$5, quay_id=$6, position_on_quay=$7, geometry=ST_GeomFromGeoJSON($8), radius=$9
         WHERE id = $10 RETURNING *`,
        [name, type, maxLength, maxDraft, equipment, quayId, positionOnQuay, JSON.stringify(geometry), radius, id]
    );
    return rows[0];
};

const deleteById = async (id) => {
    await db.query('DELETE FROM berths WHERE id = $1', [id]);
};

module.exports = { getAll, create, update, deleteById };
