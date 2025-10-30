# Port Vessel Management System - User Guide

This guide provides an overview of the application's features and workflows, tailored to each user role. Whether you are an administrator setting up the system or a pilot logging your time, this document will help you navigate the application effectively.

## Table of Contents
1.  [General Interface Overview](#1-general-interface-overview)
2.  [Role-Based Guides](#2-role-based-guides)
    -   [Administrator](#administrator)
    -   [Supervisor](#supervisor)
    -   [Port Operator](#port-operator)
    -   [Maritime Agent](#maritime-agent)
    -   [Pilot](#pilot)
3.  [Core Features Explained](#3-core-features-explained)
    -   [Live Dashboard & Map](#live-dashboard--map)
    -   [Vessel Directory](#vessel-directory)
    -   [Alerts System](#alerts-system)
    -   [Trip Management](#trip-management)
    -   [Data Exporting](#data-exporting)

---

## 1. General Interface Overview

The application is divided into three main areas:

1.  **Sidebar Navigation (Left)**: Your primary way to move between different pages (views) of the application, such as the Dashboard, Vessel Directory, and Settings. The sidebar can be collapsed on desktop screens to maximize space.
2.  **Header (Top)**: Displays the name of the current port, allows Admins to switch between ports, and shows your user information.
3.  **Main Content Area**: The central part of the screen where the content for the currently selected view is displayed.

---

## 2. Role-Based Guides

### Administrator

-   **Overview**: As an Administrator, you have unrestricted access to all features, data, and settings across all ports in the system.
-   **Key Responsibilities**: Initial system setup, ongoing infrastructure management, and user account administration.

#### Specific Workflows:
*   **Multi-Port Management**: If multiple ports are configured, a dropdown menu will appear in the header, allowing you to seamlessly switch the entire application's context from one port to another.
*   **Port & Berth Management**:
    1.  Navigate to **Manage Ports** from the sidebar.
    2.  Here you can **Add Port** or edit/delete existing ones.
    3.  When editing a port, you can use the interactive map editor to draw or modify the port's boundary.
    4.  Select a port from the list to view its associated berths. You can then add, edit, or delete berths, defining their geometry directly on the map.
*   **User Management**:
    1.  Navigate to **Manage Users** from the sidebar.
    2.  Click **Add User** to create a new account, define their role, assign them to a port (if applicable), and set an initial password.
    3.  You can edit any existing user's details or delete their account.
    4.  The **User Login History** table provides a full audit trail of user sessions.
*   **System Settings**:
    1.  Navigate to **Settings**.
    2.  Here you can configure global settings for the application, such as the AIS data source, alert distance thresholds, and automatic logout schedules for operators.

### Supervisor

-   **Overview**: You have high-level operational control and management capabilities within your assigned port.
-   **Key Responsibilities**: Overseeing daily operations, managing port staff (Operators, Pilots, Agents), handling operational escalations, and auditing activity.

#### Specific Workflows:
*   **User Management**:
    1.  Navigate to **Manage Users**.
    2.  Your view is restricted to managing users with roles of Operator, Agent, and Pilot. You can create, edit, and delete these user accounts.
*   **Full Operational Control**: You have the same operational capabilities as a Port Operator, including adding and managing all vessels, assigning berths and pilots, and responding to alerts.
*   **Auditing Port Activity**:
    1.  Navigate to **System Logs**.
    2.  You have access to all log tabs (Vessel Movements, Port Actions, User Sessions, UI Interactions) to review and audit all activity within your port.

### Port Operator

-   **Overview**: You are the primary day-to-day user, responsible for the safe and efficient management of vessel traffic.
-   **Key Responsibilities**: Monitoring the live map, managing vessel arrivals and departures, assigning resources, and responding to system alerts.

#### Specific Workflows:
*   **Daily Monitoring**: The **Dashboard** is your main screen, providing a real-time map of vessel positions and key statistics at a glance.
*   **Managing New Arrivals**:
    1.  Navigate to the **Vessel Directory**.
    2.  Click **Add Ship** to register an incoming vessel, providing its details, ETA, and initial status.
*   **Responding to Alerts**:
    -   When an alert appears as a pop-up (toast), you can **Ack** (Acknowledge), **Discard**, or **Take Action**.
    -   Navigate to the **Alerts** page for a full list of active alerts. Taking action on an alert (e.g., assigning a pilot) will automatically resolve it.
*   **Assigning Resources**:
    -   From the **Vessel Directory**, use the action buttons on a vessel's row to **Reassign Berth** or open the edit form to **Assign Pilot**.
    -   Alternatively, click on a vessel or berth on the main map to open a detail modal with management options.
*   **Logging Manual Events**: For events not automatically captured (e.g., "Bunkering Complete"), find the vessel in the **Vessel Directory**, click the "Log Manual Event" action (document icon), and fill in the details.

### Maritime Agent

-   **Overview**: Your access is scoped to only the vessels for which you are the assigned agent.
-   **Key Responsibilities**: Monitoring the status and schedule of your assigned vessels and keeping their information up-to-date.

#### Specific Workflows:
*   **Focused View**: When you log in, the Dashboard, Vessel Directory, and Alerts pages are all automatically filtered to show **only** your vessels. You cannot see or interact with other traffic.
*   **Updating Vessel Information**:
    1.  Navigate to the **Vessel Directory**.
    2.  Find your vessel and click the **Edit** action.
    3.  You can update key information such as the vessel's ETA and ETD. Other fields may be read-only.
*   **Limited Access**: Your role is focused on information management for your ships. You cannot manage port infrastructure, other user accounts, or system settings.

### Pilot

-   **Overview**: Your interface is highly streamlined to focus on your assigned vessels and the critical task of logging your time.
-   **Key Responsibilities**: Safely guiding vessels and accurately logging when you board ("Pilot Onboard") and leave ("Pilot Offboard") a vessel.

#### Specific Workflows:
*   **Pilot Log Page**: Your default view is the **Pilot Log**. This page displays a card for each of your currently assigned, active vessels.
*   **Logging Your Time**:
    -   On each vessel card, you will find two forms: "Log Time Onboard" and "Log Time Left Vessel".
    -   Simply add any optional comments and click the corresponding button. The system automatically logs the event with the current timestamp.
*   **Scoped View**: The Dashboard and Vessel Directory are also available to you but are filtered to show only information relevant to your assigned vessels.

---

## 3. Core Features Explained

### Live Dashboard & Map
-   **Vessel Markers**: Vessels are color-coded by status (e.g., Approaching, Docked). An icon indicates the vessel type or if it's anchored. A red border signifies dangerous goods.
-   **Berth Polygons**: Berths on the map are color-coded to show if they are available (cyan), occupied (green), or occupied by a vessel with dangerous goods (red).
-   **Interactivity**: Click on any vessel or berth on the map to open a detailed modal with more information and management options.
-   **Vessel Filter**: Use the filter panel on the right to toggle the visibility of vessels based on their status.

### Vessel Directory
This is a comprehensive table of all vessels in the port (filtered by your role).
-   **Sorting & Filtering**: Click on column headers to sort the data. Use the search bar to filter by name, IMO, or type.
-   **Actions**: The buttons at the end of each row provide quick access to common tasks:
    -   **View History** (clock icon): Opens a detailed log of the vessel's movements.
    -   **Log Manual Event** (document icon): Add a custom entry to the vessel's log.
    -   **Reassign Berth** (arrows icon): Quickly move a vessel to a different berth or anchorage.
    -   **Edit** (pencil icon): Open the full form to edit all vessel details.
    -   **Delete** (trash icon): Remove the vessel from the system.

### Alerts System
The system automatically generates alerts to draw your attention to important situations.
1.  **Generation**: An alert is created (e.g., a vessel is approaching, a pilot is needed). A pop-up appears for critical alerts.
2.  **Action**: You can Acknowledge (`ACK`) an alert to confirm you've seen it, or `Take Action` to resolve the underlying issue.
3.  **Resolution**: Once the condition is fixed (e.g., a pilot is assigned), the alert automatically disappears from the system.

### Trip Management
-   **Trip Directory**: This page lists every unique visit a vessel has made to the port, from arrival to departure.
-   **Trip Detail Modal**: Clicking the "Details" action on a trip opens a modal showing a full summary, including a **Stopover Timeline** that breaks down how long the vessel spent at each berth or anchorage during its visit.

### Data Exporting
On pages with data tables (Vessel Directory, Trip Directory, Analytics, Logs), authorized users (Admin, Supervisor) will see **Export CSV** and **Export PDF** buttons. These allow you to download the current filtered and sorted data for reporting and external use.
