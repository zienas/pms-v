#!/bin/bash

# ==============================================================================
# Port Vessel Management System - Automated Backend Setup Script (Simplified)
# ==============================================================================

# --- Color Codes & Helpers ---
C_RESET='\033[0m'; C_RED='\033[0;31m'; C_GREEN='\033[0;32m'; C_YELLOW='\033[0;33m'; C_CYAN='\033[0;36m';
print_step() { echo -e "\n${C_YELLOW}>>> $1${C_RESET}"; }
print_success() { echo -e "${C_GREEN}✔ $1${C_RESET}"; }
print_error() { echo -e "${C_RED}✖ ERROR: $1${C_RESET}" >&2; exit 1; }
check_root() { if [ "$EUID" -ne 0 ]; then print_error "This script must be run as root. Please use 'sudo ./setup-backend.sh'"; fi; }

# --- Main Script ---
check_root
echo -e "${C_CYAN}======================================================${C_RESET}"
echo -e "${C_CYAN}  PVMS Automated Backend Setup Script (Simplified)${C_RESET}"
echo -e "${C_CYAN}======================================================${C_RESET}"
read -p "Press [Enter] to begin..."

# --- Gather User Input ---
print_step "Gathering required information..."
read -p "Enter your frontend domain name (e.g., https://pvms.example.com): " FRONTEND_URL
read -s -p "Enter the database password you created during server deployment: " DB_PASSWORD; echo
SESSION_SECRET=$(openssl rand -hex 32)
print_success "Information gathered."

# --- Project Setup ---
BACKEND_DIR="/opt/pms-backend"
print_step "Setting up project in ${BACKEND_DIR}..."
cd "$BACKEND_DIR" || print_error "Failed to change directory to ${BACKEND_DIR}"
print_step "Initializing Node.js project and installing dependencies..."
npm init -y >/dev/null 2>&1
npm install express pg ws cors bcryptjs dotenv express-session connect-pg-simple || print_error "Failed to install npm packages."
print_success "Dependencies installed."

# --- Create Core Files ---
print_step "Creating core configuration and server files..."
# .gitignore
echo -e "node_modules\n.env" > .gitignore

# .env
cat > .env << EOL
DB_USER=port_user
DB_HOST=localhost
DB_DATABASE=port_db
DB_PASSWORD=${DB_PASSWORD}
DB_PORT=5432
PORT=4000
SESSION_SECRET=${SESSION_SECRET}
FRONTEND_URL=${FRONTEND_URL}
EOL

# src/db.js
mkdir -p src
cat > src/db.js << EOL
const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
});
module.exports = { query: (text, params) => pool.query(text, params), pool };
EOL

# server.js
cat > server.js << EOL
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

app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(session({
    store: new pgSession({ pool: pool, tableName: 'user_sessions' }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production', httpOnly: true, maxAge: 1000 * 60 * 60 * 24 }
}));

const wss = new WebSocket.Server({ server });
const broadcast = (data) => {
  wss.clients.forEach(c => c.readyState === WebSocket.OPEN && c.send(JSON.stringify(data)));
};
app.use((req, res, next) => { req.broadcast = broadcast; next(); });
wss.on('connection', ws => console.log('[WSS] Client connected.'));

app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

// --- API Routes (Commented out until created) ---
// app.use('/api/auth', require('./src/routes/authRoutes'));
// ... add other routes here as you build them ...

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(\`Server listening on port \${PORT}\`));
EOL
print_success "Project files created."

# --- PM2 Setup ---
print_step "Setting up PM2 to run the API as a service..."
if ! command -v pm2 &> /dev/null; then npm install -g pm2 || print_error "Failed to install PM2."; fi

SERVICE_NAME="pms-api-backend"
pm2 stop "$SERVICE_NAME" >/dev/null 2>&1
pm2 delete "$SERVICE_NAME" >/dev/null 2>&1
pm2 start server.js --name "$SERVICE_NAME" || print_error "Failed to start API with PM2."
pm2 save || print_error "Failed to save PM2 process list."

# The 'pm2 startup' command generates another command that must be run as root.
# We capture that command, clean any potential problematic characters (like carriage returns), and then execute it.
STARTUP_CMD_RAW=$(pm2 startup | tail -n 1)
STARTUP_CMD_CLEAN=$(echo "$STARTUP_CMD_RAW" | tr -d '\r')

# Check if we got a command to run
if [[ -z "$STARTUP_CMD_CLEAN" || "$STARTUP_CMD_CLEAN" == "pm2 startup" ]]; then
    print_error "Could not generate PM2 startup command. Please run 'sudo pm2 startup' manually and execute the command it provides."
fi

echo "Executing PM2 startup command: $STARTUP_CMD_CLEAN"
eval "$STARTUP_CMD_CLEAN" || print_error "Failed to execute PM2 startup command. Please run 'sudo pm2 startup' manually and execute the command it provides."
print_success "API service is running via PM2."

# --- Final Instructions ---
echo -e "\n${C_GREEN}Backend setup is complete!${C_RESET}"
echo -e "----------------------------------------------------------------------"
echo -e "The basic backend server is now running."
echo -e "You can view its logs with: ${C_CYAN}pm2 logs ${SERVICE_NAME}${C_RESET}"
echo -e "\n${C_YELLOW}NEXT STEPS:${C_RESET}"
echo -e "1. Continue with the ${C_WHITE}HOWTO-BACKEND.md${C_RESET} guide to create your API routes"
echo -e "   and controller logic inside the ${C_CYAN}${BACKEND_DIR}/src/${C_RESET} directory."
echo
echo -e "2. As you create each route file (e.g., \`src/routes/authRoutes.js\`),"
echo -e "   uncomment the corresponding line in ${C_CYAN}server.js${C_RESET}."
echo
echo -e "3. Remember to restart the service with ${C_CYAN}pm2 restart ${SERVICE_NAME}${C_RESET} after making changes."
echo -e "----------------------------------------------------------------------"

exit 0