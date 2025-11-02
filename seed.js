// seed.js
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { query } = require('./src/db');

const usersToSeed = [
    { 
        id: 'user-admin', name: 'Admin User', role: 'Administrator', password: 'password', forcePasswordChange: false,
        email: 'admin@portauthority.gov', phone: '+65 6123 0001', gsm: '', company: 'Port Authority HQ', portId: null
    },
    { 
        id: 'user-supervisor', name: 'Supervisor Sam', role: 'Supervisor', portId: 'port-sg', password: 'password', forcePasswordChange: true,
        email: 'sam.s@portauthority.gov', phone: '+65 6123 1001', gsm: '+65 9123 1001', company: 'Port Authority SG'
    },
    { 
        id: 'user-op', name: 'Operator Olivia', role: 'Port Operator', portId: 'port-sg', password: 'password', forcePasswordChange: true,
        email: 'olivia.o@portauthority.gov', phone: '+65 6123 1002', gsm: '', company: 'Port Authority SG'
    },
    { 
        id: 'user-pilot', name: 'Pilot Pete', role: 'Pilot', portId: 'port-sg', password: 'password', forcePasswordChange: true,
        email: 'pete@harborpilots.com', phone: '', gsm: '+65 9234 2001', company: 'Harbor Pilots Inc.'
    },
    { 
        id: 'user-agent', name: 'Agent Anna', role: 'Maritime Agent', portId: 'port-sg', password: 'password', forcePasswordChange: true,
        email: 'anna.a@oceanic.com', phone: '+65 6345 3001', gsm: '+65 9345 3001', company: 'Oceanic Shipping Agency'
    },
];

const seedDatabase = async () => {
    try {
        console.log('Starting to seed the database...');

        // Clear existing users to prevent duplicates
        console.log('Deleting existing users...');
        await query('DELETE FROM users', []);
        console.log('Existing users deleted.');

        for (const user of usersToSeed) {
            // Hash the password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(user.password, salt);

            const { id, name, email, phone, gsm, company, role, portId, forcePasswordChange } = user;
            
            await query(
                `INSERT INTO users (id, name, email, phone, gsm, company, role, password, port_id, force_password_change)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                [id, name, email, phone, gsm, company, role, hashedPassword, portId, forcePasswordChange]
            );
            console.log(`- Seeded user: ${name}`);
        }
        
        console.log('Database seeding completed successfully!');
    } catch (error) {
        console.error('Error seeding database:', error);
    } finally {
        // Since this is a script, we should end the process.
        // The pool will handle closing connections gracefully.
        process.exit(0);
    }
};

seedDatabase();
