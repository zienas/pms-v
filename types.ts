// --- ENUMS ---

export enum UserRole {
  ADMIN = 'Administrator',
  SUPERVISOR = 'Supervisor',
  OPERATOR = 'Port Operator',
  AGENT = 'Maritime Agent',
  PILOT = 'Pilot',
}

export enum ShipStatus {
  APPROACHING = 'Approaching',
  ANCHORED = 'Anchored',
  DOCKED = 'Docked',
  DEPARTING = 'Departing',
  LEFT_PORT = 'Left Port',
}

export enum BerthType {
  BERTH = 'Berth',
  QUAY = 'Quay',
  ANCHORAGE = 'Anchorage',
}

export enum MovementEventType {
  CREATED = 'Vessel Registered',
  AIS_UPDATE = 'AIS Update',
  STATUS_CHANGE = 'Status Change',
  BERTH_ASSIGNMENT = 'Berth Assignment',
  PILOT_ASSIGNMENT = 'Pilot Assignment',
  AGENT_ASSIGNMENT = 'Agent Assignment',
  PILOT_ONBOARD = 'Pilot Onboard',
  PILOT_OFFBOARD = 'Pilot Offboard',
}

export enum TripStatus {
  ACTIVE = 'Active',
  COMPLETED = 'Completed',
}

export enum AlertType {
  WARNING = 'Warning',
  ERROR = 'Error',
}

export enum InteractionEventType {
    VIEW_CHANGE = 'View Change',
    MAP_INTERACTION = 'Map Interaction',
    DATA_EXPORT = 'Data Export',
    FILTER_APPLIED = 'Filter Applied',
    SORT_APPLIED = 'Sort Applied',
    MODAL_OPEN = 'Modal Open',
    MODAL_CLOSE = 'Modal Close',
    FORM_SUBMIT = 'Form Submit',
    BUTTON_CLICK = 'Button Click',
    GENERIC_CLICK = 'Generic Click',
    BROWSER_ZOOM = 'Browser Zoom',
}


// --- INTERFACES ---

export interface Port {
  id: string;
  name: string;
  lat: number;
  lon: number;
  geometry?: [number, number][];
  boundaryType?: 'polygon' | 'circle';
  boundaryRadius?: number;
  logoImage?: string;
  defaultZoom?: number;
  mapTheme?: 'day' | 'dusk' | 'night';
}

export interface Berth {
  id: string;
  portId: string;
  name: string;
  type: BerthType;
  maxLength: number;
  maxDraft: number;
  equipment: string[];
  quayId: string;
  positionOnQuay: number;
  geometry?: [number, number][];
  radius?: number; // for anchorage
}

export interface Ship {
  id: string;
  portId: string;
  name: string;
  imo: string;
  type: string;
  length: number;
  draft: number;
  flag: string;
  eta: string; // ISO string
  etd: string; // ISO string
  departureDate?: string; // ISO string, set when status becomes LEFT_PORT
  status: ShipStatus;
  berthIds: string[];
  pilotId?: string;
  agentId?: string;
  hasDangerousGoods: boolean;
  lat?: number;
  lon?: number;
  heading?: number; // Vessel's true heading in degrees (0-359)
  currentTripId?: string;
  // Additions for simulation
  speed?: number; // knots
  rateOfTurn?: number; // degrees per minute
  targetLat?: number;
  targetLon?: number;
}

export interface User {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  gsm?: string;
  company?: string;
  role: UserRole;
  portId?: string;
  password?: string; // Should not be sent to client, but needed for simulation
  forcePasswordChange?: boolean;
  notes?: string;
}

export interface Trip {
  id: string;
  shipId: string;
  portId: string;
  arrivalTimestamp: string; // ISO string
  departureTimestamp: string | null; // ISO string
  status: TripStatus;
  // Enriched fields for directory view
  vesselName?: string;
  vesselImo?: string;
  agentId?: string;
  pilotId?: string;
}

export interface ShipMovement {
  id: string;
  shipId: string;
  portId: string;
  tripId: string;
  eventType: MovementEventType;
  timestamp: string; // ISO string
  details: {
    message: string;
    fromStatus?: ShipStatus;
    status?: ShipStatus;
    fromBerthIds?: string[];
    berthIds?: string[];
    fromBerthNames?: string[];
    berthNames?: string[];
    fromPilotId?: string;
    pilotId?: string;
    fromAgentId?: string;
    agentId?: string;
  };
}

export interface LoginHistoryEntry {
  id: string;
  userId: string;
  userName: string;
  portId: string;
  portName: string;
  timestamp: string; // ISO string
  logoutTimestamp?: string; // ISO string
}

export interface InteractionLogEntry {
    id: string;
    userId: string;
    userName: string;
    portId: string;
    timestamp: string; // ISO string
    eventType: InteractionEventType;
    details: {
        message: string;
        view?: View;
        action?: string;
        value?: any;
        targetId?: string;
    };
}


export interface AisData {
  imo: string;
  portId: string;
  name?: string;
  type?: string;
  status?: ShipStatus;
  lat?: number;
  lon?: number;
  heading?: number;
}

export interface Alert {
  id: string;
  portId: string;
  type: AlertType;
  message: string;
  shipId?: string;
  timestamp: string; // ISO string
  acknowledged?: boolean;
}

// --- GENERAL & UI TYPES ---

export type View =
  | 'dashboard'
  | 'vessels'
  | 'berths'
  | 'alerts'
  | 'trips'
  | 'vessel-analytics'
  | 'logs'
  | 'management'
  | 'users'
  | 'settings'
  | 'pilot-log';

export type AisSource = 'simulator' | 'udp' | 'serial';

export type ModalState =
  | { type: 'shipForm'; ship: Ship | null }
  | { type: 'history'; ship: Ship }
  | { type: 'portForm'; port: Port | null }
  | { type: 'berthForm'; port: Port; berth: Berth | null }
  | { type: 'berthDetail'; berth: Berth }
  | { type: 'userForm'; user: User | null }
  | { type: 'tripDetail'; trip: Trip }
  | { type: 'reassignBerth'; ship: Ship }
  | { type: 'assignPilot'; ship: Ship };