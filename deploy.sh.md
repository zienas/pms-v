#!/bin/bash

# ==============================================================================
# Port Vessel Management System - Automated Deployment Script
# ==============================================================================
#
# This script automates the setup of a fresh Debian-based VPS (Ubuntu 20.04+)
# for the PVMS frontend and database backend.
#
# It will:
# 1. Update the system and install Nginx, Docker, and Certbot.
# 2. Configure the UFW firewall.
# 3. Interactively prompt for domain, database password, and email.
# 4. Set up and start a PostgreSQL + PostGIS database in a Docker container.
# 5. Automatically initialize the required database schema.
# 6. Configure Nginx to serve the frontend application.
# 7. Secure the site with a free Let's Encrypt SSL certificate (HTTPS).
# 8. Provide final instructions for the user.
#
# USAGE:
# 1. Upload this script to your VPS: `scp deploy.sh user@your_vps_ip:~`
# 2. SSH into your VPS: `ssh user@your_vps_ip`
# 3. Make it executable: `chmod +x deploy.sh`
# 4. Run with sudo: `sudo ./deploy.sh`
#
# ==============================================================================

# --- Color Codes for Output ---
C_RESET='\033[0m'
C_RED='\033[0;31m'
C_GREEN='\033[0;32m'
C_YELLOW='\033[0;33m'
C_CYAN='\033[0;36m'
C_WHITE='\033[1;37m'

# --- Helper Functions ---
function print_header() {
    echo -e "${C_CYAN}======================================================${C_RESET}"
    echo -e "${C_CYAN}  PVMS Automated Deployment Script${C_RESET}"
    echo -e "${C_CYAN}======================================================${C_RESET}"
}

function print_step() {
    echo -e "\n${C_YELLOW}>>> $1${C_RESET}"
}

function print_success() {
    echo -e "${C_GREEN}✔ $1${C_RESET}"
}

function print_error() {
    echo -e "${C_RED}✖ ERROR: $1${C_RESET}" >&2
    exit 1
}

function check_root() {
    if [ "$EUID" -ne 0 ]; then
        print_error "This script must be run as root. Please use 'sudo ./deploy.sh'"
    fi
}

# --- Main Script Logic ---

# 1. Initial Checks and Welcome
check_root
print_header
echo -e "${C_WHITE}This script will configure your server. Press Ctrl+C at any time to abort.${C_RESET}\n"
read -p "Press [Enter] to begin..."

# 2. Gather User Input
print_step "Gathering required information..."

# Get Domain Name
while true; do
    read -p "Enter your domain name (e.g., pvms.example.com): " DOMAIN
    if [[ -z "$DOMAIN" ]]; then
        echo -e "${C_RED}Domain name cannot be empty.${C_RESET}"
    else
        break
    fi
done

# Get Database Password
while true; do
    read -s -p "Enter a strong password for the database user: " DB_PASSWORD
    echo
    read -s -p "Confirm database password: " DB_PASSWORD_CONFIRM
    echo
    if [[ "$DB_PASSWORD" != "$DB_PASSWORD_CONFIRM" ]]; then
        echo -e "${C_RED}Passwords do not match. Please try again.${C_RESET}"
    elif [[ -z "$DB_PASSWORD" ]]; then
        echo -e "${C_RED}Password cannot be empty.${C_RESET}"
    else
        break
    fi
done

# Get Email for Let's Encrypt
while true; do
    read -p "Enter your email address (for SSL certificate notices): " EMAIL
    if [[ ! "$EMAIL" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
        echo -e "${C_RED}Please enter a valid email address.${C_RESET}"
    else
        break
    fi
done

print_success "Information gathered."

# 3. System Update and Dependency Installation
print_step "Updating system and installing dependencies (Nginx, Docker, Certbot)..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y || print_error "Failed to update package lists."
apt-get upgrade -y || print_error "Failed to upgrade packages."
apt-get install -y nginx docker.io docker-compose certbot python3-certbot-nginx || print_error "Failed to install required packages."
print_success "System updated and dependencies installed."

# 4. Firewall Configuration
print_step "Configuring firewall (UFW)..."
ufw allow OpenSSH || print_error "Failed to allow OpenSSH through firewall."
ufw allow 'Nginx Full' || print_error "Failed to allow Nginx through firewall."
echo "y" | ufw enable || print_error "Failed to enable firewall."
print_success "Firewall configured."

# 5. Docker and Database Setup
print_step "Setting up PostgreSQL + PostGIS database with Docker..."
DB_DIR="/opt/pms-backend"
mkdir -p "$DB_DIR" || print_error "Failed to create directory $DB_DIR"

# Create docker-compose.yml
cat > "$DB_DIR/docker-compose.yml" << EOL
version: '3.8'
services:
  db:
    image: postgis/postgis:13-3.1
    container_name: port_database
    restart: always
    ports: [ "127.0.0.1:5432:5432" ] # Bind to localhost for security
    environment:
      - POSTGRES_USER=port_user
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=port_db
    volumes: 
      - postgres_data:/var/lib/postgresql/data
volumes:
  postgres_data:
EOL

(cd "$DB_DIR" && docker-compose up -d) || print_error "Failed to start database container."
print_success "Database container started successfully."

# Wait a moment for Postgres to initialize
print_step "Waiting for database to initialize..."
sleep 15

# 6. Database Schema Initialization
print_step "Initializing database schema..."
SCHEMA_SQL=$(cat <<'EOL'
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE TYPE user_role AS ENUM ('Administrator', 'Supervisor', 'Port Operator', 'Maritime Agent', 'Pilot');
CREATE TYPE berth_type AS ENUM ('Quay', 'Berth', 'Anchorage');
CREATE TYPE ship_status AS ENUM ('Approaching', 'Anchored', 'Docked', 'Departing', 'Left Port');
CREATE TYPE movement_event_type AS ENUM ('Vessel Registered', 'AIS Update', 'Status Change', 'Berth Assignment', 'Pilot Assignment', 'Agent Assignment', 'Pilot Onboard', 'Pilot Offboard', 'Manual Log', 'Port Service');
CREATE TYPE trip_status AS ENUM ('Active', 'Completed');

CREATE TABLE ports (id TEXT PRIMARY KEY, name VARCHAR(255) NOT NULL, lat NUMERIC(9, 6) NOT NULL, lon NUMERIC(9, 6) NOT NULL, logo_image TEXT, default_zoom INT, map_theme VARCHAR(10), boundary_type VARCHAR(10), boundary_radius NUMERIC(10,2), geometry GEOMETRY(POLYGON, 4326));
CREATE TABLE users (id TEXT PRIMARY KEY, name VARCHAR(255) NOT NULL, email VARCHAR(255), phone VARCHAR(50), gsm VARCHAR(50), company VARCHAR(255), role user_role NOT NULL, password TEXT NOT NULL, port_id TEXT, force_password_change BOOLEAN NOT NULL DEFAULT TRUE, notes TEXT, FOREIGN KEY (port_id) REFERENCES ports(id) ON DELETE SET NULL);
CREATE TABLE berths (id TEXT PRIMARY KEY, port_id TEXT NOT NULL, name VARCHAR(255) NOT NULL, type berth_type NOT NULL, max_length NUMERIC(10, 2) NOT NULL, max_draft NUMERIC(10, 2) NOT NULL, equipment TEXT[], quay_id TEXT, position_on_quay INTEGER, geometry GEOMETRY(POLYGON, 4326), radius NUMERIC(10, 2), FOREIGN KEY (port_id) REFERENCES ports(id) ON DELETE CASCADE);
CREATE TABLE trips (id TEXT PRIMARY KEY, ship_id TEXT NOT NULL, port_id TEXT NOT NULL, arrival_timestamp TIMESTAMP WITH TIME ZONE NOT NULL, departure_timestamp TIMESTAMP WITH TIME ZONE, status trip_status NOT NULL, vessel_name VARCHAR(255), vessel_imo VARCHAR(7), agent_id TEXT, pilot_id TEXT, FOREIGN KEY (port_id) REFERENCES ports(id) ON DELETE CASCADE, FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE SET NULL, FOREIGN KEY (pilot_id) REFERENCES users(id) ON DELETE SET NULL);
CREATE TABLE ships (id TEXT PRIMARY KEY, port_id TEXT NOT NULL, name VARCHAR(255) NOT NULL, imo VARCHAR(7) UNIQUE NOT NULL, call_sign VARCHAR(10), "type" VARCHAR(255), length NUMERIC(10, 2) NOT NULL, draft NUMERIC(10, 2) NOT NULL, flag VARCHAR(255), eta TIMESTAMP WITH TIME ZONE, etd TIMESTAMP WITH TIME ZONE, status ship_status NOT NULL, departure_date TIMESTAMP WITH TIME ZONE, pilot_id TEXT, agent_id TEXT, current_trip_id TEXT, has_dangerous_goods BOOLEAN NOT NULL DEFAULT FALSE, lat NUMERIC(9, 6), lon NUMERIC(9, 6), heading NUMERIC(5,2), speed NUMERIC(5,2), rate_of_turn NUMERIC(5,2), target_lat NUMERIC(9,6), target_lon NUMERIC(9,6), FOREIGN KEY (port_id) REFERENCES ports(id) ON DELETE CASCADE, FOREIGN KEY (pilot_id) REFERENCES users(id) ON DELETE SET NULL, FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE SET NULL, FOREIGN KEY (current_trip_id) REFERENCES trips(id) ON DELETE SET NULL);
CREATE TABLE ship_berth_assignments (ship_id TEXT NOT NULL, berth_id TEXT NOT NULL, PRIMARY KEY (ship_id, berth_id), FOREIGN KEY (ship_id) REFERENCES ships(id) ON DELETE CASCADE, FOREIGN KEY (berth_id) REFERENCES berths(id) ON DELETE CASCADE);
CREATE TABLE ship_movements (id TEXT PRIMARY KEY, ship_id TEXT NOT NULL, port_id TEXT NOT NULL, trip_id TEXT NOT NULL, event_type movement_event_type NOT NULL, "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL, details JSONB, FOREIGN KEY (ship_id) REFERENCES ships(id) ON DELETE CASCADE, FOREIGN KEY (port_id) REFERENCES ports(id) ON DELETE CASCADE, FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE);
CREATE TABLE login_history (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, user_name VARCHAR(255) NOT NULL, port_id TEXT NOT NULL, port_name VARCHAR(255) NOT NULL, "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL, logout_timestamp TIMESTAMP WITH TIME ZONE, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY (port_id) REFERENCES ports(id) ON DELETE CASCADE);
CREATE TABLE interaction_log (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, user_name VARCHAR(255) NOT NULL, port_id TEXT NOT NULL, "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL, event_type VARCHAR(50) NOT NULL, details JSONB, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY (port_id) REFERENCES ports(id) ON DELETE CASCADE);
CREATE TABLE api_log (id TEXT PRIMARY KEY, "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL, method VARCHAR(10), url VARCHAR(255), status_code INT, duration_ms INT, user_id TEXT, user_name VARCHAR(255));
CREATE TABLE "user_sessions" ( "sid" varchar NOT NULL COLLATE "default", "sess" json NOT NULL, "expire" timestamp(6) NOT NULL) WITH (OIDS=FALSE);
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX "IDX_user_sessions_expire" ON "user_sessions" ("expire");
EOL
)

docker exec -i port_database psql -U port_user -d port_db <<< "$SCHEMA_SQL" || print_error "Failed to initialize database schema."
print_success "Database schema initialized."

# 7. Nginx Configuration
print_step "Configuring Nginx web server..."
WEB_DIR="/var/www/pms-frontend"
mkdir -p "$WEB_DIR" || print_error "Failed to create web directory $WEB_DIR"
chown -R www-data:www-data "$WEB_DIR"
chmod -R 755 "$WEB_DIR"

# Create a basic index.html as a placeholder
cat > "$WEB_DIR/index.html" << EOL
<!DOCTYPE html>
<html>
<head><title>PVMS</title></head>
<body style="font-family: sans-serif; background-color: #222; color: #fff; text-align: center; padding-top: 20%;">
  <h1>Port Vessel Management System</h1>
  <p>Server is configured. Please upload your built frontend files to <strong>${WEB_DIR}</strong></p>
</body>
</html>
EOL

# Create Nginx server block
cat > "/etc/nginx/sites-available/pms" << EOL
server {
    listen 80;
    server_name ${DOMAIN};

    root ${WEB_DIR};
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOL

ln -sfn /etc/nginx/sites-available/pms /etc/nginx/sites-enabled/
nginx -t || print_error "Nginx configuration test failed."
systemctl restart nginx || print_error "Failed to restart Nginx."
print_success "Nginx configured."

# 8. SSL Configuration with Certbot
print_step "Configuring SSL certificate with Let's Encrypt..."
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$EMAIL" --redirect || print_error "Certbot failed to obtain SSL certificate."
print_success "SSL certificate obtained and configured."

# 9. Final Instructions
print_header
echo -e "${C_GREEN}Server setup is complete!${C_RESET}"
echo -e "${C_WHITE}----------------------------------------------------------------------${C_RESET}"
echo -e "Your frontend is now being served at: ${C_CYAN}https://${DOMAIN}${C_RESET}"
echo -e "Your PostgreSQL database is running and accessible to your backend."
echo -e "\n${C_YELLOW}FINAL STEPS:${C_RESET}"
echo -e "1. On your ${C_WHITE}local machine${C_RESET}, build the frontend application."
echo -e "   (Navigate to the project directory and run ${C_CYAN}npm run build${C_RESET})"
echo
echo -e "2. Upload the contents of the generated ${C_CYAN}dist${C_RESET} folder to your server."
echo -e "   Use this command from your project's root directory:"
echo -e "   ${C_CYAN}scp -r dist/* ${USER}@${HOSTNAME}:${WEB_DIR}/${C_RESET}"
echo
echo -e "3. Follow the ${C_WHITE}HOWTO-BACKEND.md${C_RESET} guide to build and deploy the API service"
echo -e "   in the ${C_CYAN}${DB_DIR}${C_RESET} directory on your server."
echo -e "   Your database password is: ${C_RED}${DB_PASSWORD}${C_RESET}"
echo -e "${C_WHITE}----------------------------------------------------------------------${C_RESET}"

exit 0
