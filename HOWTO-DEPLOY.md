# How to Deploy the Port Management System on a VPS

## Introduction

This guide provides a comprehensive, step-by-step tutorial for deploying the Port Management System to a fresh Virtual Private Server (VPS) running a modern Debian-based Linux distribution (like Ubuntu 20.04/22.04).

We will walk through three main stages:
1.  **Deploying the Frontend**: Building the React application and configuring a professional-grade Nginx web server to serve it to users.
2.  **Setting up the Backend Infrastructure**: Using Docker to create an isolated, persistent PostgreSQL database container.
3.  **Initializing the Database Schema**: Connecting to our new database and creating the tables required for the application to function.

Following this guide will result in a production-ready setup for the application's frontend and database.

## Prerequisites

-   A VPS running a fresh installation of Ubuntu 20.04/22.04 or another Debian-based distribution.
-   SSH access to your VPS with a user account that has `sudo` privileges.
-   A tool to transfer files from your local computer to the VPS (this guide uses `scp`).
-   `Node.js` and `npm` installed on your **local machine** to build the React project.

---

## Part 1: Deploying the Frontend Application

### Step 1: Connect to Your VPS and Update System Packages

```bash
ssh user@your_vps_ip
sudo apt update
sudo apt upgrade -y
```

### Step 2: Install and Enable the Nginx Web Server

```bash
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Step 3: Configure the Firewall (UFW)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### Step 4: Build the Application on Your LOCAL Machine

On your **local computer**:
```bash
npm install
npm run build 
```
This creates a `dist` folder with your compiled application.

### Step 5: Upload the Built Files to the Server

1.  **On the VPS, create a directory:**
    ```bash
    sudo mkdir -p /var/www/port-management-system
    ```

2.  **From your LOCAL computer, use `scp` to upload the files:**
    ```bash
    scp -r /path/to/your/project/dist/* user@your_vps_ip:/var/www/port-management-system/
    ```

3.  **On the VPS, set permissions:**
    ```bash
    sudo chown -R www-data:www-data /var/www/port-management-system
    sudo chmod -R 755 /var/www/port-management-system
    ```

### Step 6: Configure Nginx to Serve the Application

1.  **Create a new Nginx configuration file:**
    ```bash
    sudo nano /etc/nginx/sites-available/port-management-system
    ```

2.  **Paste the following configuration into the file:**
    ```nginx
    server {
        listen 80;
        listen [::]:80;
        server_name your_domain_or_ip;
        root /var/www/port-management-system;
        index index.html;

        location / {
            # This is key for Single-Page Applications
            try_files $uri $uri/ /index.html;
        }
    }
    ```

3.  **Enable the site and restart Nginx:**
    ```bash
    sudo ln -s /etc/nginx/sites-available/port-management-system /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl restart nginx
    ```

---

## Part 2: Setting up the PostgreSQL Database with Docker

### Step 1: Install Docker and Docker Compose

1.  **Install Docker Engine:**
    ```bash
    sudo apt install apt-transport-https ca-certificates curl software-properties-common -y
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt update
    sudo apt install docker-ce docker-ce-cli containerd.io -y
    ```

2.  **Add your user to the `docker` group (log out and back in after):**
    ```bash
    sudo usermod -aG docker $USER
    ```

3.  **Install Docker Compose:**
    ```bash
    sudo apt install docker-compose -y
    ```

### Step 2: Define the Database Service with Docker Compose

1.  **Create a backend directory and `docker-compose.yml` file:**
    ```bash
    mkdir ~/pms-backend
    cd ~/pms-backend
    nano docker-compose.yml
    ```

2.  **Paste the following configuration:**
    ```yaml
    version: '3.8'
    services:
      db:
        image: postgis/postgis:13-3.1
        container_name: port_database
        restart: always
        ports: [ "5432:5432" ]
        environment:
          - POSTGRES_USER=port_user
          - POSTGRES_PASSWORD=a_very_strong_password # !!! CHANGE THIS PASSWORD !!!
          - POSTGRES_DB=port_db
        volumes: [ postgres_data:/var/lib/postgresql/data ]
    volumes:
      postgres_data:
    ```

### Step 3: Launch the Database Container

```bash
docker-compose up -d
```

---

## Part 3: Initializing the Database Schema

### Step 1: Connect to the PostgreSQL Container

```bash
docker exec -it port_database psql -U port_user -d port_db
```

### Step 2: Create the Database Tables

Copy the **entire SQL script** below and paste it into the `psql` prompt.

```sql
-- Enable PostGIS for geospatial features
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create custom ENUM types to ensure data consistency
CREATE TYPE user_role AS ENUM ('Administrator', 'Supervisor', 'Port Operator', 'Maritime Agent', 'Pilot');
CREATE TYPE berth_type AS ENUM ('Quay', 'Berth', 'Anchorage');
CREATE TYPE ship_status AS ENUM ('Approaching', 'Anchored', 'Docked', 'Departing', 'Left Port');
CREATE TYPE movement_event_type AS ENUM ('Vessel Registered', 'AIS Update', 'Status Change', 'Berth Assignment', 'Pilot Assignment', 'Agent Assignment', 'Pilot Onboard', 'Pilot Offboard');
CREATE TYPE trip_status AS ENUM ('Active', 'Completed');

-- Table for Ports
CREATE TABLE ports (
    id TEXT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    lat NUMERIC(9, 6) NOT NULL,
    lon NUMERIC(9, 6) NOT NULL,
    logo_image TEXT,
    geometry GEOMETRY(POLYGON, 4326)
);

-- Table for Users
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    gsm VARCHAR(50),
    company VARCHAR(255),
    role user_role NOT NULL,
    password TEXT NOT NULL,
    port_id TEXT,
    force_password_change BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,
    FOREIGN KEY (port_id) REFERENCES ports(id) ON DELETE SET NULL
);

-- Table for Berths
CREATE TABLE berths (
    id TEXT PRIMARY KEY,
    port_id TEXT NOT NULL,
    name VARCHAR(255) NOT NULL,
    type berth_type NOT NULL,
    max_length NUMERIC(10, 2) NOT NULL,
    max_draft NUMERIC(10, 2) NOT NULL,
    equipment TEXT[],
    quay_id TEXT,
    position_on_quay INTEGER,
    geometry GEOMETRY(POLYGON, 4326),
    radius NUMERIC(10, 2),
    FOREIGN KEY (port_id) REFERENCES ports(id) ON DELETE CASCADE
);

-- Table for Trips (Vessel Stopovers)
CREATE TABLE trips (
    id TEXT PRIMARY KEY,
    ship_id TEXT NOT NULL, 
    port_id TEXT NOT NULL,
    arrival_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    departure_timestamp TIMESTAMP WITH TIME ZONE,
    status trip_status NOT NULL,
    agent_id TEXT,
    pilot_id TEXT,
    FOREIGN KEY (port_id) REFERENCES ports(id) ON DELETE CASCADE,
    FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (pilot_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Table for Ships
CREATE TABLE ships (
    id TEXT PRIMARY KEY,
    port_id TEXT NOT NULL,
    name VARCHAR(255) NOT NULL,
    imo VARCHAR(7) UNIQUE NOT NULL,
    call_sign VARCHAR(10),
    type VARCHAR(255),
    length NUMERIC(10, 2) NOT NULL,
    draft NUMERIC(10, 2) NOT NULL,
    flag VARCHAR(255),
    eta TIMESTAMP WITH TIME ZONE,
    etd TIMESTAMP WITH TIME ZONE,
    status ship_status NOT NULL,
    departure_date TIMESTAMP WITH TIME ZONE,
    pilot_id TEXT,
    agent_id TEXT,
    current_trip_id TEXT,
    has_dangerous_goods BOOLEAN NOT NULL DEFAULT FALSE,
    lat NUMERIC(9, 6),
    lon NUMERIC(9, 6),
    FOREIGN KEY (port_id) REFERENCES ports(id) ON DELETE CASCADE,
    FOREIGN KEY (pilot_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (current_trip_id) REFERENCES trips(id) ON DELETE SET NULL
);

-- Join Table for Many-to-Many relationship between Ships and Berths
CREATE TABLE ship_berth_assignments (
    ship_id TEXT NOT NULL,
    berth_id TEXT NOT NULL,
    PRIMARY KEY (ship_id, berth_id),
    FOREIGN KEY (ship_id) REFERENCES ships(id) ON DELETE CASCADE,
    FOREIGN KEY (berth_id) REFERENCES berths(id) ON DELETE CASCADE
);

-- Table for Ship Movement History
CREATE TABLE ship_movements (
    id TEXT PRIMARY KEY,
    ship_id TEXT NOT NULL,
    port_id TEXT NOT NULL,
    trip_id TEXT NOT NULL,
    event_type movement_event_type NOT NULL,
    "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL,
    details JSONB,
    FOREIGN KEY (ship_id) REFERENCES ships(id) ON DELETE CASCADE,
    FOREIGN KEY (port_id) REFERENCES ports(id) ON DELETE CASCADE,
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
);

-- Table for User Login History
CREATE TABLE login_history (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    port_id TEXT NOT NULL,
    port_name VARCHAR(255) NOT NULL,
    "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL,
    logout_timestamp TIMESTAMP WITH TIME ZONE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (port_id) REFERENCES ports(id) ON DELETE CASCADE
);

-- Table for connect-pg-simple session store
CREATE TABLE "user_sessions" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL
)
WITH (OIDS=FALSE);
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;

-- Table for UI Interaction Logs
CREATE TABLE interaction_log (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    port_id TEXT NOT NULL,
    "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    details JSONB,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (port_id) REFERENCES ports(id) ON DELETE CASCADE
);

```

### Step 3: Verify and Exit

At the `psql` prompt, type `\dt` to list tables. Type `\q` to exit.

---

## Conclusion and Next Steps

You have now fully deployed the frontend application and its required database infrastructure. The next step is to build a **backend API service** (e.g., using Node.js) that will connect the frontend to this database.