# How to Deploy the Port Management System on a VPS

This guide provides instructions for deploying the Port Management System to a fresh Virtual Private Server (VPS) running a modern Debian-based Linux distribution (like Ubuntu 20.04/22.04).

## Recommended Method: Automated Deployment Script

The fastest and most reliable way to set up your server is to use the automated deployment script (`deploy.sh.md`). This script handles all server-side dependencies, configuration, and security setup in one go.

### Step 1: Upload the Script to Your VPS

1.  From your **local machine**, use `scp` to copy the `deploy.sh.md` script to your user's home directory on the server.
    ```bash
    scp deploy.sh.md user@your_vps_ip:~/
    ```
    *Replace `user@your_vps_ip` with your server's credentials.*

### Step 2: Rename and Make Executable

1.  SSH into your VPS.
    ```bash
    ssh user@your_vps_ip
    ```
2.  Rename the file to remove the `.md` extension and make it executable. This is a crucial step.
    ```bash
    mv deploy.sh.md deploy.sh
    chmod +x deploy.sh
    ```

### Step 3: Run the Script

1.  Run the script with `sudo`. It will check for root privileges.
    ```bash
    sudo ./deploy.sh
    ```

### Step 4: Follow the On-Screen Instructions

The script will prompt you for three pieces of information:
-   **Your Domain Name**: The fully qualified domain name that points to your VPS's IP address (e.g., `pvms.example.com`).
-   **Database Password**: A strong, unique password for the new database user.
-   **Your Email Address**: Used by Let's Encrypt for SSL certificate registration and renewal notices.

The script will then automatically perform all necessary setup tasks. At the end, it will display a final set of instructions for you to follow, which includes:
1.  Building the frontend application on your local machine (`npm run build`).
2.  Uploading the built files to the correct directory on the server.
3.  Following the `HOWTO-BACKEND.md` guide to build and deploy the API service.

---

## Conclusion and Next Steps

Once the script has finished and you have completed the final instructions it provides, your frontend application and database will be fully deployed and secured with HTTPS. The next step is to build and deploy the **backend API service** (as detailed in `HOWTO-BACKEND.md`) that will connect the frontend to the database.

---
---

## Appendix: Manual Deployment Instructions

For advanced users or for environments where running the script is not possible, the original manual steps are provided below. **It is highly recommended to use the automated script instead.**

### Part 1: Deploying the Frontend Application

1.  **Connect to Your VPS and Update System Packages**:
    ```bash
    ssh user@your_vps_ip
    sudo apt update && sudo apt upgrade -y
    ```

2.  **Install and Enable Nginx and UFW**:
    ```bash
    sudo apt install nginx -y
    sudo systemctl start nginx && sudo systemctl enable nginx
    sudo ufw allow OpenSSH && sudo ufw allow 'Nginx Full'
    echo "y" | sudo ufw enable
    ```

3.  **Build and Upload the Application**:
    -   On your **local machine**, build the application.
    -   On the **VPS**, create the web directory: `sudo mkdir -p /var/www/pms-frontend`.
    -   From your **local machine**, upload the built files:
        ```bash
        scp -r /path/to/your/project/dist/* user@your_vps_ip:/var/www/pms-frontend/
        ```
    -   On the **VPS**, set permissions:
        ```bash
        sudo chown -R www-data:www-data /var/www/pms-frontend
        sudo chmod -R 755 /var/www/pms-frontend
        ```

4.  **Configure Nginx**:
    -   Create `/etc/nginx/sites-available/pms` and paste the following, replacing `your_domain`:
        ```nginx
        server {
            listen 80;
            server_name your_domain;
            root /var/www/pms-frontend;
            index index.html;
            location / {
                try_files $uri $uri/ /index.html;
            }
        }
        ```
    -   Enable the site and restart Nginx:
        ```bash
        sudo ln -sfn /etc/nginx/sites-available/pms /etc/nginx/sites-enabled/
        sudo nginx -t && sudo systemctl restart nginx
        ```

### Part 2: Setting up the PostgreSQL Database with Docker

1.  **Install Docker and Docker Compose**:
    ```bash
    sudo apt install -y docker.io docker-compose
    sudo systemctl start docker && sudo systemctl enable docker
    sudo usermod -aG docker $USER
    ```
    **Note**: You must log out and log back in for the `usermod` change to take effect.

2.  **Define and Launch the Database Service**:
    -   Create `/opt/pms-backend/docker-compose.yml` with the following content, replacing the password:
        ```yaml
        version: '3.8'
        services:
          db:
            image: postgis/postgis:13-3.1
            container_name: port_database
            restart: always
            ports: [ "127.0.0.1:5432:5432" ]
            environment:
              - POSTGRES_USER=port_user
              - POSTGRES_PASSWORD=a_very_strong_password # !!! CHANGE THIS !!!
              - POSTGRES_DB=port_db
            volumes: 
              - postgres_data:/var/lib/postgresql/data
        volumes:
          postgres_data:
        ```
    -   From `/opt/pms-backend`, run `docker-compose up -d`.

### Part 3: Initializing the Database Schema

1.  **Create `schema.sql`**: On your VPS, create a file named `schema.sql` and paste the entire SQL script from the `deploy.sh` file into it.

2.  **Run the SQL Script**:
    ```bash
    docker exec -i port_database psql -U port_user -d port_db < schema.sql
    ```

### Part 4: Securing with HTTPS (Let's Encrypt)

1.  **Install Certbot**:
    ```bash
    sudo apt install certbot python3-certbot-nginx -y
    ```

2.  **Obtain the SSL Certificate**:
    ```bash
    # Replace your_domain with your actual domain name and provide your email
    sudo certbot --nginx -d your_domain --non-interactive --agree-tos -m your-email@example.com --redirect
    ```

3.  **Restart Nginx**:
    ```bash
    sudo systemctl restart nginx
    ```