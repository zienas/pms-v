#!/bin/bash

# ==============================================================================
# Port Vessel Management System - Raspberry Pi AIS Listener Setup Script
# ==============================================================================
#
# This script automates the setup of the AIS Ingestion Service on a
# Raspberry Pi running Raspberry Pi OS or a similar Debian-based distribution.
#
# USAGE:
# 1. Place this script in the root directory of the PVMS project on your Pi.
# 2. Rename it: `mv setup-rpi-listener.sh.md setup-rpi-listener.sh`
# 3. Make it executable: `chmod +x setup-rpi-listener.sh`
# 4. Run with sudo: `sudo ./setup-rpi-listener.sh`
#
# ==============================================================================

# --- Color Codes for Output ---
C_RESET='\033[0m'
C_RED='\033[0;31m'
C_GREEN='\033[0;32m'
C_YELLOW='\033[0;33m'
C_CYAN='\033[0;36m'
C_WHITE='\033[1;37m'

# --- Helper Functions ---
function print_header() {
    echo -e "${C_CYAN}======================================================${C_RESET}"
    echo -e "${C_CYAN}  PVMS Raspberry Pi AIS Listener Setup Script${C_RESET}"
    echo -e "${C_CYAN}======================================================${C_RESET}"
}

function print_step() {
    echo -e "\n${C_YELLOW}>>> $1${C_RESET}"
}

function print_success() {
    echo -e "${C_GREEN}✔ $1${C_RESET}"
}

function print_error() {
    echo -e "${C_RED}✖ ERROR: $1${C_RESET}" >&2
    exit 1
}

function check_root() {
    if [ "$EUID" -ne 0 ]; then
        print_error "This script must be run as root. Please use 'sudo ./setup-rpi-listener.sh'"
    fi
}

# --- Main Script Logic ---
check_root
print_header
echo -e "${C_WHITE}This script will configure the AIS listener as a background service.${C_RESET}"
echo -e "${C_WHITE}It assumes you are in the project's root directory.${C_RESET}"
read -p "Press [Enter] to begin..."

# 1. Prerequisite Check: Node.js
print_step "Checking for prerequisites..."
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please follow the installation instructions in HOWTO-DEPLOY-RPI.md and run this script again."
fi
print_success "Node.js found."

# 2. Gather User Input
print_step "Gathering configuration details..."
while true; do
    read -p "Which type of AIS listener do you want to set up? [1] UDP / LAN, [2] Serial / USB: " listenerChoice
    case $listenerChoice in
        [1]* ) LISTENER_TYPE="udp"; break;;
        [2]* ) LISTENER_TYPE="serial"; break;;
        * ) echo "Please answer 1 or 2.";;
    esac
done

# 3. Install Global NPM Packages (PM2)
print_step "Installing PM2 for service management (this may take a moment)..."
npm install -g pm2 || print_error "Failed to install PM2."
print_success "PM2 installed successfully."

# 4. Install Local Project Dependencies
print_step "Installing local project dependencies..."
npm install ws nmea-0183 || print_error "Failed to install base dependencies (ws, nmea-0183)."

if [ "$LISTENER_TYPE" == "serial" ]; then
    echo "Installing serial port dependencies..."
    npm install serialport @serialport/parser-readline || print_error "Failed to install serial port dependencies."
fi
print_success "Local dependencies installed."

# 5. Start the Service with PM2
print_step "Starting the AIS listener service with PM2..."
if [ "$LISTENER_TYPE" == "udp" ]; then
    SCRIPT_PATH="services/ais-udp-listener.js"
    SERVICE_NAME="ais-udp-service"
else
    SCRIPT_PATH="services/ais-serial-listener.js"
    SERVICE_NAME="ais-serial-service"
fi

# Stop and delete if it already exists to ensure a clean start
pm2 stop "$SERVICE_NAME" >/dev/null 2>&1
pm2 delete "$SERVICE_NAME" >/dev/null 2>&1

pm2 start "$SCRIPT_PATH" --name "$SERVICE_NAME" || print_error "Failed to start the listener service with PM2. Run 'pm2 logs $SERVICE_NAME' to diagnose."
print_success "Service '$SERVICE_NAME' started."

# 6. Configure PM2 for Startup
print_step "Configuring PM2 to run on system boot..."
pm2 save || print_error "Failed to save PM2 process list."

# The 'pm2 startup' command generates another command that must be run as root.
# We capture that command and execute it.
STARTUP_CMD=$(pm2 startup | tail -n 1)
if [[ -z "$STARTUP_CMD" || "$STARTUP_CMD" == "pm2 startup" ]]; then
    print_error "Could not generate PM2 startup command. Please run 'pm2 startup' manually and execute the provided command."
fi

echo "Executing PM2 startup command: $STARTUP_CMD"
eval "$STARTUP_CMD" || print_error "Failed to execute PM2 startup command."
print_success "PM2 startup configured."

# 7. Final Instructions
echo -e "\n${C_CYAN}======================================================${C_RESET}"
echo -e "${C_GREEN}  Setup Complete!${C_RESET}"
echo -e "${C_CYAN}======================================================${C_RESET}"
echo -e "The AIS listener service is now running and will restart on boot."
echo -e "You can monitor the service with the command: ${C_WHITE}pm2 logs $SERVICE_NAME${C_RESET}"
echo -e "\n${C_YELLOW}CRITICAL FINAL STEP: You MUST configure the listener script.${C_RESET}"
echo -e "1. Open the file: ${C_WHITE}${SCRIPT_PATH}${C_RESET}"
echo -e "2. Edit the variables at the top of the file:"
echo -e "   - ${C_WHITE}API_ENDPOINT${C_RESET}: Set this to the URL of your main backend API."
echo -e "   - ${C_WHITE}PORT_ID_FOR_THIS_FEED${C_RESET}: Set this to the correct Port ID from your application."
if [ "$LISTENER_TYPE" == "serial" ]; then
    echo -e "   - ${C_WHITE}SERIAL_PORT_PATH${C_RESET}: Ensure this is set to the correct device path (e.g., '/dev/ttyUSB0')."
fi
echo -e "3. After saving the file, restart the service with: ${C_WHITE}pm2 restart $SERVICE_NAME${C_RESET}"
echo

exit 0
