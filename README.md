# Port Vessel Management System

This is a modern frontend application designed to manage and visualize vessel traffic and berth assignments in a maritime port. It is architected to connect to a backend API, providing a dynamic interface for a full-stack port management solution.

## Core Features

-   **Dynamic Geospatial Dashboard**: A live, coordinate-based map that visualizes vessel traffic using real latitude and longitude data.
-   **Proactive & Automated Alerts**: A sophisticated alert system to enhance operator awareness and response time.
-   **Vessel Trip & Stopover Tracking**: Automatically generates a unique Trip ID for each vessel visit, from approach to departure, providing a clear, auditable trail.
-   **Comprehensive Trip Directory**: A dedicated, sortable, and exportable page to view the complete lifecycle of every trip.
-   **Interactive Trip Details & Timeline**: A detailed modal view for each trip, allowing for personnel assignment edits and displaying a "Stopover Timeline" with precise durations at each berth or anchorage.
-   **Advanced AIS Data Simulation**: The application runs a sophisticated background simulator to mimic a real-time AIS data feed. Vessels now exhibit more realistic behavior with individual speeds, turning rates, intelligent targeting of anchorages, and basic collision avoidance.
-   **Comprehensive Ship Management**:
    -   **Detailed Vessel Directory**: A sortable and filterable list of all ships, including the current Trip ID.
    -   **Ship Movement History**: A complete, auditable log for each vessel, grouped by Trip ID.
-   **Vessel Attendance Analytics**: A dedicated historical analytics page showing visit frequency, stay durations, and a breakdown of time spent at dock versus anchorage.
-   **High-Performance & Auditable System Logs**: A dedicated, tab-based page provides a comprehensive audit trail of all port activities.
    -   **Tabbed Views**: Easily switch between a unified view or focused logs for Vessel Movements, Port Actions, User Sessions, and **UI Interactions**.
    -   **Performance Optimized**: All log views are now **paginated** to handle large datasets efficiently without slowing down the browser.
    -   **Full Functionality**: All log views are sortable, filterable, and exportable to CSV and PDF.
-   **Full Authentication & RBAC**: A dedicated login page and an advanced role-based access control system (`Administrator`, `Supervisor`, `Port Operator`, `Maritime Agent`, `Pilot`) to restrict access to features and data.
-   **Integrated Pilot Workflow**: A specialized, streamlined experience for users with the 'Pilot' role.
    -   **Dedicated View**: Pilots have a dedicated "Pilot Log" page for quickly logging their time on and off vessels.
    -   **Scoped Data**: The main dashboard, vessel directory, and alerts are all filtered to show only the vessels and information relevant to the logged-in pilot.
-   **Admin-Level Management Suite**:
    -   **Multi-Port Management**: Admins can switch between and manage multiple ports.
    -   **Interactive Port & Berth Infrastructure Management**: A powerful, map-centric interface for drawing and editing port boundaries, berths, and anchorages.
    -   **User Management & Auditing**: Admins and Supervisors can manage user accounts. The system now supports **enriched user profiles** with contact details, company information, and notes. Admins can view a detailed audit trail of all user login/logout events.
-   **Data Export (CSV & PDF)**: Authorized users can export data grids and detailed trip reports to CSV and professional, print-ready PDF documents.
-   **Fully Responsive Design**: Optimized for mobile devices with a collapsible sidebar and responsive tables.

## Alert System Workflow

The alert system has a clear workflow designed to draw the operator's attention to important events and guide them toward resolution.

### 1. Alert Generation (Automated)

Alerts are automatically generated in the background based on real-time data. The primary triggers are:

*   **Vessel Proximity Warning**: A `Warning` level alert is created when a vessel with the status "Approaching" comes within a configurable distance of the port (e.g., 5 nautical miles).
*   **Pilot Assignment Required**: An `Error` level alert is created when an approaching vessel comes within a closer, more critical distance (e.g., 2 nautical miles) and does *not* have a pilot assigned. A pop-up toast notification also appears.

### 2. User Interaction & Actions

From either the pop-up toast or the Alerts Dashboard, an operator has three distinct actions they can take:

*   **Acknowledge ("ACK")**: Marks the alert as seen. The alert is dimmed and moved from the "Unacknowledged" filter to "Acknowledged," reducing visual clutter.
*   **Discard**: Temporarily dismisses the notification. If the underlying condition still exists, the alert will be regenerated.
*   **Take Action**: Opens the relevant modal to resolve the issue (e.g., the "Assign Pilot" modal).

### 3. Alert Resolution (Automated)

Once the operator has resolved the underlying condition (e.g., a pilot is now assigned), the system's automatic check sees that the condition is no longer met, and the alert disappears from the system.

## Going Live with Real AIS Data

To connect to a real-world AIS data feed from a hardware receiver (via UDP or a serial port), a separate backend "ingestion service" is required.

**[==> View the Go-Live Guide](./HOWTO-GOLIVE.md) <==**

## Deployment on a VPS

For detailed, step-by-step instructions on how to deploy this application and its required backend infrastructure to a fresh Ubuntu or Debian-based VPS, please refer to the deployment guide.

**[==> View the Deployment Guide](./HOWTO-DEPLOY.md) <==**

## How It Works: Technical Overview

This application is built with React and TypeScript, styled with Tailwind CSS. It is designed as the client-side component of a larger client-server architecture.

### 1. Full-Stack Architecture

The application is architected to be robust and scalable, separating concerns between the frontend (this application), a backend API, and a database.

**`React Frontend (Client)`** <--> **`Backend API (e.g., Node.js/Python)`** <--> **`PostgreSQL Database with PostGIS`**

-   **Frontend**: Responsible for rendering the user interface and managing user interactions.
-   **API Service Layer (`services/api.ts`)**: For demonstration and offline use, this file **simulates a complete backend API** using the browser's `localStorage`. It is designed to be a drop-in replacement for a service layer that would make real HTTP requests.
-   **Backend API (Conceptual)**: A server-side application would handle the core business logic, user sessions, and database queries.
-   **Database (PostgreSQL with PostGIS)**: The single source of truth for all data.

### 2. Database Schema

The database is designed with a relational model to ensure data integrity. Here is a high-level overview of the main tables:
-   `ports`: Stores all ports, including their geospatial boundaries.
-   `users`: Stores user information, role, hashed password, and enriched profile data (`email`, `phone`, `company`, etc.).
-   `berths`: Contains the infrastructure for each port (berths, quays, anchorages).
-   `trips`: Tracks each distinct visit (stopover) by a vessel.
-   `ships`: Stores all vessel data, linked to a `port_id` and `current_trip_id`.
-   `ship_berth_assignments`: A join table for the many-to-many relationship between ships and berths.
-   `ship_movements`: A detailed log of every significant event, including new `Pilot Onboard` and `Pilot Offboard` events.
-   `login_history`: An audit trail of all user login and logout events.
-   `interaction_log`: A new table to store detailed logs of all UI interactions.

### 3. State Management (`context/PortContext.tsx`)

State management is primarily handled within `context/PortContext.tsx`. This context uses a reducer (`useReducer`) to provide state and actions throughout the component tree, acting as a client to the API service.

-   **Data Fetching**: The context calls the API service to fetch all necessary data and manages a global `isLoading` state.
-   **State as a Local Cache**: The context holds the fetched data, acting as a temporary, client-side cache of the database's state.
-   **Data Mutations**: When a user performs an action, the context calls the appropriate API function. Upon success, it re-fetches the relevant data to update its local state and re-render the UI.

### 4. User Management & Permissions (`context/AuthContext.tsx`)

The application includes a full authentication and permission system.

-   **React Context**: An `AuthContext` provides the current user's information and authentication status.
-   **Login/Logout Flow**: A dedicated login page protects the application.
-   **Password Management**:
    -   **Forced Password Change on First Login**: As a key security enhancement, all new non-admin users are required to change their password upon their first login.
    -   **Self-Service Password Change**: All users can securely change their own password at any time via the "Settings" page.
-   **Defined Roles**: The system defines roles with specific permissions: `Administrator`, `Supervisor`, `Port Operator`, `Maritime Agent`, and `Pilot`. UI elements and functionality are conditionally rendered based on the user's role.

### 5. Production Architecture with Docker

For a real-world deployment, the entire stack (frontend, backend, database) would be managed using Docker and Docker Compose for consistency across environments. An example `docker-compose.yml` file is provided below.

```yaml
# docker-compose.yml
version: '3.8'

services:
  api:
    build: ./backend
    ports: [ "4000:4000" ]
    environment:
      - DATABASE_URL=postgresql://port_user:strong_password@db:5432/port_db
    depends_on: [ db ]

  db:
    image: postgis/postgis:13-3.1
    ports: [ "5432:5432" ]
    environment:
      - POSTGRES_USER=port_user
      - POSTGRES_PASSWORD=a_very_strong_password
      - POSTGRES_DB=port_db
    volumes: [ postgres_data:/var/lib/postgresql/data ]

  frontend:
    build: .
    ports: [ "80:80" ]

volumes:
  postgres_data:
```