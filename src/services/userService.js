// src/services/userService.js
const db = require('../db');
const bcrypt = require('bcryptjs');

// Helper to convert snake_case from DB to camelCase for the client
const toCamelCase = (user) => {
    if (!user) return null;
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        gsm: user.gsm,
        company: user.company,
        role: user.role,
        portId: user.port_id,
        forcePasswordChange: user.force_password_change,
        notes: user.notes,
    };
};

const authenticate = async (name, password) => {
    const { rows } = await db.query('SELECT * FROM users WHERE name = $1', [name]);
    if (rows.length === 0) {
        return null;
    }
    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        return null;
    }
    return user;
};

const getAll = async () => {
    const { rows } = await db.query('SELECT * FROM users ORDER BY name ASC');
    return rows.map(toCamelCase);
};

const create = async (userData) => {
    const { name, email, phone, gsm, company, role, portId, password, notes } = userData;
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const newId = `user-${Date.now()}`;
    const forcePasswordChange = role !== 'Administrator';

    const { rows } = await db.query(
        `INSERT INTO users (id, name, email, phone, gsm, company, role, password, port_id, force_password_change, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [newId, name, email, phone, gsm, company, role, hashedPassword, portId, forcePasswordChange, notes]
    );
    return toCamelCase(rows[0]);
};

const update = async (id, userData) => {
    const { name, email, phone, gsm, company, role, portId, password, notes, forcePasswordChange } = userData;
    
    let hashedPassword;
    if (password) {
        const salt = await bcrypt.genSalt(10);
        hashedPassword = await bcrypt.hash(password, salt);
    }

    const { rows } = await db.query(
        `UPDATE users SET
            name = COALESCE($1, name),
            email = COALESCE($2, email),
            phone = COALESCE($3, phone),
            gsm = COALESCE($4, gsm),
            company = COALESCE($5, company),
            role = COALESCE($6, role),
            port_id = COALESCE($7, port_id),
            password = COALESCE($8, password),
            notes = COALESCE($9, notes),
            force_password_change = COALESCE($10, force_password_change)
         WHERE id = $11 RETURNING *`,
        [name, email, phone, gsm, company, role, portId, hashedPassword, notes, forcePasswordChange, id]
    );
    return toCamelCase(rows[0]);
};

const updatePassword = async (id, newPassword) => {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    const { rows } = await db.query(
        `UPDATE users SET password = $1, force_password_change = false WHERE id = $2 RETURNING *`,
        [hashedPassword, id]
    );
    return toCamelCase(rows[0]);
};

const deleteById = async (id) => {
    const { rowCount } = await db.query('DELETE FROM users WHERE id = $1', [id]);
    return rowCount > 0;
};

module.exports = {
    authenticate,
    getAll,
    create,
    update,
    updatePassword,
    deleteById,
};
