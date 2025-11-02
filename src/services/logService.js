// src/services/logService.js
const db = require('../db');

const getLoginHistory = async () => {
    const { rows } = await db.query('SELECT * FROM login_history ORDER BY "timestamp" DESC');
    return rows.map(r => ({ ...r, portName: r.port_name, userName: r.user_name, logoutTimestamp: r.logout_timestamp }));
};

const getInteractionLogs = async () => {
    const { rows } = await db.query('SELECT * FROM interaction_log ORDER BY "timestamp" DESC');
    return rows.map(r => ({ ...r, eventType: r.event_type, userName: r.user_name }));
};

const getApiLogs = async () => {
    const { rows } = await db.query('SELECT * FROM api_log ORDER BY "timestamp" DESC');
    return rows.map(r => ({ ...r, statusCode: r.status_code, durationMs: r.duration_ms, userName: r.user_name }));
};

module.exports = { getLoginHistory, getInteractionLogs, getApiLogs };
