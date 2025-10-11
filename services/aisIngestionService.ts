/**
 * NOTE: This is a BACKEND service script.
 * It is designed to be run with Node.js, not in the browser.
 * This script listens for AIS data on a UDP port, parses it, and forwards it
 * to the main application's backend API.
 *
 * To run this, you would need Node.js and the following packages:
 * npm install node-fetch nmea-0183 @types/node-fetch
 *
 * Then, from your terminal (you might need ts-node):
 * ts-node services/aisIngestionService.ts
 */

/*
import dgram from 'dgram';
import fetch from 'node-fetch';
// nmea-0183 is a community package for parsing NMEA sentences
import { Nmea0183, AisMessage, Vdm } from 'nmea-0183';
import type { AisData } from '../types';

// --- Configuration ---
const UDP_PORT = 10110;
const UDP_HOST = '0.0.0.0'; // Listen on all network interfaces
// This should point to your *real* backend API endpoint, which is simulated in api.ts
const API_ENDPOINT = 'http://localhost:3000/api/updateShipFromAIS'; 
const PORT_ID_FOR_THIS_FEED = 'port-sg'; // You would configure which port this AIS feed belongs to

const server = dgram.createSocket('udp4');
const nmeaParser = new Nmea0183();

// Event listener for successfully parsed data
nmeaParser.on('data', (data) => {
    // We are only interested in AIS messages (VDM sentences)
    if (data instanceof Vdm) {
        const message = data.message;
        // Message Type 5 contains Static and Voyage Related Data (IMO, name, type)
        // This is often the most useful message for creating/identifying a vessel.
        if (message instanceof AisMessage && message.messageType === 5) {
            console.log(`[AIS Ingestion] Parsed Voyage Info for IMO: ${message.imo}`);
            
            const payload: AisData = {
                imo: message.imo?.toString() || '',
                portId: PORT_ID_FOR_THIS_FEED,
                name: message.shipname?.trim(),
                type: message.shipType?.toString(),
            };
            sendToBackend(payload);
        }
    }
});

// Main function to send structured data to our backend API
async function sendToBackend(payload: AisData) {
    if (!payload.imo) {
        console.warn('[AIS Ingestion] Skipping message without IMO number.');
        return;
    }

    try {
        console.log(`[AIS Ingestion] Forwarding update for IMO ${payload.imo} to API...`);
        // In a real app, this fetch would hit your live server.
        // For this project, you would need a small server to run the 'api.ts' logic.
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[AIS Ingestion] API Error: ${response.status} - ${errorText}`);
        } else {
            console.log(`[AIS Ingestion] Successfully sent update for IMO ${payload.imo}.`);
        }
    } catch (error) {
        console.error('[AIS Ingestion] Failed to send data to backend API:', error);
    }
}

// --- UDP Server Setup ---
server.on('error', (err) => {
    console.error(`[AIS Ingestion] UDP Server Error:\n${err.stack}`);
    server.close();
});

server.on('message', (msg, rinfo) => {
    const sentence = msg.toString().trim();
    console.log(`[AIS Ingestion] Received raw message from ${rinfo.address}:${rinfo.port}: ${sentence}`);
    // Feed every raw NMEA sentence received over UDP into the parser
    nmeaParser.parse(sentence);
});

server.on('listening', () => {
    const address = server.address();
    console.log(`[AIS Ingestion] Service listening for AIS data on UDP ${address.address}:${address.port}`);
    console.log(`Forwarding updates to API at: ${API_ENDPOINT}`);
});

server.bind(UDP_PORT, UDP_HOST);
*/
