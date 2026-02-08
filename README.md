# Restaurant Kiosk System

Self-service restaurant kiosk system for Raspberry Pi with customizable menu, admin panel, kitchen display, and thermal receipt printing.

## Features

- **Customer Kiosk**: Touchscreen ordering with build-your-own options (pizzas, sandwiches, tacos)
- **Thermal Receipt Printing**: Automatic receipt printing with order number when customer completes order
- **Admin Panel**: Menu management, category configuration, order tracking, payment confirmation
- **Kitchen Display**: Real-time order updates via WebSocket
- **Zero-Config Networking**: Auto-discovery using mDNS (no IP configuration needed)
- **Simple Order Numbers**: Sequential daily numbers (1, 2, 3...)

## Architecture

```
Server Pi (kioskserver.local:3000)
├── Backend (Node.js + Express + SQLite)
├── Frontend (React - served as static files)
├── WebSocket (Socket.io for real-time updates)
└── Thermal Printer (USB)

Kiosk Pis
└── Chromium Browser → http://kioskserver.local:3000
```

## Tech Stack

- **Backend**: Node.js, Express, SQLite, Socket.io, Multer, node-thermal-printer
- **Frontend**: React, Vite, CSS3
- **Deployment**: Raspberry Pi 4, Chromium kiosk mode, Systemd, CUPS

---

## Raspberry Pi Server Setup

### 1. Install Node.js

```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

### 2. Set Hostname

```bash
sudo hostnamectl set-hostname kioskserver
```

### 3. Clone Repository

```bash
cd ~
git clone git@github.com:YOUR_USERNAME/restaurant-kiosk-system.git
cd restaurant-kiosk-system/backend
npm install
npm run migrate
```

### 4. Install Emoji Fonts (for proper emoji display)

```bash
sudo apt install fonts-noto-color-emoji -y
```

### 5. Setup Thermal Printer

**Install CUPS and printer packages:**
```bash
sudo apt install cups printer-driver-escpos -y
sudo usermod -a -G lpadmin ahmad
```

**Enable file device URIs:**
```bash
sudo nano /etc/cups/cups-files.conf
```
Add this line:
```
FileDevice Yes
```

**Restart CUPS:**
```bash
sudo systemctl restart cups
```

**Add USB thermal printer:**
```bash
# Find your printer device (usually /dev/usb/lp0)
ls -l /dev/usb/lp*

# Add printer to CUPS
sudo lpadmin -p kiosk-printer -E -v file:///dev/usb/lp0 -m raw
```

**Configure printer environment variable:**
```bash
cd ~/restaurant-kiosk-system/backend
nano .env
```
Add:
```
PRINTER_KIOSK_1=/dev/usb/lp0
```

### 6. Create Systemd Service

```bash
sudo nano /etc/systemd/system/kiosk-server.service
```

**Service file:**
```ini
[Unit]
Description=Restaurant Kiosk Server
After=network.target

[Service]
Type=simple
User=ahmad
WorkingDirectory=/home/ahmad/restaurant-kiosk-system/backend
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Enable and start:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable kiosk-server
sudo systemctl start kiosk-server
```

**Check status:**
```bash
sudo systemctl status kiosk-server
curl http://kioskserver.local:3000/api/health
```

**Restart service:**
```bash
sudo systemctl restart kiosk-server.service
```

---

## Kiosk Pi Setup

### 1. Install Chromium

```bash
sudo apt update
sudo apt install chromium unclutter fonts-noto-color-emoji -y
```

### 2. Setup Auto-login

```bash
sudo raspi-config
# Select: System Options → Boot/Auto Login → Desktop Autologin
```

### 3. Create Kiosk Startup Script

```bash
mkdir -p ~/kiosk
nano ~/kiosk/start-kiosk.sh
```

**Script content:**
```bash
#!/bin/bash
xset s off
xset -dpms
xset s noblank
unclutter -idle 0.5 -root &

sed -i 's/"exited_cleanly":false/"exited_cleanly":true/' ~/.config/chromium/Default/Preferences
sed -i 's/"exit_type":"Crashed"/"exit_type":"Normal"/' ~/.config/chromium/Default/Preferences

chromium \
  --noerrdialogs \
  --disable-infobars \
  --kiosk \
  --disable-features=TranslateUI \
  --disable-session-crashed-bubble \
  http://kioskserver.local:3000
```

### 4. Setup Autostart

```bash
chmod +x ~/kiosk/start-kiosk.sh
mkdir -p ~/.config/autostart
nano ~/.config/autostart/kiosk.desktop
```

**Desktop file:**
```ini
[Desktop Entry]
Type=Application
Name=Kiosk
Exec=/home/pi/kiosk/start-kiosk.sh
X-GNOME-Autostart-enabled=true
```

**Reboot:**
```bash
sudo reboot
```

---

## Local Development (Mac)

### Setup

```bash
# Backend
cd backend
npm install
npm run migrate
npm run dev  # Port 3000

# Frontend (new terminal)
cd frontend/kiosk-app
npm install
npm run dev  # Port 5173
```

**Access:**
- Kiosk: http://localhost:5173
- Admin: http://localhost:5173/admin

---

## Updating the Application

### On Your Mac:

**1. Make changes and rebuild frontend:**
```bash
cd frontend/kiosk-app
npm run build
```

**2. Commit and push:**
```bash
git add .
git commit -m "Your changes"
git push
```

### On Server Pi:

**Update and restart:**
```bash
cd ~/restaurant-kiosk-system
git pull

# If database migrations added:
cd backend
npm run migrate

# Restart server
sudo systemctl restart kiosk-server
```

**Kiosks auto-update** - they're just browsers pointing to the server.

---

## Printer Test

Test the thermal printer:
```bash
curl -X POST http://kioskserver.local:3000/api/printer/test \
  -H "Content-Type: application/json" \
  -d '{"device_id": "kiosk-1"}'
```

---

## Database Migrations

When you need to modify the database schema:

```bash
cd backend/src/db/migrations
nano 010_your_migration.sql  # Create new migration file
cd ~/restaurant-kiosk-system/backend
npm run migrate
```

---

## Troubleshooting

**Check server logs:**
```bash
sudo journalctl -u kiosk-server -f
```

**Restart server:**
```bash
sudo systemctl restart kiosk-server
```

**Check printer status:**
```bash
lpstat -p
```

**Test network connectivity:**
```bash
ping kioskserver.local
```

**Database reset (if needed):**
```bash
cd ~/restaurant-kiosk-system/backend
rm data/*.db
npm run migrate
```

---

## Project Structure

```
restaurant-kiosk-system/
├── backend/
│   ├── src/
│   │   ├── config/         # Database config
│   │   ├── db/migrations/  # SQL migrations
│   │   ├── routes/         # API endpoints
│   │   ├── services/       # Printer service
│   │   └── server.js       # Main server
│   └── data/               # SQLite database
├── frontend/kiosk-app/
│   ├── src/
│   │   ├── pages/          # React pages
│   │   └── KioskApp.jsx
│   └── dist/               # Production build
└── assets/                 # Uploaded images
```

## License

MIT
