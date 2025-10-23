# Engineering Prompt: Native Windows Port Vessel Management System

## 1. Project Goal

To create a high-performance, feature-rich, and reliable native Windows desktop application for maritime port vessel management. This application will replicate and enhance the functionality of the existing web-based "Port Vessel Management System," providing a robust solution for port operators, administrators, and other maritime professionals.

A key requirement is to leverage the native capabilities of the Windows platform for direct hardware integration (AIS receivers via UDP/Serial), improved performance, and potential offline functionality.

---

## 2. Core Functional Requirements

The Windows application must implement the full feature set of its web counterpart. This includes:

-   **Dynamic Geospatial Dashboard**: A live, coordinate-based map that visualizes vessel traffic.
-   **Proactive & Automated Alerts**: An advanced alert system for proximity warnings, safety, and conflict alerts.
-   **Vessel Trip & Stopover Tracking**: The application must manage the entire lifecycle of a vessel's visit (a "trip" or "stopover").
-   **Comprehensive Vessel & Berth Management**: Full CRUD (Create, Read, Update, Delete) functionality for all port assets.
-   **Vessel Attendance Analytics**: A dedicated analytics view showing historical attendance data for each vessel.
-   **Multi-Port & User Management (Admin)**: Full CRUD functionality for Ports, Berths, and Users, including a map-based geometry editor.
-   **Unified & Auditable System Logs**: A dedicated, tab-based interface for viewing all system events, including vessel movements, port actions, user sessions, and UI interactions.
-   **Authentication & Role-Based Access Control (RBAC)**: Secure login with forced password resets and role-based feature restrictions.
-   **Data Export**: Functionality to export all data grids to CSV and to generate professional PDF reports for trips.

---

## 3. Proposed Technical Stack & Architecture

-   **Application Framework**: **.NET MAUI** (recommended) or **WPF**.
-   **Architecture**: **MVVM (Model-View-ViewModel)** is required.
-   **Database**: Support for both a local **SQLite** database (standalone mode) and a central **PostgreSQL (with PostGIS)** database (networked mode).
-   **Mapping**: A robust mapping control like `Microsoft.Maui.Controls.Maps` or `Mapsui`.
-   **NMEA Parsing**: A reliable .NET library for parsing NMEA-0183 sentences.

---

## 4. Live AIS Data Ingestion (Critical Requirement)

The native application must **directly** handle AIS data streams from hardware without a separate service.

-   **Implementation**: A singleton background service running on its own thread.
-   **Listeners**: The service must be able to open a UDP socket on a configurable port and connect to a configurable COM port to listen for data.
-   **Data Processing**: The service will receive raw NMEA sentences, parse them into structured AIS messages, persist the data to the database, and broadcast events within the application to update the UI in real-time.

---

## 5. Database Schema

The database schema must be identical to the one defined for the existing web application's backend. This ensures data compatibility and a clear data model.

```sql
-- For PostgreSQL, enable PostGIS. For SQLite, use a library like SpatiaLite.
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create custom ENUM types to ensure data consistency.
CREATE TYPE user_role AS ENUM ('Administrator', 'Supervisor', 'Port Operator', 'Maritime Agent', 'Pilot');
CREATE TYPE berth_type AS ENUM ('Quay', 'Berth', 'Anchorage');
CREATE TYPE ship_status AS ENUM ('Approaching', 'Anchored', 'Docked', 'Departing', 'Left Port');
CREATE TYPE movement_event_type AS ENUM ('Vessel Registered', 'AIS Update', 'Status Change', 'Berth Assignment', 'Pilot Assignment', 'Agent Assignment', 'Pilot Onboard', 'Pilot Offboard');
CREATE TYPE trip_status AS ENUM ('Active', 'Completed');

-- Table for Ports
CREATE TABLE ports (
    id TEXT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    lat NUMERIC(9, 6) NOT NULL,
    lon NUMERIC(9, 6) NOT NULL,
    logo_image TEXT,
    geometry GEOMETRY(POLYGON, 4326)
);

-- Table for Users
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    gsm VARCHAR(50),
    company VARCHAR(255),
    role user_role NOT NULL,
    password TEXT NOT NULL, -- Must be hashed in a real implementation
    port_id TEXT,
    force_password_change BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,
    FOREIGN KEY (port_id) REFERENCES ports(id) ON DELETE SET NULL
);

-- Table for Berths
CREATE TABLE berths (
    id TEXT PRIMARY KEY,
    port_id TEXT NOT NULL,
    name VARCHAR(255) NOT NULL,
    type berth_type NOT NULL,
    max_length NUMERIC(10, 2) NOT NULL,
    max_draft NUMERIC(10, 2) NOT NULL,
    equipment TEXT[],
    quay_id TEXT,
    position_on_quay INTEGER,
    geometry GEOMETRY(POLYGON, 4326),
    radius NUMERIC(10, 2),
    FOREIGN KEY (port_id) REFERENCES ports(id) ON DELETE CASCADE
);

-- Table for Trips (Vessel Stopovers)
CREATE TABLE trips (
    id TEXT PRIMARY KEY,
    ship_id TEXT NOT NULL, 
    port_id TEXT NOT NULL,
    arrival_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    departure_timestamp TIMESTAMP WITH TIME ZONE,
    status trip_status NOT NULL,
    agent_id TEXT,
    pilot_id TEXT,
    FOREIGN KEY (port_id) REFERENCES ports(id) ON DELETE CASCADE,
    FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (pilot_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Table for Ships
CREATE TABLE ships (
    id TEXT PRIMARY KEY,
    port_id TEXT NOT NULL,
    name VARCHAR(255) NOT NULL,
    imo VARCHAR(7) UNIQUE NOT NULL,
    type VARCHAR(255),
    length NUMERIC(10, 2) NOT NULL,
    draft NUMERIC(10, 2) NOT NULL,
    flag VARCHAR(255),
    eta TIMESTAMP WITH TIME ZONE,
    etd TIMESTAMP WITH TIME ZONE,
    status ship_status NOT NULL,
    departure_date TIMESTAMP WITH TIME ZONE,
    pilot_id TEXT,
    agent_id TEXT,
    current_trip_id TEXT,
    has_dangerous_goods BOOLEAN NOT NULL DEFAULT FALSE,
    lat NUMERIC(9, 6),
    lon NUMERIC(9, 6),
    FOREIGN KEY (port_id) REFERENCES ports(id) ON DELETE CASCADE,
    FOREIGN KEY (pilot_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (current_trip_id) REFERENCES trips(id) ON DELETE SET NULL
);

-- Join Table for Many-to-Many relationship between Ships and Berths
CREATE TABLE ship_berth_assignments (
    ship_id TEXT NOT NULL,
    berth_id TEXT NOT NULL,
    PRIMARY KEY (ship_id, berth_id),
    FOREIGN KEY (ship_id) REFERENCES ships(id) ON DELETE CASCADE,
    FOREIGN KEY (berth_id) REFERENCES berths(id) ON DELETE CASCADE
);

-- Table for Ship Movement History
CREATE TABLE ship_movements (
    id TEXT PRIMARY KEY,
    ship_id TEXT NOT NULL,
    port_id TEXT NOT NULL,
    trip_id TEXT NOT NULL,
    event_type movement_event_type NOT NULL,
    "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL,
    details JSONB,
    FOREIGN KEY (ship_id) REFERENCES ships(id) ON DELETE CASCADE,
    FOREIGN KEY (port_id) REFERENCES ports(id) ON DELETE CASCADE,
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
);

-- Table for User Login History
CREATE TABLE login_history (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    port_id TEXT NOT NULL,
    port_name VARCHAR(255) NOT NULL,
    "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL,
    logout_timestamp TIMESTAMP WITH TIME ZONE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (port_id) REFERENCES ports(id) ON DELETE CASCADE
);

-- Table for UI Interaction Logs
CREATE TABLE interaction_log (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    port_id TEXT NOT NULL,
    "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    details JSONB,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (port_id) REFERENCES ports(id) ON DELETE CASCADE
);
```

---

## 6. Deliverables

1.  **Source Code**: A well-structured, commented, and maintainable .NET solution.
2.  **Installer**: A packaged installer for the application (e.g., MSIX or a standard setup.exe) for easy deployment.
3.  **Documentation**:
    -   README file detailing how to build and run the project from source.
    -   User documentation explaining how to install and configure the application, including setting up the AIS data source and database connection.