// src/services/portService.js
const db = require('../db');

const getAll = async () => {
    const { rows } = await db.query('SELECT * FROM ports ORDER BY name ASC');
    return rows;
};

const create = async (portData) => {
    const { name, lat, lon, geometry, boundaryType, boundaryRadius, defaultZoom, mapTheme, logoImage } = portData;
    const newId = `port-${Date.now()}`;
    const { rows } = await db.query(
        `INSERT INTO ports (id, name, lat, lon, geometry, boundary_type, boundary_radius, default_zoom, map_theme, logo_image)
         VALUES ($1, $2, $3, $4, ST_GeomFromGeoJSON($5), $6, $7, $8, $9, $10) RETURNING *`,
        [newId, name, lat, lon, JSON.stringify(geometry), boundaryType, boundaryRadius, defaultZoom, mapTheme, logoImage]
    );
    return rows[0];
};

const update = async (id, portData) => {
    const { name, lat, lon, geometry, boundaryType, boundaryRadius, defaultZoom, mapTheme, logoImage } = portData;
    const { rows } = await db.query(
        `UPDATE ports SET name=$1, lat=$2, lon=$3, geometry=ST_GeomFromGeoJSON($4), boundary_type=$5, boundary_radius=$6, default_zoom=$7, map_theme=$8, logo_image=$9
         WHERE id = $10 RETURNING *`,
        [name, lat, lon, JSON.stringify(geometry), boundaryType, boundaryRadius, defaultZoom, mapTheme, logoImage, id]
    );
    return rows[0];
};

const deleteById = async (id) => {
    await db.query('DELETE FROM ports WHERE id = $1', [id]);
};

const getShips = (portId) => db.query('SELECT * FROM ships WHERE port_id = $1', [portId]).then(res => res.rows);
const getBerths = (portId) => db.query('SELECT * FROM berths WHERE port_id = $1', [portId]).then(res => res.rows);
const getTrips = (portId) => db.query('SELECT * FROM trips WHERE port_id = $1', [portId]).then(res => res.rows);
const getMovements = (portId) => db.query('SELECT * FROM ship_movements WHERE port_id = $1 ORDER BY timestamp DESC', [portId]).then(res => res.rows);

module.exports = { getAll, create, update, deleteById, getShips, getBerths, getTrips, getMovements };
