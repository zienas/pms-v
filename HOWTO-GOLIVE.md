# How to Go Live: Connecting a Real AIS Data Feed

This guide explains the architecture and provides practical examples for replacing the built-in AIS simulator with a live data feed from a real-world AIS hardware receiver on either a **Linux** (e.g., Raspberry Pi, VPS) or **Windows** machine.

## 1. Architectural Overview: The Need for an Ingestion Service

For security reasons, a browser-based frontend application **cannot** directly access a user's hardware, such as UDP network ports or serial (COM) ports. This is a fundamental security sandbox feature of all modern web browsers.

Therefore, to get live AIS data into the application, we must introduce a new backend component: an **AIS Ingestion Service**.

This is a small, dedicated server-side application whose only job is to:
1.  Listen to the hardware interface (UDP or serial port) where the AIS receiver is sending data.
2.  Receive the raw AIS data (typically as NMEA sentences).
3.  Parse this data to extract useful information (MMSI, position, speed, IMO, etc.).
4.  Forward this structured data to our main **Port Management Backend API**.

### The Production Data Flow

The final data flow in a live environment will look like this:

**`AIS Receiver (Hardware)`** -> **`AIS Ingestion Service (Node.js)`** -> **`Main Backend API`** -> **`Database`**

---

## 2. Prerequisites

1.  **Node.js**: You must have a modern version of Node.js (v16+) installed on the computer that will run the listener service.
    *   **For Windows**: Download the LTS installer from [nodejs.org](https://nodejs.org/).
    *   **For Linux/Debian**: Follow instructions at [NodeSource](https://github.com/nodesource/distributions).
2.  **Project Files**: You need the application source code on the listener computer. You can get this by cloning the project repository with `git`.
3.  **Administrator/Root Access**: You will need administrative privileges to install background services and configure the firewall.

---

## 3. Configuration (Manual Step)

Before running a listener script (either manually or with the automated script), you must configure it. Open either `services/ais-udp-listener.js` or `services/ais-serial-listener.js` in a text editor and modify the variables in the `// --- Configuration ---` section:

*   **`API_ENDPOINT`**: **Crucial**. This must be the full URL to your main backend API. If you followed the VPS deployment guide, this will be something like `https://pvms.your-domain.com/api/ais/update`.
*   **`PORT_ID_FOR_THIS_FEED`**: Set this to the ID of the port that this AIS feed corresponds to (e.g., `'port-sg'`).
*   **`UDP_PORT`** (for UDP listener): The network port your AIS hardware broadcasts to.
*   **`SERIAL_PORT_PATH`** (for Serial listener): The system path to your serial device.
    *   On Windows, this will be `'COM3'`, `'COM4'`, etc. Check Device Manager to find the correct port.
    *   On Linux, this is typically `'/dev/ttyUSB0'` or `'/dev/ttyS0'`.

---

## 4. Running the Service

### For Windows (Recommended Method: Automated Script)

The easiest way to set up the listener on Windows is with the provided PowerShell script.

1.  **Locate and Rename the Script**: Find the `setup-windows-listener.ps1.md` file in the project's root directory. Rename it to `setup-windows-listener.ps1`.
2.  **Run as Administrator**: Right-click the newly renamed `setup-windows-listener.ps1` file and select **"Run with PowerShell"**.
3.  **Approve UAC**: If the User Account Control (UAC) prompt appears, click **Yes** to allow the script to run with administrator privileges.
4.  **Follow On-Screen Prompts**: The script will guide you through the process, asking whether you want to set up a UDP or Serial listener.
5.  **Final Configuration**: After the script finishes, it will remind you to perform the manual configuration step described in **Section 3** above. If you've already done it, simply restart the service by running `pm2 restart ais-ingestion-service` in a PowerShell window.

### For Linux / Raspberry Pi

1.  **Install PM2**:
    ```bash
    sudo npm install -g pm2
    ```
2.  **Install Dependencies**: In the project's root folder, run:
    ```bash
    # For all listeners
    npm install ws nmea-0183
    # For serial/USB listeners ONLY
    npm install serialport @serialport/parser-readline
    ```
3.  **Start the Service** (choose one):
    ```bash
    # For UDP/LAN
    pm2 start services/ais-udp-listener.js --name "ais-ingestion-service"

    # For Serial/USB
    pm2 start services/ais-serial-listener.js --name "ais-ingestion-service"
    ```
4.  **Enable on Boot**:
    ```bash
    pm2 save
    pm2 startup
    # (PM2 will give you a command to copy and paste. Run that command.)
    ```

---
---

## Appendix: Manual Windows Setup

These steps are for reference and are automated by the PowerShell script.

1.  **Install PM2 and Startup Package**: Open **PowerShell as an Administrator**.
    ```powershell
    # Install PM2 globally
    npm install -g pm2

    # Install the package to manage Windows startup services
    npm install -g pm2-windows-startup
    ```
2.  **Configure Startup**:
    ```powershell
    # Configure the startup script for PM2
    pm2-startup install
    ```
3.  **Install Dependencies**: From a regular PowerShell prompt in the project's root folder:
    ```powershell
    # For all listeners
    npm install ws nmea-0183
    # For serial/USB listeners ONLY
    npm install serialport @serialport/parser-readline
    ```
4.  **Start the Service**:
    ```powershell
    # For UDP/LAN
    pm2 start services/ais-udp-listener.js --name "ais-ingestion-service"

    # For Serial/USB
    pm2 start services/ais-serial-listener.js --name "ais-ingestion-service"
    ```
5.  **Save the Process List**:
    ```powershell
    pm2 save
    ```
6.  **Firewall Configuration (UDP Listener Only)**:
    *   Open **Windows Defender Firewall with Advanced Security**.
    *   Go to **Inbound Rules** -> **New Rule...**.
    *   Select **Port**, then **UDP**.
    *   Enter the specific local port your AIS receiver uses (e.g., `10110`).
    *   Select **Allow the connection**, apply to profiles, and give it a name like "AIS UDP Inbound".
