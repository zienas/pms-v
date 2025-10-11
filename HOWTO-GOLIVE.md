# How to Go Live: Connecting a Real AIS Data Feed

This guide explains the architecture and provides practical examples for replacing the built-in AIS simulator with a live data feed from a real-world AIS hardware receiver.

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

## 2. Building the AIS Ingestion Service (Node.js Examples)

Here are two practical examples of how to build this service using Node.js. You would choose the option that matches your hardware setup.

### Prerequisites

You will need Node.js installed on the server where you plan to run this service.

1.  **On your server, create a new project folder:**
    ```bash
    mkdir ais-ingestion-service
    cd ais-ingestion-service
    npm init -y
    ```

2.  **Install the necessary packages:**
    ```bash
    # For parsing NMEA sentences and making HTTP requests
    npm install nmea-0183 node-fetch

    # If you are using a serial port connection, ALSO install this:
    npm install serialport @serialport/parser-readline
    ```

### Option A: Listening from a UDP / LAN Source

Many modern AIS receivers broadcast NMEA sentences over a local network via UDP. Create a file named `ais-udp-listener.js` and paste the code below.

```javascript
// ais-udp-listener.js
/**
 * NOTE: This is a BACKEND service script.
 * It is designed to be run with Node.js, not in the browser.
 * This script listens for AIS data on a UDP port, parses it, and forwards it
 * to the main application's backend API.
 *
 * --- SETUP ---
 * 1. Install Node.js on your server.
 * 2. Create a project folder: `mkdir ais-ingestion && cd ais-ingestion`
 * 3. Initialize the project: `npm init -y`
 * 4. Install dependencies: `npm install nmea-0183 node-fetch`
 *
 * --- TO RUN ---
 * Direct: `node ais-udp-listener.js`
 * Production (with PM2):
 *   `sudo npm install -g pm2`
 *   `pm2 start ais-udp-listener.js --name "ais-ingestion-service"`
 *   `pm2 save`
 *   `pm2 startup` (and follow instructions)
 */

const dgram = require('dgram');
const { Nmea0183, AisMessage, Vdm } = require('nmea-0183');
const fetch = require('node-fetch');

// --- Configuration ---
const UDP_PORT = 10110; // The port your AIS receiver is broadcasting to
const UDP_HOST = '0.0.0.0'; // Listen on all available network interfaces
// This should be the full URL to your backend API endpoint.
const API_ENDPOINT = 'http://localhost:4000/api/updateShipFromAIS'; 
const PORT_ID_FOR_THIS_FEED = 'port-sg'; // Configure which port this AIS feed belongs to

const server = dgram.createSocket('udp4');
const nmeaParser = new Nmea0183();

// A temporary in-memory map to link a vessel's MMSI to its IMO number.
// In a production system, this might be backed by a more persistent cache like Redis.
const mmsiToImoMap = new Map();

// This event is triggered whenever the parser successfully decodes a NMEA sentence.
nmeaParser.on('data', (data) => {
    // We are interested in VDM sentences, which contain AIS messages.
    if (data instanceof Vdm) {
        const message = data.message;
        if (message instanceof AisMessage) {
            handleAisMessage(message);
        }
    }
});

function handleAisMessage(message) {
    let payload = null;
    
    // Type 5: Static and Voyage Related Data (IMO, name, type)
    if (message.messageType === 5 && message.imo) {
        // When we get a Type 5 message, we learn the ship's IMO number and can link it to its MMSI.
        mmsiToImoMap.set(message.mmsi, message.imo);
        payload = {
            imo: message.imo.toString(),
            portId: PORT_ID_FOR_THIS_FEED,
            name: message.shipname?.trim(),
            type: message.shipType?.toString(),
        };
        console.log(`[AIS] Parsed Voyage Info for IMO: ${payload.imo}`);
        sendToBackend(payload);
    }

    // Type 1, 2, 3: Position Report Class A
    // These messages give us the ship's position but usually only contain the MMSI.
    // We check our map to see if we know the IMO for this MMSI.
    if ([1, 2, 3].includes(message.messageType) && mmsiToImoMap.has(message.mmsi)) {
        payload = {
            imo: mmsiToImoMap.get(message.mmsi).toString(),
            portId: PORT_ID_FOR_THIS_FEED,
            lat: message.lat,
            lon: message.lon,
            status: mapNavStatus(message.navStatus),
        };
         console.log(`[AIS] Parsed Position Report for IMO: ${payload.imo}`);
        sendToBackend(payload);
    }
}

// Map AIS Navigational Status codes to our application's specific statuses.
function mapNavStatus(navStatus) {
    const code = navStatus?.code;
    switch(code) {
        case 1: // Under way using engine
        case 5: // Moored
            return 'Docked';
        case 2: // At anchor
            return 'At Anchorage';
        default:
            return undefined; // We don't want to change the status for other codes.
    }
}

async function sendToBackend(payload) {
    if (!payload || !payload.imo) return;

    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
            console.error(`API Error: ${response.status} ${await response.text()}`);
        } else {
            console.log(`Successfully sent update for IMO ${payload.imo} to backend.`);
        }
    } catch (error) {
        console.error('Failed to send data to backend API:', error);
    }
}

// --- UDP Server Setup & Event Handlers ---

server.on('error', (err) => {
    console.error(`UDP server error:\n${err.stack}`);
    server.close();
});

server.on('message', (msg, rinfo) => {
    const sentence = msg.toString().trim();
    console.log(`[AIS] Received ${sentence.length} bytes from ${rinfo.address}:${rinfo.port}`);
    // Feed every raw NMEA sentence into the parser.
    nmeaParser.parse(sentence);
});

server.on('listening', () => {
    const address = server.address();
    console.log(`AIS UDP listener started on ${address.address}:${address.port}`);
});

// Start listening for UDP packets.
server.bind(UDP_PORT, UDP_HOST);
```

### Option B: Listening from a Serial Port Interface

Older or more direct hardware connections might use a serial port (e.g., RS-232 or a USB-to-Serial adapter). Create a file named `ais-serial-listener.js` and paste the code below.

```javascript
// ais-serial-listener.js
/**
 * NOTE: This is a BACKEND service script.
 * See ais-udp-listener.js for setup instructions. You will also need to install
 * the serialport package: `npm install serialport @serialport/parser-readline`
 */

const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const { Nmea0183, AisMessage, Vdm } = require('nmea-0183');
const fetch = require('node-fetch');

// --- Configuration ---
const SERIAL_PORT_PATH = '/dev/ttyUSB0'; // e.g., 'COM3' on Windows
const BAUD_RATE = 38400; // Common for AIS, but check your receiver's manual
const API_ENDPOINT = 'http://localhost:4000/api/updateShipFromAIS';
const PORT_ID_FOR_THIS_FEED = 'port-rt'; // Configure which port this feed belongs to

const port = new SerialPort({ path: SERIAL_PORT_PATH, baudRate: BAUD_RATE });
const lineParser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));
const nmeaParser = new Nmea0183();
const mmsiToImoMap = new Map();

// --- Code for parsing and sending data ---
// This event is triggered whenever the parser successfully decodes a NMEA sentence.
nmeaParser.on('data', (data) => {
    // We are interested in VDM sentences, which contain AIS messages.
    if (data instanceof Vdm) {
        const message = data.message;
        if (message instanceof AisMessage) {
            handleAisMessage(message);
        }
    }
});

function handleAisMessage(message) {
    let payload = null;
    
    // Type 5: Static and Voyage Related Data (IMO, name, type)
    if (message.messageType === 5 && message.imo) {
        mmsiToImoMap.set(message.mmsi, message.imo);
        payload = {
            imo: message.imo.toString(),
            portId: PORT_ID_FOR_THIS_FEED,
            name: message.shipname?.trim(),
            type: message.shipType?.toString(),
        };
        console.log(`[AIS] Parsed Voyage Info for IMO: ${payload.imo}`);
        sendToBackend(payload);
    }

    // Type 1, 2, 3: Position Report Class A
    if ([1, 2, 3].includes(message.messageType) && mmsiToImoMap.has(message.mmsi)) {
        payload = {
            imo: mmsiToImoMap.get(message.mmsi).toString(),
            portId: PORT_ID_FOR_THIS_FEED,
            lat: message.lat,
            lon: message.lon,
            status: mapNavStatus(message.navStatus),
        };
         console.log(`[AIS] Parsed Position Report for IMO: ${payload.imo}`);
        sendToBackend(payload);
    }
}

// Map AIS Navigational Status codes to our application's specific statuses.
function mapNavStatus(navStatus) {
    const code = navStatus?.code;
    switch(code) {
        case 1: // Under way using engine
        case 5: // Moored
            return 'Docked';
        case 2: // At anchor
            return 'At Anchorage';
        default:
            return undefined; // We don't want to change the status for other codes.
    }
}

async function sendToBackend(payload) {
    if (!payload || !payload.imo) return;

    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
            console.error(`API Error: ${response.status} ${await response.text()}`);
        } else {
            console.log(`Successfully sent update for IMO ${payload.imo} to backend.`);
        }
    } catch (error) {
        console.error('Failed to send data to backend API:', error);
    }
}

// --- Serial Port Event Handlers ---
port.on('open', () => {
    console.log(`Serial port ${SERIAL_PORT_PATH} opened successfully.`);
});

port.on('error', (err) => {
    console.error('Serial Port Error: ', err.message);
});

lineParser.on('data', (sentence) => {
    console.log(`Received raw NMEA from serial: ${sentence}`);
    nmeaParser.parse(sentence.trim());
});
```

---

## 3. Disabling the Frontend Simulator

Once your ingestion service is forwarding data to your main backend, the frontend simulator is no longer needed.

1.  Log into the Port Management application.
2.  Navigate to the **Settings** page in the sidebar.
3.  Under "AIS Data Source," select either **Live UDP/LAN Feed** or **Live Serial Port Feed**.
4.  This will automatically disable the internal simulator.

---

## 4. Deploying the Ingestion Service

This new Node.js service needs to run continuously on your server. The best way to manage this is with a process manager like **PM2**.

### Step 1: Install PM2 Globally

```bash
sudo npm install -g pm2
```

### Step 2: Start the Service

Navigate to your `ais-ingestion-service` directory on your server and start the appropriate script.

```bash
# For the UDP listener
pm2 start ais-udp-listener.js --name "ais-ingestion-service"

# OR for the Serial listener
pm2 start ais-serial-listener.js --name "ais-ingestion-service"
```

### Step 3: Ensure it Restarts on Boot

```bash
# This command generates a startup script for your OS
pm2 startup

# Follow the instructions it gives you (usually one command to copy/paste)

# Save the current process list to be resurrected on reboot
pm2 save
```

Your AIS ingestion service is now running and will automatically restart if it crashes or the server reboots. You can monitor it using the command `pm2 monit`.