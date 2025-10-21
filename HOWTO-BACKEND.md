# How to Build the Backend API Service

## Introduction

This guide provides a step-by-step tutorial for building the backend API service required for the Port Vessel Management System. The current frontend application uses a `localStorage`-based simulator (`services/api.ts`) for demonstration purposes. This backend will replace that simulation with a real, persistent server that connects the frontend to the PostgreSQL database you've already configured.

This service will be responsible for:
-   Handling all data requests (CRUD operations) from the frontend.
-   Managing business logic and data validation.
-   Authenticating users against the database.
-   Broadcasting real-time updates (like ship movements from an AIS feed) to all connected clients using WebSockets.

## Technology Stack

We will use a modern and widely-supported stack for this service:
-   **Runtime**: **Node.js** - A fast and efficient JavaScript runtime.
-   **Framework**: **Express.js** - A minimal and flexible Node.js web application framework.
-   **Database Driver**: **`pg` (node-postgres)** - The go-to library for interfacing with PostgreSQL in Node.js.
-   **WebSockets**: **`ws`** - A simple to use, fast, and thorough WebSocket client and server library.
-   **Security**: **`bcryptjs`** for securely hashing passwords and **`cors`** for managing cross-origin requests.
-   **Sessions**: **`express-session`** and **`connect-pg-simple`** for persistent, database-backed user sessions.
-   **Environment Variables**: **`dotenv`** to manage configuration and secrets.

---

## Part 1: Project Setup

These steps should be performed on your local machine or directly on your VPS, inside the directory you created in the deployment guide.

### Step 1: Navigate to the Backend Directory

Navigate into the `pms-backend` directory you created when setting up the database in the `HOWTO-DEPLOY.md` guide.

```bash
# Navigate into the existing directory
cd ~/pms-backend
```

### Step 2: Initialize the Node.js Project

This command creates a `package.json` file, which will manage your project's dependencies.

```bash
npm init -y
```

### Step 3: Install Dependencies

Install all the necessary libraries from npm.

```bash
npm install express pg ws cors bcryptjs dotenv express-session connect-pg-simple
```
-   `express`: The web server framework.
-   `pg`: The PostgreSQL client.
-   `ws`: The WebSocket server.
-   `cors`: To allow your frontend (on a different origin) to communicate with this API.
-   `bcryptjs`: To hash and verify user passwords.
-   `dotenv`: To load database credentials from a `.env` file.
-   `express-session`: Middleware for managing user sessions.
-   `connect-pg-simple`: A session store to save session data in PostgreSQL.

### Step 4: Create the Project Structure

A good folder structure helps keep your code organized. Create the following directories and files inside your `pms-backend` directory.

```
/pms-backend
|-- /src
|   |-- /controllers    # Handles incoming requests and sends responses.
|   |-- /routes         # Defines the API endpoints (URLs).
|   |-- /services       # Contains the core business logic and database queries.
|   |-- db.js           # Manages the database connection pool.
|-- .env                # Stores secrets like database credentials (DO NOT COMMIT to Git).
|-- .gitignore          # Tells Git to ignore files like node_modules and .env.
|-- server.js           # The main entry point for the application.
|-- package.json
+-- docker-compose.yml  # Already created from the deployment guide
```

---

## Part 2: Database Connection and Server Setup

### Step 1: Configure Environment Variables

Create a file named `.env` in the root of your `pms-backend` directory. This is where you'll store your database connection details. **Remember to use the same credentials you set up in `docker-compose.yml`**.

```ini
# .env

# PostgreSQL Database Connection
DB_USER=port_user
DB_HOST=localhost
DB_DATABASE=port_db
DB_PASSWORD=a_very_strong_password # Use the password you created!
DB_PORT=5432

# API Server Port
PORT=4000

# Session Secret - Change this to a long, random string!
SESSION_SECRET=a_very_secret_key_for_sessions

# Frontend URL for CORS
FRONTEND_URL=http://your_vps_ip_or_domain
```

### Step 2: Create the Database Connection Pool

Create the file `src/db.js` to manage a pool of connections to your PostgreSQL database. A connection pool is much more efficient than creating a new connection for every query.

```javascript
// src/db.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool, // Export the pool for the session store
};
```

### Step 3: Set Up the Express Server with Sessions

Now, create the main `server.js` file. This will initialize the Express app, set up middleware including sessions, and create the HTTP server.

```javascript
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
// See HOWTO-DEPLOY.md for the SQL script.
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
// app.use('/api/auth', require('./src/routes/authRoutes'));
// app.use('/api/ports', require('./src/routes/portRoutes'));
// app.use('/api/berths', require('./src/routes/berthRoutes'));
// app.use('/api/ships', require('./src/routes/shipRoutes'));
// app.use('/api/trips', require('./src/routes/tripRoutes'));
// app.use('/api/users', require('./src/routes/userRoutes'));
// app.use('/api/logs', require('./src/routes/logRoutes'));
// app.use('/api/ais', require('./src/routes/aisRoutes'));

// --- Start the Server ---
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
```
**Note**: The session store requires a table named `user_sessions` in the database. This has been added to the setup script in `HOWTO-DEPLOY.md`.

---

## Part 3: API Endpoint Specification

This section details the RESTful API endpoints your backend should expose. This structure matches the refactored `services/api.ts` file in the frontend.

### Authentication (`/api/auth`)
-   **`POST /login`**: Authenticates a user.
    -   **Body**: `{ "name": "...", "password": "...", "portId": "..." }`
    -   **Response**: `200 OK` with the `User` object on success. Creates a session cookie.
-   **`POST /logout`**: Logs out a user.
    -   **Body**: `{ "userId": "..." }`
    -   **Response**: `204 No Content`. Destroys the session.

### Ports (`/api/ports`)
-   **`GET /`**: Get all ports.
-   **`POST /`**: Create a new port.
-   **`GET /:portId/ships`**: Get all ships for a specific port.
-   **`GET /:portId/berths`**: Get all berths for a specific port.
-   **`GET /:portId/trips`**: Get all trips for a specific port.
-   **`GET /:portId/movements`**: Get all ship movements for a specific port.
-   **`PUT /:id`**: Update a port.
-   **`DELETE /:id`**: Delete a port.

### Berths (`/api/berths`)
-   **`GET /`**: Get all berths for all ports (for admin views).
-   **`POST /ports/:portId/berths`**: Create a new berth for a specific port.
-   **`PUT /:id`**: Update a specific berth.
-   **`DELETE /:id`**: Delete a specific berth.

### Ships (`/api/ships`)
-   **`GET /`**: Get all ships for all ports.
-   **`POST /`**: Create a new ship.
-   **`GET /:id`**: Get a single ship by its ID.
-   **`PUT /:id`**: Update a ship.
-   **`DELETE /:id`**: Delete a ship.
-   **`GET /:shipId/history`**: Get the full movement history for a single ship.

### Trips (`/api/trips`)
-   **`GET /:id`**: Get a single trip.
-   **`PUT /:id`**: Update a trip (e.g., assign pilot/agent).

### Users (`/api/users`)
-   **`GET /`**: Get a list of all users.
-   **`POST /`**: Create a new user.
-   **`PUT /:id`**: Update a user's details (name, role, port).
-   **`PUT /:id/password`**: Update a user's password.
-   **`DELETE /:id`**: Delete a user.

### Logs (`/api/logs`)
-   **`GET /login-history`**: Get the user login history log.

### AIS (`/api/ais`)
-   **`POST /update`**: Endpoint for the AIS Ingestion Service to post updates.
    -   **Body**: `{ "imo": "...", "portId": "...", "lat": ..., "lon": ... }`
    -   This endpoint should update the database and then broadcast the update via WebSockets.

---

## Part 4: Implementing the WebSocket Server

The WebSocket server is for pushing real-time updates to connected clients. It is now fully integrated into the main `server.js` file.

### Integrate with the AIS Endpoint Controller

The controller for `POST /api/ais/update` will use the `broadcast` function attached to the request object.

**Example AIS Controller (`src/controllers/aisController.js`):**
```javascript
const shipService = require('../services/shipService');

const updateFromAIS = async (req, res) => {
  const aisData = req.body; // { imo, portId, lat, lon, etc. }
  const { broadcast } = req; // Get the broadcast function from the request object

  try {
    // This service function would find or create a ship and update its data
    const updatedShip = await shipService.updateShipFromAisData(aisData);

    if (updatedShip) {
      // Broadcast the real-time update to all connected clients
      const message = {
        type: 'ship_position_update', // Must match what the frontend expects
        payload: {
          imo: updatedShip.imo,
          portId: updatedShip.port_id,
          lat: updatedShip.lat,
          lon: updatedShip.lon,
        },
      };
      broadcast(message);
    }

    res.status(200).json({ message: 'Update received' });
  } catch (error) {
    console.error('AIS Update Error:', error);
    res.status(500).json({ message: 'Failed to process AIS update.' });
  }
};

module.exports = { updateFromAIS };
```

---

## Part 5: Running and Deploying the Backend

### Step 1: Run Locally for Development

1.  Make sure your PostgreSQL Docker container is running.
2.  From your `/pms-backend` directory, run:
    ```bash
    node server.js
    ```
    You should see the "Server is listening..." message. You can now test your API endpoints by connecting your frontend.

### Step 2: Deploy to Production with PM2

The main backend API should be managed by PM2 on your server to ensure it's always running.

1.  Upload your entire `pms-backend` folder to your VPS (e.g., to `/home/user/pms-backend`).
2.  SSH into your VPS and navigate to the folder.
3.  Install dependencies: `npm install`
4.  Start the service with PM2:
    ```bash
    # Ensure you have a .env file configured on the server!
    pm2 start server.js --name "pms-api-backend"
    pm2 save
    pm2 startup
    # (Follow the on-screen instructions to complete the startup script setup)
    ```

Your backend API is now running and will restart automatically on boot or if it crashes.