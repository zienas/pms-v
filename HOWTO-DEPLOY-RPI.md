# How to Deploy on a Raspberry Pi (Kiosk Mode)

This guide provides step-by-step instructions for deploying the Port Vessel Management System on a Raspberry Pi 3 or newer. The goal is to create a dedicated, standalone monitoring station that automatically launches the application in a full-screen browser (kiosk mode) on boot.

**Architectural Note**: This guide covers two modes:
1.  **Simulator Mode**: The application's data (ships, berths, etc.) is managed by the `localStorage`-based API simulator within the browser. All data is stored on the Pi's SD card.
2.  **Live AIS Mode**: The Pi runs a background Node.js service to listen for real AIS data from a hardware receiver (via UDP or Serial) and feeds it directly to the application. This is the recommended setup for a real-world kiosk.

For a multi-user or centralized system, you would follow the main `HOWTO-DEPLOY.md` guide to set up a central server and database.

## Prerequisites

### Hardware
*   Raspberry Pi 3, 4, or newer model.
*   A high-quality microSD card (16GB or larger, Class 10/U1 minimum).
*   A reliable power supply for your Pi model.
*   A monitor/display with an HDMI connection.
*   A USB keyboard and mouse for initial setup.
*   (For Live AIS Mode) An AIS receiver that outputs NMEA-0183 data over LAN (UDP) or a Serial/USB connection.

### Software
*   **Raspberry Pi OS with Desktop**: Freshly flashed to your microSD card using the Raspberry Pi Imager tool.
*   **Internet Connection**: Required for downloading software packages.
*   **SSH Enabled (Recommended)**: This allows you to connect to your Pi from another computer, which is much more convenient for copying and pasting commands. You can enable SSH in the Raspberry Pi Imager's advanced settings or via the `raspi-config` tool.

---

## Step 1: Initial Raspberry Pi Setup

1.  **Boot Up and Connect**: Insert the SD card, connect your peripherals and display, and power on the Pi. Complete the initial setup wizard (setting country, language, password, and connecting to Wi-Fi).

2.  **Update System Packages**: It's crucial to start with an up-to-date system. Open a terminal window and run:
    ```bash
    # Update the list of available packages
    sudo apt update

    # Upgrade all installed packages to their latest versions
    sudo apt upgrade -y
    ```

---

## Step 2: Install Core Dependencies

We need to install `git` to download the application code, `Node.js` and `npm` to build it, and `nginx` to serve it.

1.  **Install Git and Nginx**:
    ```bash
    sudo apt install git nginx -y
    ```

2.  **Install Node.js and npm**: We will use NodeSource to get a modern version of Node.js.
    ```bash
    # Download and execute the NodeSource setup script for Node.js v18.x
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

    # Install Node.js (npm is included)
    sudo apt install nodejs -y
    ```

3.  **Verify Installations**:
    ```bash
    git --version
    node -v
    npm -v
    nginx -v
    ```
    You should see version numbers for each command.

---

## Step 3: Download and Build the Application

Now we will get the application's source code from a Git repository and build the production-ready static files.

1.  **Clone the Project**:
    ```bash
    # Clone the project into a new directory named 'pvms'
    git clone <your-git-repository-url> pvms
    cd pvms
    ```
    *Replace `<your-git-repository-url>` with the actual URL of your project's Git repository.*

2.  **Install Dependencies**: This will download all the React libraries needed to build the app. This step can take several minutes on a Raspberry Pi 3.
    ```bash
    npm install
    ```

3.  **Build the Application**: This command compiles the React/TypeScript code into optimized, static HTML, CSS, and JavaScript files in a `dist` folder.
    ```bash
    npm run build
    ```

---

## Step 4: Configure the Nginx Web Server

Nginx will act as the local web server that provides the application files to the browser.

1.  **Copy Built Files to Web Root**: We will serve the files from the standard `/var/www/html` directory.
    ```bash
    # First, remove the default Nginx placeholder page
    sudo rm /var/www/html/index.nginx-debian.html

    # Copy the contents of our 'dist' folder to the web root
    sudo cp -r dist/* /var/www/html/
    ```

2.  **Configure Nginx for a Single-Page App (SPA)**: We need to tell Nginx to always serve `index.html` for any page requests that aren't specific files. This allows React Router to handle the application's internal routing.

    ```bash
    # Open the default site configuration file in the nano editor
    sudo nano /etc/nginx/sites-available/default
    ```

3.  **Edit the Configuration**: Find the `location / { ... }` block and modify it to look like this. The key is adding the `try_files` line.

    ```nginx
    server {
        # ... (other settings remain the same)

        root /var/www/html;
        index index.html index.htm;

        server_name _;

        location / {
            # First attempt to serve request as file, then
            # as directory, then fall back to displaying index.html
            try_files $uri $uri/ /index.html;
        }

        # ... (other settings remain the same)
    }
    ```
    Save the file and exit nano (`Ctrl+X`, then `Y`, then `Enter`).

4.  **Test and Restart Nginx**:
    ```bash
    # Check for syntax errors in your configuration
    sudo nginx -t

    # If the test is successful, restart the Nginx service to apply changes
    sudo systemctl restart nginx
    ```

**Verification**: Open the Chromium browser on your Pi and navigate to `http://localhost`. You should see the application's login page.

---

## Step 5: Set Up Live AIS Feed (Recommended)

To connect a real AIS receiver, you need to run a background service on the Pi that listens for the data and forwards it to the frontend application.

1.  **Install Ingestion Service Dependencies**: In your project folder (`~/pvms`), install the required Node.js packages.
    ```bash
    # Navigate to your project directory if you're not already there
    cd ~/pvms

    # Install packages for WebSockets and NMEA parsing
    npm install ws nmea-0183

    # If you are using a SERIAL/USB connection, ALSO install this:
    npm install serialport @serialport/parser-readline
    ```

2.  **Configure the Ingestion Script**:
    Choose the script that matches your hardware and open it for editing.
    *   **For UDP/LAN**: `nano services/ais-udp-listener.js`
    *   **For Serial/USB**: `nano services/ais-serial-listener.js`

    Inside the file, find the `PORT_ID_FOR_THIS_FEED` variable and change its value to match the ID of the port you are monitoring in the application (e.g., `'port-rt'`). Save and exit.

3.  **Set up a Background Service with PM2**: PM2 is a process manager that will ensure your AIS listener runs continuously and restarts automatically on boot.
    ```bash
    # Install PM2 globally
    sudo npm install -g pm2

    # Start the service (CHOOSE ONE):
    # For UDP/LAN:
    pm2 start services/ais-udp-listener.js --name "ais-udp-service"

    # For Serial/USB:
    pm2 start services/ais-serial-listener.js --name "ais-serial-service"

    # Tell PM2 to save the process list for reboot
    pm2 save

    # Create a startup script so PM2 launches on boot
    pm2 startup
    # (This will give you a command to copy and paste. Run it.)
    ```

4.  **Enable Live Feed in the Application**:
    *   Once the app is running in the browser, log in.
    *   Go to the **Settings** page from the sidebar.
    *   Under **AIS Data Source**, select either "Live UDP/LAN Feed" or "Live Serial Port Feed".
    *   The application will now stop its internal simulator and listen for live data from your background service.

---

## Step 6: Set Up Kiosk Mode (Auto-start on Boot)

This final step will configure the Raspberry Pi to automatically launch the Chromium browser in full-screen mode and load your application whenever it boots up.

1.  **Edit the Autostart File**:
    ```bash
    # Open the autostart file for the current user ('pi')
    nano ~/.config/lxsession/LXDE-pi/autostart
    ```

2.  **Add Kiosk Mode Commands**: Add the following lines to the **end** of the file.
    ```
    # Hide the mouse cursor after a few seconds of inactivity
    @unclutter -idle 5

    # Suppress screen blanking and power-saving modes
    @xset s noblank
    @xset s off
    @xset -dpms

    # Launch Chromium in kiosk mode, pointing to our local application
    # --noerrdialogs: Prevents error popups (e.g., "Chrome didn't shut down correctly")
    # --disable-infobars: Hides the "Chrome is being controlled by automated software" bar
    # --incognito: Prevents caching issues and keeps the session clean on each boot
    @chromium-browser --kiosk --noerrdialogs --disable-infobars --incognito http://localhost
    ```

3.  Save the file and exit nano (`Ctrl+X`, then `Y`, then `Enter`).

---

## Step 7: Final Reboot and Verification

Your Raspberry Pi is now fully configured.

1.  **Reboot the System**:
    ```bash
    sudo reboot
    ```

2.  **Verify**: Upon restarting, the Pi desktop should load, and after a few moments, the Chromium browser should automatically open in full-screen, displaying your Port Vessel Management System. If you configured a live AIS feed, you should start seeing real vessel data appear on the map.

Your dedicated kiosk is now complete!

## Troubleshooting

*   **Blank Screen or "Can't connect" in browser**: Ensure Nginx is running (`sudo systemctl status nginx`). Check the Nginx error logs (`tail /var/log/nginx/error.log`).
*   **No Live AIS Data**: Check your PM2 service status with `pm2 list`. Look at its logs with `pm2 logs ais-udp-service` (or `ais-serial-service`). Ensure your AIS hardware is connected and powered on, and that you've selected the correct live data source in the application's Settings page.
*   **Browser Doesn't Start on Boot**: Check for typos in your `~/.config/lxsession/LXDE-pi/autostart` file. Ensure the file permissions are correct.