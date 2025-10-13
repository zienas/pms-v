export enum ShipStatus {
  APPROACHING = 'Approaching',
  DOCKED = 'Docked',
  DEPARTING = 'Departing',
  ANCHORED = 'At Anchorage',
  LEFT_PORT = 'Left Port',
}

export enum BerthType {
  QUAY = 'Quay',
  BERTH = 'Berth',
  ANCHORAGE = 'Anchorage',
}

export enum AlertType {
  WARNING = 'Warning',
  ERROR = 'Error',
}

export enum UserRole {
  ADMIN = 'Admin',
  OPERATOR = 'Port Operator',
  CAPTAIN = 'Captain',
  AGENT = 'Maritime Agent',
  PILOT = 'Pilot',
}

export enum MovementEventType {
  CREATED = 'Vessel Registered',
  STATUS_CHANGE = 'Status Updated',
  BERTH_ASSIGNMENT = 'Berth Assignment',
  PILOT_ASSIGNMENT = 'Pilot Assignment',
  AIS_UPDATE = 'AIS Update',
  AGENT_ASSIGNMENT = 'Agent Assignment',
}

export enum TripStatus {
  ACTIVE = 'Active',
  COMPLETED = 'Completed',
}

export interface Trip {
  id: string;
  shipId: string;
  portId: string;
  arrivalTimestamp: string;
  departureTimestamp: string | null;
  status: TripStatus;
  // Enriched fields for directory view
  vesselName?: string;
  vesselImo?: string;
  agentId?: string;
  pilotId?: string;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  password?: string;
  portId?: string; // Used to scope non-admin users to a specific port
}

export interface Port {
  id: string;
  name: string;
  lat: number;
  lon: number;
  mapImage?: string; // Base64 Data URL for a custom map background image
  logoImage?: string; // Base64 Data URL for the port logo
  geometry?: [number, number][]; // Array of [lat, lon] pairs for the port boundary
}

export interface Ship {
  id: string;
  portId: string;
  name: string;
  imo: string;
  type: string;
  length: number; // in meters
  draft: number; // in meters
  flag: string;
  eta: string;
  etd: string;
  status: ShipStatus;
  berthIds: string[];
  departureDate?: string;
  pilotId?: string;
  agentId?: string; // Assigned agent for the current trip
  hasDangerousGoods: boolean;
  lat?: number;
  lon?: number;
  currentTripId?: string;
}

export interface Berth {
  id: string;
  portId: string;
  name: string;
  type: BerthType;
  maxLength: number; // in meters
  maxDraft: number; // in meters
  equipment: string[];
  quayId: string;
  positionOnQuay: number;
  geometry?: [number, number][]; // Array of [lat, lon] pairs
}

export interface Alert {
  id: string;
  portId: string;
  type: AlertType;
  message: string;
  shipId: string;
  timestamp: string;
  acknowledged?: boolean;
}

export interface ShipMovement {
    id: string;
    shipId: string;
    portId: string;
    tripId: string;
    eventType: MovementEventType;
    timestamp: string;
    details: {
        status?: ShipStatus;
        fromStatus?: ShipStatus;
        berthIds?: string[];
        fromBerthIds?: string[];
        berthNames?: string[];
        fromBerthNames?: string[];
        pilotId?: string;
        fromPilotId?: string;
        agentId?: string;
        fromAgentId?: string;
        message: string;
    };
}

export interface LoginHistoryEntry {
    id: string;
    userId: string;
    userName: string;
    portId: string;
    portName: string;
    timestamp: string;
    logoutTimestamp?: string;
}

export interface AisData {
  imo: string;
  portId: string;
  name?: string;
  type?: string;
  status?: ShipStatus;
  lat?: number;
  lon?: number;
}

export type AisSource = 'simulator' | 'udp' | 'serial';

export type View = 'dashboard' | 'vessels' | 'berths' | 'alerts' | 'management' | 'users' | 'settings' | 'vessel-analytics' | 'trips';

// FIX: Added ModalState type export
export type ModalState =
  | { type: 'shipForm'; ship: Ship | null }
  | { type: 'history'; ship: Ship }
  | { type: 'portForm'; port: Port | null }
  | { type: 'berthForm'; port: Port; berth: Berth | null }
  | { type: 'berthDetail'; berth: Berth }
  | { type: 'tripDetail'; trip: Trip }
  | { type: 'userForm'; user: User | null };
