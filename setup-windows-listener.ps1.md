# ==============================================================================
# Port Vessel Management System - Windows AIS Listener Setup Script
# ==============================================================================
#
# This PowerShell script automates the setup of the AIS Ingestion Service on a
# Windows machine. It handles prerequisites, service installation, and firewall
# configuration.
#
# USAGE:
# 1. Place this script in the root directory of the PVMS project.
# 2. Rename the file to remove the `.md` extension (e.g., `setup-windows-listener.ps1`).
# 3. Right-click the script file and select "Run with PowerShell".
# 4. If prompted, approve the User Account Control (UAC) dialog to grant
#    administrator privileges, which are required for this setup.
#
# ==============================================================================

#Requires -RunAsAdministrator

# --- Helper Functions for Colored Output ---
function Write-Step {
    param([string]$Message)
    Write-Host "`n>>> $Message" -ForegroundColor Yellow
}

function Write-Success {
    param([string]$Message)
    Write-Host "✔ $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠ $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "✖ ERROR: $Message" -ForegroundColor Red
    # Pause for user to read error before exiting
    Read-Host "Press Enter to exit"
    exit 1
}

# --- Main Script ---
Clear-Host
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  PVMS Windows AIS Listener Setup Script" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "`nThis script will configure the AIS listener as a background service."

# 1. Prerequisite Check: Node.js
Write-Step "Checking for prerequisites..."
$nodeExists = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeExists) {
    Write-Error "Node.js is not installed or not found in your PATH. Please install the LTS version from https://nodejs.org and run this script again."
}
Write-Success "Node.js found."

# 2. Gather User Input
Write-Step "Gathering configuration details..."
$listenerChoice = $null
while ($listenerChoice -ne '1' -and $listenerChoice -ne '2') {
    $listenerChoice = Read-Host "Which type of AIS listener do you want to set up?`n[1] UDP / LAN`n[2] Serial / USB`nEnter choice (1 or 2)"
}

$udpPort = 10110 # Default UDP port
if ($listenerChoice -eq '1') {
    $portInput = Read-Host "Enter the UDP port your AIS receiver broadcasts to (press Enter for default: $udpPort)"
    if ($portInput -match '^\d+$') {
        $udpPort = [int]$portInput
    }
}

# 3. Install Global NPM Packages
Write-Step "Installing global NPM packages (PM2 for service management)..."
npm install -g pm2 pm2-windows-startup | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to install global NPM packages. Please check your internet connection and permissions."
}
Write-Success "PM2 installed successfully."

# 4. Configure PM2 for Startup
Write-Step "Configuring PM2 to run on Windows startup..."
pm2-startup install
# No reliable way to check exit code for this one, so we assume success if it doesn't throw.
Write-Success "PM2 startup configured."

# 5. Install Local Project Dependencies
Write-Step "Installing local project dependencies..."
npm install ws nmea-0183 | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Error "Failed to install base dependencies (ws, nmea-0183)." }

if ($listenerChoice -eq '2') {
    Write-Host "Installing serial port dependencies..."
    npm install serialport @serialport/parser-readline | Out-Null
    if ($LASTEXITCODE -ne 0) { Write-Error "Failed to install serial port dependencies." }
}
Write-Success "Local dependencies installed."

# 6. Start the Service with PM2
Write-Step "Starting the AIS listener service with PM2..."
$scriptPath = if ($listenerChoice -eq '1') { "services/ais-udp-listener.js" } else { "services/ais-serial-listener.js" }
$serviceName = "ais-ingestion-service"

# Stop the service if it already exists to ensure a clean start
pm2 stop $serviceName --silent
pm2 delete $serviceName --silent

pm2 start $scriptPath --name $serviceName
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to start the listener service with PM2. Run 'pm2 logs $serviceName' to diagnose."
}
Write-Success "Service '$serviceName' started."

# 7. Save PM2 Process List
Write-Step "Saving the PM2 process list to restore on reboot..."
pm2 save
Write-Success "PM2 process list saved."

# 8. Configure Windows Firewall for UDP
if ($listenerChoice -eq '1') {
    Write-Step "Configuring Windows Defender Firewall for UDP traffic on port $udpPort..."
    $ruleName = "AIS UDP Inbound Port ($udpPort)"
    $existingRule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
    if ($existingRule) {
        Write-Warning "Firewall rule '$ruleName' already exists. Skipping creation."
    } else {
        New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Action Allow -Protocol UDP -LocalPort $udpPort
        Write-Success "Firewall rule '$ruleName' created successfully."
    }
}

# 9. Final Instructions
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "`nThe AIS listener service is now running in the background and will restart automatically."
Write-Host "You can monitor the service with the command: ${Cyan}pm2 logs $serviceName${Color_Off}"
Write-Warning "`nCRITICAL FINAL STEP: You MUST configure the listener script."
Write-Host "1. Open the file: ${Cyan}$scriptPath${Color_Off}"
Write-Host "2. Edit the following variables at the top of the file:"
Write-Host "   - ${Cyan}API_ENDPOINT${Color_Off}: Set this to the URL of your main backend API."
Write-Host "   - ${Cyan}PORT_ID_FOR_THIS_FEED${Color_Off}: Set this to the correct Port ID from your application."
if ($listenerChoice -eq '2') {
    Write-Host "   - ${Cyan}SERIAL_PORT_PATH${Color_Off}: Ensure this is set to the correct COM port (e.g., 'COM3')."
}
Write-Host "3. After saving the file, restart the service with: ${Cyan}pm2 restart $serviceName${Color_Off}"
Write-Host ""
Read-Host "Press Enter to exit script"
