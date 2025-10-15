/*
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
*/
