# How to Finalize the Backend API Setup

This guide provides the final steps needed to take the initialized backend project (created by `setup-backend.sh`) and make it a fully functional API by adding all the necessary application logic files.

## Prerequisites

Before starting, you must have already successfully run the `setup-backend.sh` script on your server. This means you should have the following files and directories in `/opt/pms-backend`:
- `server.js`
- `.env`
- `package.json`
- `src/db.js`
- `node_modules/`

## Step 1: Upload the Application Logic Files

You need to upload all the route, controller, and service files for the API. These files contain the actual code that handles data requests.

Place the files in their corresponding directories on your server inside `/opt/pms-backend/`.

**1. Middleware Files (Go into `/src/middleware/`)**
- `authMiddleware.js`

**2. Route Files (Go into `/src/routes/`)**
- `authRoutes.js`
- `userRoutes.js`
- `portRoutes.js`
- `berthRoutes.js`
- `shipRoutes.js`
- `tripRoutes.js`
- `logRoutes.js`

**3. Controller Files (Go into `/src/controllers/`)**
- `authController.js`
- `userController.js`
- `portController.js`
- `berthController.js`
- `shipController.js`
- `tripController.js`
- `logController.js`

**4. Service Files (Go into `/src/services/`)**
- `userService.js`
- `portService.js`
- `berthService.js`
- `shipService.js`
- `tripService.js`
- `logService.js`

## Step 2: Update the Main `server.js` File

The main server file needs to be told to use all the new route files you just uploaded.

**Replace** the contents of your existing `/opt/pms-backend/server.js` with the updated version that has all the `app.use(...)` lines uncommented.

The "API Routes" section should now look like this:
```javascript
// --- API Routes ---
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/users', require('./src/routes/userRoutes'));
app.use('/api/ports', require('./src/routes/portRoutes'));
app.use('/api/berths', require('./src/routes/berthRoutes'));
app.use('/api/ships', require('./src/routes/shipRoutes'));
app.use('/api/trips', require('./src/routes/tripRoutes'));
app.use('/api/logs', require('./src/routes/logRoutes'));
// app.use('/api/ais', require('./src/routes/aisRoutes')); // AIS is handled separately for now
```

## Step 3: Seed the Database with Initial Users (One-Time Step)

Your database is currently empty. You need to run the "seed" script to populate the `users` table with the default user accounts and their securely hashed passwords.

1.  Navigate to your backend directory on the server:
    ```bash
    cd /opt/pms-backend
    ```

2.  Run the seed command defined in `package.json`:
    ```bash
    npm run seed
    ```

You should see output indicating that the users are being deleted and re-added.

## Step 4: Restart the Backend Service

Your new code won't be active until you restart the application service managed by PM2.

Run the following command on your server:
```bash
pm2 restart pms-api-backend
```

## Verification

Your backend API is now complete and fully functional. The frontend application should now be able to log in users, fetch data from the database, and save changes back to the server.

You can check the status and logs of your backend service at any time using these commands:
-   **Check Status**: `pm2 status`
-   **View Logs**: `pm2 logs pms-api-backend`
