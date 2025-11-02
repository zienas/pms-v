// server.js
require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { pool } = require('./src/db');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);

// --- Middleware ---
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true, // Allow cookies to be sent
}));
app.use(express.json()); // Parse incoming JSON bodies

// --- Session Setup ---
// Note: Ensure you have created the 'user_sessions' table in your database.
// The deploy.sh script handles this.
app.use(session({
    store: new pgSession({
        pool: pool,
        tableName: 'user_sessions'
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        httpOnly: true, // Prevents client-side JS from reading the cookie
        maxAge: 1000 * 60 * 60 * 24 // 24 hours
    }
}));

// --- WebSocket Server ---
const wss = new WebSocket.Server({ server });

// Global function to broadcast messages to all connected clients
const broadcast = (data) => {
  const message = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
};

// Make the broadcast function available to our controllers via the request object.
app.use((req, res, next) => {
    req.broadcast = broadcast;
    next();
});

wss.on('connection', (ws) => {
  console.log('[WSS] Client connected.');
  ws.on('close', () => {
    console.log('[WSS] Client disconnected.');
  });
});

// --- Health Check Endpoint ---
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// --- API Routes ---
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/users', require('./src/routes/userRoutes'));
app.use('/api/ports', require('./src/routes/portRoutes'));
app.use('/api/berths', require('./src/routes/berthRoutes'));
app.use('/api/ships', require('./src/routes/shipRoutes'));
app.use('/api/trips', require('./src/routes/tripRoutes'));
app.use('/api/logs', require('./src/routes/logRoutes'));
// app.use('/api/ais', require('./src/routes/aisRoutes'));

// --- Start the Server ---
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});