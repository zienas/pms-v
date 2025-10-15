# Engineering Prompt: Native Windows Port Vessel Management System

## 1. Project Goal

To create a high-performance, feature-rich, and reliable native Windows desktop application for maritime port vessel management. This application will replicate and enhance the functionality of the existing web-based "Port Vessel Management System," providing a robust solution for port operators, administrators, and other maritime professionals.

A key requirement is to leverage the native capabilities of the Windows platform for direct hardware integration (AIS receivers via UDP/Serial), improved performance, and potential offline functionality.

---

## 2. Core Functional Requirements

The Windows application must implement the full feature set of its web counterpart. This includes:

-   **Dynamic Geospatial Dashboard**: A live, coordinate-based map that visualizes vessel traffic.
    -   Must render custom vessel icons based on status, size, and orientation (for docked vessels).
    -   Must display port and berth boundary geometries (polygons) from the database.
    -   Must support interactive zoom/pan, custom map tile layers or backgrounds, and a 2 NM proximity circle.
    -   Vessels on the map must be selectable, showing detailed tooltips on hover and opening an edit/details view on click.

-   **Proactive & Automated Alerts**: An advanced alert system to enhance situational awareness.
    -   **Proximity Alerts**: Automatically generate alerts and native Windows notifications when a vessel enters a 2 NM radius of the port center.
    -   **Safety & Conflict Alerts**: Generate alerts for double-booked berths, vessels exceeding berth length/draft limits, and vessels carrying dangerous goods.

-   **Vessel Trip & Stopover Tracking**: The application must manage the entire lifecycle of a vessel's visit (a "trip" or "stopover").
    -   A unique Trip ID should be generated for each visit, from arrival to departure.
    -   A dedicated **Trip Directory** must provide a sortable, filterable data grid of all trips.
    -   An interactive **Trip Details** view must allow editing of trip-specific data (e.g., assigned agent/pilot) and display a detailed **Stopover Timeline** breaking down time spent at each berth or anchorage.

-   **Comprehensive Vessel & Berth Management**: Full CRUD (Create, Read, Update, Delete) functionality.
    -   **Vessel Directory**: A filterable, sortable data grid of all vessels.
    -   **Berth Directory**: A detailed view of all berths, their status (occupied/available), and specifications.
    -   **Ship Movement History**: A detailed, auditable log for each vessel, tracking all status changes, berth assignments, and agent/pilot assignments. **This history must be logically grouped by Trip ID** to provide a clear, chronological breakdown of every action that occurred during each distinct visit.

-   **Vessel Attendance Analytics**: A dedicated analytics view showing historical attendance data for each vessel, including:
    -   Total visit count.
    -   Total, average, minimum, and maximum stay durations.
    -   A breakdown of time spent at dock vs. time at anchorage.

-   **Multi-Port & User Management (Admin)**:
    -   Full CRUD functionality for Ports, Berths, and Users.
    -   Ability to draw and edit port/berth geometry directly on a map interface within the application.
    -   A detailed, sortable audit trail of all user login/logout events.

-   **Unified & Auditable System Logs**: A dedicated, tab-based interface for viewing all system events.
    -   Must provide a unified view of all events as well as filtered views for Vessel Movements, Port Actions (e.g., pilot/berth assignments), and User Login/Logout sessions.
    -   All log views must be sortable, filterable, and exportable to both CSV and PDF formats.

-   **Authentication & Role-Based Access Control (RBAC)**:
    -   Secure login screen.
    -   **Forced Password Reset**: The system must enforce a password change for new users or upon an administrative password reset to enhance security.
    -   Application features and data access must be restricted based on user roles (Admin, Operator, Captain, etc.) as defined in the existing system.

-   **Data Export**:
    -   Functionality to export all data grids (Vessel Directory, Login History, Vessel Analytics) to CSV files.
    -   Functionality to generate and export professional, print-ready **PDF reports** for the main Trip Directory and for individual, detailed trip summaries (including the Stopover Timeline).

---

## 3. Proposed Technical Stack & Architecture

### 3.1. Application Framework
-   **Primary Recommendation**: **.NET MAUI**. This provides a modern, XAML-based UI framework that is performant, and while this project targets Windows, it offers a path to future cross-platform support (macOS).
-   **Alternative**: **WPF (Windows Presentation Foundation)**. A mature and powerful framework for building Windows-only applications.

### 3.2. Architecture
-   **Pattern**: **MVVM (Model-View-ViewModel)** is required. This ensures a clean separation of concerns between the UI (View), the application logic (ViewModel), and the data (Model).
-   **Service Layer**: A dedicated layer should be implemented to handle all business logic.
-   **Repository Pattern**: For abstracting data access, whether from a local database or a remote API.

### 3.3. Database
The application must support two operational modes:
1.  **Standalone/Local Mode**: Utilizes a local **SQLite** database. The application will be fully functional on a single machine.
2.  **Networked/Client-Server Mode**: Connects to a central **PostgreSQL (with PostGIS)** or **SQL Server** database. This allows multiple clients to share the same live data.
The application should allow the user to configure the database connection at startup or through a settings panel.

### 3.4. Key Components & Libraries
-   **Mapping**: A robust mapping control is critical.
    -   For .NET MAUI: Investigate `Microsoft.Maui.Controls.Maps` or third-party libraries like `Mapsui`.
    -   The chosen library must support custom markers, polygon overlays, and preferably custom map tile sources.
-   **UI Controls**: Utilize modern UI controls that align with the Windows Fluent Design System. Consider libraries like the Windows Community Toolkit or commercial suites (Telerik, Syncfusion) for advanced data grids and charts.
-   **NMEA Parsing**: A reliable .NET library for parsing NMEA-0183 sentences is required for the AIS ingestion service.

---

## 4. Live AIS Data Ingestion (Critical Requirement)

This is a primary advantage of the native application. The app must **natively and directly** handle AIS data streams without a separate intermediary service.

-   **Implementation**: Create a singleton background service within the application that runs on its own thread.
-   **UDP Listener**: This service must be able to open a UDP socket on a configurable port and listen for incoming AIS data packets.
-   **Serial Port Listener**: The service must also be able to connect to a configurable COM port (e.g., from a USB-to-Serial adapter) and read the data stream.
-   **Data Processing**:
    1.  Receive raw NMEA sentences.
    2.  Use the chosen NMEA library to parse them into structured AIS messages.
    3.  Persist the relevant data (position, IMO, name, status) to the application's database via the repository layer.
    4.  Broadcast events within the application (e.g., using a weak event manager) to notify ViewModels of new data so the UI can update in real-time.

---

## 5. Database Schema

The database schema must be identical to the one defined for the existing web application's backend. This ensures data compatibility and a clear data model.

```sql
-- Enable PostGIS for geospatial features (for PostgreSQL)
-- For SQLite, spatial functionality can be handled by libraries like SpatiaLite.
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create custom ENUM types to ensure data consistency, matching the application's TypeScript types.
CREATE TYPE user_role AS ENUM ('Admin', 'Port Operator', 'Captain', 'Maritime Agent', 'Pilot');
CREATE TYPE berth_type AS ENUM ('Quay', 'Berth', 'Anchorage');
CREATE TYPE ship_status AS ENUM ('Approaching', 'Docked', 'Departing', 'At Anchorage', 'Left Port');
CREATE TYPE movement_event_type AS ENUM ('Vessel Registered', 'Status Updated', 'Berth Assignment', 'Pilot Assignment', 'AIS Update', 'Agent Assignment');
CREATE TYPE trip_status AS ENUM ('Active', 'Completed');

-- Table for Ports
CREATE TABLE ports (
    id TEXT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    lat NUMERIC(9, 6) NOT NULL,
    lon NUMERIC(9, 6) NOT NULL,
    map_image TEXT, -- Base64 Data URL for a custom map background
    logo_image TEXT, -- Base64 Data URL for the port logo
    geometry GEOMETRY(POLYGON, 4326) -- Store port boundary as a polygon
);

-- Table for Users
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    password TEXT NOT NULL, -- In a real app, this would store a hash
    port_id TEXT,
    force_password_change BOOLEAN NOT NULL DEFAULT TRUE, -- Enforces password change on first login. Set to FALSE for admins.
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
    equipment TEXT[], -- Array of strings for equipment
    quay_id TEXT,
    position_on_quay INTEGER,
    geometry GEOMETRY(POLYGON, 4326), -- Store berth shape as a polygon
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
    current_trip_id TEXT, -- The active trip for this vessel
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
    trip_id TEXT NOT NULL, -- Associate every movement with a specific trip
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
```

---

## 6. Deliverables

1.  **Source Code**: A well-structured, commented, and maintainable .NET solution.
2.  **Installer**: A packaged installer for the application (e.g., MSIX or a standard setup.exe) for easy deployment.
3.  **Documentation**:
    -   README file detailing how to build and run the project from source.
    -   User documentation explaining how to install and configure the application, including setting up the AIS data source and database connection.