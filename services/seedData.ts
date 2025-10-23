// services/seedData.ts
import { BerthType, ShipStatus, UserRole, MovementEventType, TripStatus } from '../types';
import type { Port, Berth, Ship, User, ShipMovement, Trip, LoginHistoryEntry, InteractionLogEntry } from '../types';
import { createCircle, createRectangleFromLine } from '../utils/geolocation';

// --- GEOSPATIAL DATA ---
const PORT_SG_CENTER: [number, number] = [1.2647, 103.8225];

const BERTH_KEPPEL_1_START: [number, number] = [1.265, 103.820];
const BERTH_KEPPEL_1_END: [number, number] = [1.266, 103.821];
const BERTH_KEPPEL_2_START: [number, number] = [1.266, 103.821];
const BERTH_KEPPEL_2_END: [number, number] = [1.267, 103.822];

const ANCHORAGE_ALPHA_CENTER: [number, number] = [1.25, 103.83];

// --- SEED DATA ---
export const initialSeedData = {
  ports: [
    {
      id: 'port-sg',
      name: 'Port of Singapore',
      lat: PORT_SG_CENTER[0],
      lon: PORT_SG_CENTER[1],
      geometry: createCircle(PORT_SG_CENTER, 5000, 64),
      boundaryType: 'circle',
      boundaryRadius: 5000,
    }
  ] as Port[],
  berths: [
    {
      id: 'berth-kep-1',
      portId: 'port-sg',
      name: 'Keppel Terminal Berth 1',
      type: BerthType.BERTH,
      maxLength: 200,
      maxDraft: 12,
      equipment: ['Crane', 'Water'],
      quayId: 'quay-keppel',
      positionOnQuay: 1,
      geometry: createRectangleFromLine(BERTH_KEPPEL_1_START, BERTH_KEPPEL_1_END, 30),
    },
    {
      id: 'berth-kep-2',
      portId: 'port-sg',
      name: 'Keppel Terminal Berth 2',
      type: BerthType.BERTH,
      maxLength: 250,
      maxDraft: 14,
      equipment: ['Crane', 'Fuel'],
      quayId: 'quay-keppel',
      positionOnQuay: 2,
      geometry: createRectangleFromLine(BERTH_KEPPEL_2_START, BERTH_KEPPEL_2_END, 30),
    },
    {
      id: 'anchorage-alpha',
      portId: 'port-sg',
      name: 'Eastern Anchorage Alpha',
      type: BerthType.ANCHORAGE,
      maxLength: 500,
      maxDraft: 20,
      equipment: [],
      quayId: '',
      positionOnQuay: 0,
      geometry: createCircle(ANCHORAGE_ALPHA_CENTER, 500, 64),
      radius: 500,
    },
  ] as Berth[],
  users: [
    { 
        id: 'user-admin', name: 'Admin User', role: UserRole.ADMIN, password: 'password', forcePasswordChange: false,
        email: 'admin@portauthority.gov', phone: '+65 6123 0001', gsm: '', company: 'Port Authority HQ' 
    },
    { 
        id: 'user-supervisor', name: 'Supervisor Sam', role: UserRole.SUPERVISOR, portId: 'port-sg', password: 'password', forcePasswordChange: true,
        email: 'sam.s@portauthority.gov', phone: '+65 6123 1001', gsm: '+65 9123 1001', company: 'Port Authority SG'
    },
    { 
        id: 'user-op', name: 'Operator Olivia', role: UserRole.OPERATOR, portId: 'port-sg', password: 'password', forcePasswordChange: true,
        email: 'olivia.o@portauthority.gov', phone: '+65 6123 1002', gsm: '', company: 'Port Authority SG'
    },
    { 
        id: 'user-pilot', name: 'Pilot Pete', role: UserRole.PILOT, portId: 'port-sg', password: 'password', forcePasswordChange: true,
        email: 'pete@harborpilots.com', phone: '', gsm: '+65 9234 2001', company: 'Harbor Pilots Inc.'
    },
    { 
        id: 'user-agent', name: 'Agent Anna', role: UserRole.AGENT, portId: 'port-sg', password: 'password', forcePasswordChange: true,
        email: 'anna.a@oceanic.com', phone: '+65 6345 3001', gsm: '+65 9345 3001', company: 'Oceanic Shipping Agency'
    },
  ] as User[],
  ships: [
    {
      id: 'ship-evergreen',
      portId: 'port-sg',
      name: 'Evergreen',
      imo: '9811000',
      type: 'Container Ship',
      length: 220,
      draft: 13,
      flag: 'PA',
      eta: new Date(Date.now() - 3600000).toISOString(),
      etd: new Date(Date.now() + 86400000 * 2).toISOString(),
      status: ShipStatus.DOCKED,
      berthIds: ['berth-kep-2'],
      pilotId: 'user-pilot',
      agentId: 'user-agent',
      hasDangerousGoods: false,
      lat: 1.2665,
      lon: 103.8215,
      currentTripId: 'trip-1',
    },
    {
      id: 'ship-maersk',
      portId: 'port-sg',
      name: 'Maersk',
      imo: '9321483',
      type: 'Container Ship',
      length: 180,
      draft: 11,
      flag: 'DK',
      eta: new Date(Date.now() + 3600000).toISOString(),
      etd: new Date(Date.now() + 86400000 * 3).toISOString(),
      status: ShipStatus.APPROACHING,
      berthIds: [],
      hasDangerousGoods: true,
      lat: 1.2,
      lon: 103.9,
      heading: 315,
      currentTripId: 'trip-2',
    },
  ] as Ship[],
  trips: [
      {
          id: 'trip-1',
          shipId: 'ship-evergreen',
          portId: 'port-sg',
          arrivalTimestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
          departureTimestamp: null,
          status: TripStatus.ACTIVE,
          vesselName: 'Evergreen',
          vesselImo: '9811000',
          agentId: 'user-agent',
          pilotId: 'user-pilot',
      },
      {
          id: 'trip-2',
          shipId: 'ship-maersk',
          portId: 'port-sg',
          arrivalTimestamp: new Date(Date.now() - 3600000).toISOString(),
          departureTimestamp: null,
          status: TripStatus.ACTIVE,
          vesselName: 'Maersk',
          vesselImo: '9321483',
      }
  ] as Trip[],
  movements: [] as ShipMovement[],
  loginHistory: [] as LoginHistoryEntry[],
  interactionLog: [] as InteractionLogEntry[],
};