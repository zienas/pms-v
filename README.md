# Port Vessel Management System

This is a modern frontend application designed to manage and visualize vessel traffic and berth assignments in a maritime port. It is architected to connect to a backend API, providing a dynamic interface for a full-stack port management solution.

## Core Features

-   **Dynamic Geospatial Dashboard**: A live, coordinate-based map that visualizes vessel traffic using real latitude and longitude data. Features include:
    -   Clickable, AIS-like vessel markers that show status and details on hover.
    -   A 2 NM proximity circle for enhanced situational awareness.
    -   Interactive zoom controls and customizable map backgrounds.
    -   Display of port and berth boundary geometries.
-   **Proactive & Automated Alerts**: A sophisticated alert system to enhance operator awareness and response time.
-   **Interactive Alert Dashboard**: A centralized dashboard for managing all system-generated alerts with clear, actionable steps.
-   **Vessel Trip & Stopover Tracking**: Automatically generates a unique Trip ID for each vessel visit, from approach to departure. This ID is associated with all movements and operations, providing a clear, auditable trail for each distinct stopover.
-   **Comprehensive Trip Directory**: A dedicated, sortable, and exportable page to view the complete lifecycle of every trip, including arrival/departure times, duration, assigned personnel, and status. Clickable rows open a detailed editing modal.
-   **Interactive Trip Details & Timeline**: Click on any trip to open a detailed modal view. Edit pilot and agent assignments on the fly. View a complete "Stopover Timeline" for the visit, breaking down each stay at a berth or anchorage with precise durations and pilot involvement for arrivals and departures.
-   **Live AIS Data Simulation**: The application runs a background simulator to mimic a real-time AIS data feed, creating a dynamic experience where vessels approach the port, move to anchorage, and depart realistically.
-   **Comprehensive Ship Management**:
    -   **Detailed Vessel Directory**: A sortable and filterable list of all ships, now including the current Trip ID.
    -   **Ship Movement History**: A complete, auditable log for each vessel, now grouped by Trip ID to provide a clear, chronological breakdown of every action that occurred during each distinct visit.
-   **Vessel Attendance Analytics**: A dedicated historical analytics page that shows for each vessel:
    -   How many times it has visited the port.
    -   Total, average, minimum, and maximum stay durations.
    -   A detailed breakdown of time spent at a dock versus time spent at anchorage.
-   **Unified & Auditable System Logs**: A dedicated, tab-based page provides a comprehensive audit trail of all port activities.
    -   **Tabbed Views**: Easily switch between a unified view of all events, or focused logs for Vessel Movements, Port Actions (assignments), and User Login/Logout sessions.
    -   **Full Functionality**: All log views are sortable, filterable, and exportable to both CSV and professional PDF formats.
-   **Full Authentication & RBAC**: A dedicated login page and an advanced role-based access control system (Admin, Operator, Captain, Pilot, Agent) to restrict access to features and data.
-   **Admin-Level Management Suite**:
    -   **Multi-Port Management**: Admins can switch between and manage multiple ports, including their geospatial boundaries.
    -   **Port & Berth Infrastructure**: Admins can add, edit, and delete entire ports and their associated berths, including drawing their shapes on a map.
    -   **User Management & Auditing**: Admins can manage all user accounts and view a detailed, sortable audit trail of all user login/logout events.
-   **Data Export (CSV & PDF)**: Authorized users can export data grids like the Vessel Directory, User Login History, and Vessel Attendance Analytics to CSV. Additionally, a full **Trip Directory report** and detailed **single-trip reports** (including the Stopover Timeline) can be exported to professional, print-ready PDF documents.
-   **Fully Responsive Design**: Optimized for mobile devices with a collapsible sidebar and responsive tables for a seamless experience on any screen.

## Alert System Workflow

The alert system has a clear workflow designed to draw the operator's attention to important events and guide them toward resolution.

### 1. Alert Generation (Automated)

Alerts are automatically generated in the background based on real-time data. The primary triggers are:

*   **Vessel Proximity Warning**: A `Warning` level alert is created when a vessel with the status "Approaching" comes within a configurable distance of the port (e.g., 5 nautical miles). This serves as an early heads-up.
*   **Pilot Assignment Required**: An `Error` level alert is created when an approaching vessel comes within a closer, more critical distance (e.g., 2 nautical miles) and does *not* have a pilot assigned.

When the critical **Pilot Assignment** alert is generated, two things happen simultaneously:
1.  The alert is added to the main list on the "Alerts Dashboard" page.
2.  A **pop-up toast notification** appears on the screen, accompanied by a sound, to immediately grab the user's attention, regardless of which page they are currently viewing.

### 2. User Interaction & Actions

From either the pop-up toast or the Alerts Dashboard, an operator has three distinct actions they can take:

#### Action 1: Acknowledge ("ACK")
*   **What it means**: *"I have seen and am aware of this situation."*
*   **Workflow**:
    1.  The operator clicks the **ACK** button.
    2.  The pop-up toast is dismissed.
    3.  On the Alerts Dashboard, the alert is visually dimmed and moved from the "Unacknowledged" filter to the "Acknowledged" filter.
    4.  The alert remains in the system but is de-emphasized to reduce visual clutter, allowing operators to focus on new, unacknowledged issues. The underlying condition (e.g., no pilot assigned) still exists.

#### Action 2: Discard
*   **What it means**: *"Dismiss this specific notification for now."*
*   **Workflow**:
    1.  The operator clicks the **Discard** button.
    2.  The pop-up toast is dismissed.
    3.  The alert is removed from the list on the dashboard.
    4.  **Important**: This is a temporary dismissal. If the condition that triggered the alert still exists when the system next checks (every 5 seconds), the alert will be **regenerated** as a new, unacknowledged alert.

#### Action 3: Take Action
*   **What it means**: *"I need to resolve this issue now."*
*   **Workflow**:
    1.  The operator clicks the **Take Action** button.
    2.  The pop-up toast is dismissed.
    3.  The system immediately opens the relevant modal to fix the problem. For a pilot assignment alert, this opens the **"Assign Pilot"** modal, pre-filled with the vessel's information.
    4.  The operator can then assign a pilot and save the changes.

### 3. Alert Resolution (Automated)

Once the operator has taken action and resolved the underlying condition (e.g., a pilot is now assigned to the vessel), the system's automatic alert generation process takes over:

1.  On its next check, the system sees that the condition for the alert is no longer met (the ship now has a pilot).
2.  The alert is **no longer generated** and disappears from the system entirely.

This completes the lifecycle, ensuring that operators are only notified about current, actionable issues.

## Going Live with Real AIS Data

The application includes a built-in simulator for demonstration purposes. To connect to a real-world AIS data feed from a hardware receiver (via UDP or a serial port), a separate backend "ingestion service" is required.

For a complete, step-by-step guide on the architecture and implementation of this service, please refer to the go-live document.

**[==> View the Go-Live Guide](./HOWTO-GOLIVE.md) <==**

## Deployment on a VPS

For detailed, step-by-step instructions on how to deploy this application and its required backend infrastructure (like a database) to a fresh Ubuntu or Debian-based VPS, please refer to the deployment guide. The guide now includes the full database schema.

**[==> View the Deployment Guide](./HOWTO-DEPLOY.md) <==**

## How It Works: Technical Overview

This application is built with React and TypeScript, styled with Tailwind CSS. It is designed as the client-side component of a larger client-server architecture.

### 1. Full-Stack Architecture

The application is architected to be robust and scalable, separating concerns between the frontend (this application), a backend API, and a database.

**`React Frontend (Client)`** <--> **`Backend API (e.g., Node.js/Python)`** <--> **`PostgreSQL Database with PostGIS`**

-   **Frontend**: Responsible for rendering the user interface and managing user interactions. It does not contain any business logic or direct data.
-   **API Layer (`services/api.ts`)**: All communication between the frontend and the backend is handled through a dedicated API service layer. In the current version, this service simulates a backend to allow the frontend to be developed independently.
-   **Backend API (Conceptual)**: A server-side application would handle the core business logic: validating data, managing user sessions, querying the database, and pushing real-time updates (e.g., via WebSockets).
-   **Database (PostgreSQL with PostGIS)**: The single source of truth for all data. PostgreSQL provides reliability, and the PostGIS extension allows for powerful geospatial queries, essential for a port management system.

### 2. Database Schema

The database is designed with a relational model to ensure data integrity. Here is a high-level overview of the main tables:
-   `ports`: The central table for all ports in the system, including geospatial boundaries.
-   `users`: Stores user information, including their role, hashed password, and an optional `port_id` to scope them to a specific port.
-   `berths`: Contains the infrastructure for each port (berths, quays, anchorages), linked to a `port_id`, and includes their geospatial shapes.
-   `trips`: A new table to track each distinct visit (stopover) by a vessel, linking an arrival event with a departure event. Also stores the assigned agent and pilot for the trip.
-   `ships`: Stores all vessel data, linked to a `port_id`, a `pilot_id`, an `agent_id`, and the `current_trip_id` for its active visit.
-   `ship_berth_assignments`: A join table that manages the many-to-many relationship between ships and berths.
-   `ship_movements`: A detailed log of every significant event in a ship's lifecycle, now linked to a specific `trip_id`.
-   `login_history`: An audit trail of all user login and logout events.

### 3. State Management (`context/PortContext.tsx`)

State management is primarily handled within `context/PortContext.tsx`. This context uses a reducer (`useReducer`) and the Context API to provide state and actions throughout the entire component tree, acting as a client to the API service.

-   **Data Fetching**: On initial load and when the selected port changes, the context calls the API service to fetch all necessary data (ports, ships, berths, etc.) and manages a global `isLoading` state to provide user feedback.
-   **State as a Local Cache**: The context holds the fetched data in its state, acting as a temporary, client-side cache of the database's state for the selected port.
-   **Data Mutations**: When a user performs an action (e.g., adding a ship), the context calls the appropriate API function (`api.addShip`). Upon a successful response from the API, it re-fetches the relevant data to update its local state, causing the UI to re-render with the latest information.

### 4. User Management & Permissions (`context/AuthContext.tsx`)

The application includes a full authentication and permission system.

-   **React Context**: An `AuthContext` provides the current user's information and authentication status throughout the entire component tree.
-   **Login/Logout Flow**: A dedicated login page protects the application. The context manages user sessions by validating credentials against the API.
-   **Password Management**: Admins can set and update passwords for all users via the "Manage Users" interface.
-   **Forced Password Change on First Login**: As a key security enhancement, all new non-admin users (or users whose passwords have been reset by an admin) are required to change their password upon their first login. They are presented with a secure, non-dismissible modal and cannot access the application until a new password is set. This ensures temporary or default passwords are never left active.
-   **Defined Roles**: The system defines roles with specific permissions: `Admin`, `Port Operator`, `Captain`, and `Pilot`. UI elements and functionality are conditionally rendered based on the current user's role.

### 5. Production Architecture with Docker

For a real-world deployment, the entire stack (frontend, backend, database) would be managed using Docker and Docker Compose. This ensures consistency across development, staging, and production environments.

Here is an example `docker-compose.yml` file illustrating how these services would be defined:

```yaml
# docker-compose.yml
version: '3.8'

services:
  # ---- Backend API Service ----
  # (Assuming a Node.js backend in a /backend folder)
  api:
    build: ./backend
    ports:
      - "4000:4000"
    environment:
      - DATABASE_URL=postgresql://port_user:strong_password@db:5432/port_db
    depends_on:
      - db

  # ---- PostgreSQL Database Service ----
  db:
    image: postgis/postgis:13-3.1 # Using a PostGIS image for geospatial support
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=port_user
      - POSTGRES_PASSWORD=a_very_strong_password # CHANGE THIS!
      - POSTGRES_DB=port_db
    volumes:
      - postgres_data:/var/lib/postgresql/data

  # ---- Frontend Service ----
  # (Served by Nginx for production)
  frontend:
    build: . # Assumes a Dockerfile in the root of the React project
    ports:
      - "80:80"

volumes:
  postgres_data:
```