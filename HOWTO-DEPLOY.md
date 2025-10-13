# How to Deploy the Port Management System on a VPS

## Introduction

This guide provides a comprehensive, step-by-step tutorial for deploying the Port Management System to a fresh Virtual Private Server (VPS) running a modern Debian-based Linux distribution (like Ubuntu 20.04/22.04).

We will walk through three main stages:
1.  **Deploying the Frontend**: Building the React application and configuring a professional-grade Nginx web server to serve it to users.
2.  **Setting up the Backend Infrastructure**: Using Docker to create an isolated, persistent PostgreSQL database container. This is the modern standard for running backend services.
3.  **Initializing the Database Schema**: Connecting to our new database and creating the tables required for the application to function.

Following this guide will result in a production-ready setup for the application's frontend and database.

## Prerequisites

-   A VPS running a fresh installation of Ubuntu 20.04/22.04 or another Debian-based distribution.
-   SSH access to your VPS with a user account that has `sudo` privileges.
-   A tool to transfer files from your local computer to the VPS (this guide uses `scp`, which is available on Linux, macOS, and Windows PowerShell).
-   `Node.js` and `npm` (or `yarn`/`pnpm`) installed on your **local machine** to build the React project.

---

## Part 1: Deploying the Frontend Application

In this part, we will prepare the server, build our React application into static files, upload them, and configure the Nginx web server to handle user traffic.

### Step 1: Connect to Your VPS and Update System Packages

First, securely connect to your server. It's a critical best practice to ensure all system packages are up to date to patch any security vulnerabilities.

```bash
# Replace 'user' with your username and 'your_vps_ip' with your server's IP address.
ssh user@your_vps_ip

# Update the package list from all configured sources.
sudo apt update

# Upgrade all installed packages to their latest versions. The '-y' flag auto-confirms any prompts.
sudo apt upgrade -y
```

### Step 2: Install and Enable the Nginx Web Server

Nginx is a high-performance web server that will serve our application's files.

```bash
# Install the nginx package.
sudo apt install nginx -y

# Start the Nginx service.
sudo systemctl start nginx

# Enable the service to automatically start every time the server reboots.
sudo systemctl enable nginx
```
**Verification:** Check that Nginx is active and running.
```bash
sudo systemctl status nginx
# Press 'q' to exit the status view.
```

### Step 3: Configure the Firewall (UFW)

A firewall is essential for security. We will configure UFW (Uncomplicated Firewall) to allow web traffic (HTTP/HTTPS) and SSH (so you don't lock yourself out).

```bash
# Allow SSH connections.
sudo ufw allow OpenSSH

# Allow both HTTP (port 80) and HTTPS (port 443) traffic.
sudo ufw allow 'Nginx Full'

# Enable the firewall. You will be asked to confirm.
sudo ufw enable
```
**Verification:** Check the firewall's status.
```bash
sudo ufw status
# You should see 'OpenSSH' and 'Nginx Full' listed as allowed.
```

### Step 4: Build the Application on Your LOCAL Machine

A React application must be compiled ("built") into optimized static HTML, CSS, and JavaScript files for production. **This step is performed on your local computer, not the server.**

```bash
# From the project directory on your LOCAL computer:

# Install all project dependencies.
npm install

# Run the build script. This compiles the app into a 'dist' directory.
npm run build 
```
After this, you will have a `dist` folder in your project directory containing files like `index.html` and assets. These are the only files we need on the server.

### Step 5: Upload the Built Files to the Server

Now, we'll create a directory on the server and upload our built files into it.

1.  **On the VPS, create a directory to house the application:**
    ```bash
    # The -p flag creates parent directories if they don't exist.
    sudo mkdir -p /var/www/port-management-system
    ```

2.  **From your LOCAL computer, use `scp` to upload the files:**
    ```bash
    # IMPORTANT: Run this command from your local machine's terminal.
    # The '/*' at the end of 'dist/*' is crucial; it copies the *contents*
    # of the dist folder, not the folder itself.
    # Replace the placeholder paths with your actual paths.
    scp -r /path/to/your/project/dist/* user@your_vps_ip:/var/www/port-management-system/
    ```

3.  **On the VPS, set the correct permissions:**
    The web server (running as the `www-data` user) needs permission to read the files.
    ```bash
    # Change the owner of the files to the Nginx user.
    sudo chown -R www-data:www-data /var/www/port-management-system

    # Set appropriate read/write/execute permissions.
    sudo chmod -R 755 /var/www/port-management-system
    ```

### Step 6: Configure Nginx to Serve the Application

We need to tell Nginx where to find our files and how to handle requests.

1.  **Create a new Nginx configuration file:**
    ```bash
    sudo nano /etc/nginx/sites-available/port-management-system
    ```

2.  **Paste the following configuration into the file.** This is specifically configured for a Single-Page Application (SPA).
    ```nginx
    server {
        listen 80;
        listen [::]:80;

        # Replace with your server's IP address or your domain name.
        server_name your_domain_or_ip;

        # The root directory where your application files are located.
        root /var/www/port-management-system;
        index index.html;

        location / {
            # This is the key for SPAs. It ensures that if a URL is not a
            # specific file or directory, Nginx serves index.html.
            # This allows React Router to handle the routing.
            try_files $uri $uri/ /index.html;
        }
    }
    ```
    Save and exit the editor (`Ctrl+X`, then `Y`, then `Enter`).

3.  **Enable the site by creating a symbolic link:**
    ```bash
    sudo ln -s /etc/nginx/sites-available/port-management-system /etc/nginx/sites-enabled/
    ```

4.  **Test the Nginx configuration and restart the service:**
    ```bash
    # This command will check for syntax errors.
    sudo nginx -t
    # If successful, it will say "syntax is ok" and "test is successful".

    # Apply the changes by restarting Nginx.
    sudo systemctl restart nginx
    ```

**Verification:** Open your web browser and navigate to `http://your_vps_ip`. You should see the Port Management System's login page.

---

## Part 2: Setting up the PostgreSQL Database with Docker

The application needs a database. The modern, standard way to run services like a database is with Docker, which isolates the database into a secure, manageable container.

> **Note on the Simulated API**: The current application uses a file (`services/api.ts`) to **simulate** a backend. The following steps set up a real PostgreSQL database, but you would need to build a real backend application (e.g., with Node.js, Python, etc.) to connect the deployed frontend to this database.

### Step 1: Install Docker and Docker Compose

1.  **Install Docker Engine:**
    ```bash
    # Install prerequisite packages
    sudo apt install apt-transport-https ca-certificates curl software-properties-common -y
    # Add Docker's official GPG key for security
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    # Set up the stable repository
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    # Install Docker
    sudo apt update
    sudo apt install docker-ce docker-ce-cli containerd.io -y
    ```

2.  **Add your user to the `docker` group (optional but recommended):**
    This allows you to run `docker` commands without `sudo`.
    ```bash
    sudo usermod -aG docker $USER
    # IMPORTANT: You must log out and log back in for this change to take effect.
    ```

3.  **Install Docker Compose:**
    ```bash
    sudo apt install docker-compose -y
    ```
**Verification:**
```bash
docker --version
docker-compose --version
```

### Step 2: Define the Database Service with Docker Compose

We will use a `docker-compose.yml` file to define our database service.

1.  **Create a directory for your backend configuration:**
    ```bash
    mkdir ~/port-backend
    cd ~/port-backend
    ```

2.  **Create the `docker-compose.yml` file:**
    ```bash
    nano docker-compose.yml
    ```

3.  **Paste the following configuration into the file.** This defines a PostgreSQL service with PostGIS (for geospatial features) and a persistent volume for the data.

    ```yaml
    version: '3.8'

    services:
      db:
        # Use a PostGIS image, which is PostgreSQL with geospatial extensions.
        image: postgis/postgis:13-3.1
        container_name: port_database
        # Always restart the container if it stops.
        restart: always
        # Map port 5432 inside the container to port 5432 on the host server.
        ports:
          - "5432:5432"
        # Environment variables to configure the database.
        environment:
          - POSTGRES_USER=port_user
          - POSTGRES_PASSWORD=a_very_strong_password # !!! CHANGE THIS PASSWORD !!!
          - POSTGRES_DB=port_db
        # This ensures your data persists even if the container is removed.
        volumes:
          - postgres_data:/var/lib/postgresql/data

    volumes:
      postgres_data:
    ```
    **CRITICAL**: Change `a_very_strong_password` to a unique, secure password. Save and exit.

### Step 3: Launch the Database Container

```bash
# Run this from the ~/port-backend directory.
# The '-d' flag runs the container in detached mode (in the background).
docker-compose up -d
```
**Verification:** Check that the container is running.
```bash
docker ps
# You should see a container named 'port_database' with status 'Up'.
```

---

## Part 3: Initializing the Database Schema

Now that the database is running, we need to create the tables that the backend API will use.

### Step 1: Connect to the PostgreSQL Container

Use `docker exec` to open an interactive `psql` (PostgreSQL command-line) shell inside the running container.

```bash
# Breakdown of the command:
# docker exec: Execute a command in a running container
# -it:         Run in interactive mode with a pseudo-TTY
# port_database: The name of our container
# psql:        The command we want to run
# -U port_user:  Connect as the user 'port_user'
# -d port_db:  Connect to the database 'port_db'
docker exec -it port_database psql -U port_user -d port_db
```
You should now see a `port_db=#` prompt, indicating you are connected to the database.

### Step 2: Create the Database Tables

Copy the **entire SQL script** below and paste it into the `psql` prompt. This will create all the necessary tables and relationships to match the application's data models.

```sql
-- Enable PostGIS for geospatial features
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create custom ENUM types to ensure data consistency, matching the application's TypeScript types.
CREATE TYPE user_role AS ENUM ('Admin', 'Port Operator', 'Captain', 'Maritime Agent', 'Pilot');
CREATE TYPE berth_type AS ENUM ('Quay', 'Berth', 'Anchorage');
CREATE TYPE ship_status AS ENUM ('Approaching', 'Docked', 'Departing', 'At Anchorage', 'Left Port');
CREATE TYPE movement_event_type AS ENUM ('Vessel Registered', 'Status Updated', 'Berth Assignment', 'Pilot Assignment', 'AIS Update', 'Agent Assignment');
CREATE TYPE trip_status AS ENUM ('Active', 'Completed');

-- Table for Ports
CREATE TABLE ports (
    id TEXT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    lat NUMERIC(9, 6) NOT NULL,
    lon NUMERIC(9, 6) NOT NULL,
    map_image TEXT, -- Base64 Data URL for a custom map background
    logo_image TEXT, -- Base64 Data URL for the port logo
    geometry GEOMETRY(POLYGON, 4326) -- Store port boundary as a polygon
);

-- Table for Users
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    password TEXT NOT NULL, -- In a real app, this would store a hash
    port_id TEXT,
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
    equipment TEXT[], -- Array of strings for equipment
    quay_id TEXT,
    position_on_quay INTEGER,
    geometry GEOMETRY(POLYGON, 4326), -- Store berth shape as a polygon
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
    current_trip_id TEXT, -- The active trip for this vessel
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
    trip_id TEXT NOT NULL, -- Associate every movement with a specific trip
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
```
Press `Enter` after pasting to execute the script. You should see a series of `CREATE TYPE` and `CREATE TABLE` messages.

### Step 3: Verify and Exit

**Verification:** At the `psql` prompt, type `\dt` to list all tables. You should see the ones you just created.
```
\dt
```
Type `\q` and press `Enter` to exit the PostgreSQL shell and return to your server's command prompt.

---

## Conclusion and Next Steps

Congratulations! You have now fully deployed the frontend application and its required database infrastructure.

-   Your **React frontend** is being served by a production-grade Nginx web server.
-   Your **PostgreSQL database** is running securely in a Docker container, with its data safely stored in a persistent volume.
-   The **database schema** has been initialized and is ready to accept data.

The next logical step is to build a **backend API service** (e.g., using Node.js, Python, or Go) that will connect the frontend to this database, handle business logic, and manage user authentication.
```