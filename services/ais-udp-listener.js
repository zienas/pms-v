// ais-udp-listener.js
/**
 * NOTE: This is a BACKEND service script for the Raspberry Pi Kiosk setup.
 * It is designed to be run with Node.js, not in the browser.
 * This script listens for AIS data on a UDP port, parses it, and broadcasts
 * it over a WebSocket connection to the frontend application running on the same device.
 *
 * --- SETUP ---
 * 1. From the project's root directory (`pvms`), run:
 *    `npm install ws nmea-0183`
 *
 * --- TO RUN ---
 * Direct: `node services/ais-udp-listener.js`
 * Production (with PM2):
 *   `sudo npm install -g pm2`
 *   `pm2 start services/ais-udp-listener.js --name "ais-udp-service"`
 *   `pm2 save`
 *   `pm2 startup` (and follow instructions)
 */

const dgram = require('dgram');
const { Nmea0183, AisMessage, Vdm } = require('nmea-0183');
const WebSocket = require('ws');

// --- Configuration ---
const AIS_UDP_PORT = 10110; // The port your AIS receiver is broadcasting to
const AIS_UDP_HOST = '0.0.0.0'; // Listen on all available network interfaces
const WEBSOCKET_PORT = 8080; // Port for the WebSocket server (must match frontend)
// ** IMPORTANT: Change this to match the Port ID you are monitoring in the app **
const PORT_ID_FOR_THIS_FEED = 'port-sg'; 

// --- WebSocket Server Setup ---
const wss = new WebSocket.Server({ port: WEBSOCKET_PORT });
console.log(`[WSS] WebSocket server started on port ${WEBSOCKET_PORT}`);

wss.on('connection', ws => {
  console.log('[WSS] Frontend client connected.');
  ws.on('close', () => {
    console.log('[WSS] Frontend client disconnected.');
  });
});

function broadcastToClients(message) {
  const messageString = JSON.stringify(message);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageString);
    }
  });
}


// --- AIS UDP Listener Setup ---
const udpServer = dgram.createSocket('udp4');
const nmeaParser = new Nmea0183();
const mmsiToImoMap = new Map();

// This event is triggered whenever the parser successfully decodes a NMEA sentence.
nmeaParser.on('data', (data) => {
    if (data instanceof Vdm) {
        const message = data.message;
        if (message instanceof AisMessage) {
            handleAisMessage(message);
        }
    }
});

function handleAisMessage(message) {
    // Type 5: Static and Voyage Related Data (IMO, name, type)
    if (message.messageType === 5 && message.imo) {
        // When we get a Type 5 message, we learn the ship's IMO number and can link it to its MMSI.
        mmsiToImoMap.set(message.mmsi, message.imo);
    }

    // Type 1, 2, 3: Position Report Class A
    if ([1, 2, 3].includes(message.messageType) && message.lat && message.lon) {
        const { mmsi } = message;
        // We only broadcast updates for vessels we have an IMO for.
        if (mmsiToImoMap.has(mmsi)) {
            const imo = mmsiToImoMap.get(mmsi);
            const positionUpdate = {
                type: 'ship_position_update',
                payload: {
                    imo: imo.toString(),
                    portId: PORT_ID_FOR_THIS_FEED,
                    lat: message.lat,
                    lon: message.lon,
                }
            };
            console.log(`[AIS] Broadcasting position for IMO: ${positionUpdate.payload.imo}`);
            broadcastToClients(positionUpdate);
        }
    }
}

// --- UDP Server Event Handlers ---
udpServer.on('error', (err) => {
    console.error(`[UDP] Server error:\n${err.stack}`);
    udpServer.close();
});

udpServer.on('message', (msg, rinfo) => {
    const sentence = msg.toString().trim();
    // Feed every raw NMEA sentence into the parser.
    nmeaParser.parse(sentence);
});

udpServer.on('listening', () => {
    const address = udpServer.address();
    console.log(`[UDP] AIS listener started on ${address.address}:${address.port}`);
});

// Start listening for UDP packets.
udpServer.bind(AIS_UDP_PORT, AIS_UDP_HOST);