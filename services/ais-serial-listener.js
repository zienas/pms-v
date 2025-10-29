// services/ais-serial-listener.js
/**
 * NOTE: This is a BACKEND service script for the Raspberry Pi Kiosk setup.
 * It is designed to be run with Node.js, not in the browser.
 * This script listens for AIS data on a serial port, parses it, and broadcasts
 * it over a WebSocket connection to the frontend application running on the same device.
 *
 * --- SETUP ---
 * 1. From the project's root directory (`pvms`), run:
 *    `npm install ws nmea-0183 serialport @serialport/parser-readline`
 *
 * --- TO RUN ---
 * Direct: `node services/ais-serial-listener.js`
 * Production (with PM2):
 *   `sudo npm install -g pm2`
 *   `pm2 start services/ais-serial-listener.js --name "ais-serial-service"`
 *   `pm2 save`
 *   `pm2 startup` (and follow instructions)
 */

const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const { Nmea0183, AisMessage, Vdm } = require('nmea-0183');
const WebSocket = require('ws');

// --- Configuration ---
const SERIAL_PORT_PATH = '/dev/ttyUSB0'; // Linux path. For Windows, use 'COM3', etc.
const BAUD_RATE = 38400; // Common for AIS, but check your receiver's manual
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

// --- AIS Serial Port Listener Setup ---
const serialPort = new SerialPort({ path: SERIAL_PORT_PATH, baudRate: BAUD_RATE });
const lineParser = serialPort.pipe(new ReadlineParser({ delimiter: '\r\n' }));
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
    if (message.messageType === 5 && message.imo) {
        mmsiToImoMap.set(message.mmsi, message.imo);
    }

    if ([1, 2, 3].includes(message.messageType) && message.lat && message.lon) {
        const { mmsi } = message;
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

// --- Serial Port Event Handlers ---
serialPort.on('open', () => {
    console.log(`[Serial] Port ${SERIAL_PORT_PATH} opened successfully.`);
});

serialPort.on('error', (err) => {
    console.error('[Serial] Port Error: ', err.message);
});

lineParser.on('data', (sentence) => {
    nmeaParser.parse(sentence.trim());
});