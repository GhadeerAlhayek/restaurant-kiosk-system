# Restaurant Kiosk System

Self-service restaurant kiosk system for Raspberry Pi with customizable menu, admin panel, and kitchen display.

## Features

- **Customer Kiosk**: Touchscreen ordering with build-your-own options (pizzas, sandwiches, tacos)
- **Admin Panel**: Menu management, category configuration, order tracking
- **Kitchen Display**: Real-time order updates via WebSocket
- **Zero-Config Networking**: Auto-discovery using mDNS (no IP configuration needed)
- **Multi-Device**: One server + multiple kiosk terminals

## Architecture

```
Server Pi (kioskserver.local:3000)
├── Backend (Node.js + Express + SQLite)
├── Frontend (React - served as static files)
└── WebSocket (Socket.io for real-time updates)

Kiosk Pis
└── Chromium Browser → http://kioskserver.local:3000
```

**Key Benefits:**
- Works on any network without configuration
- Deploy anywhere - server advertises itself via mDNS
- Pre-built frontend included (no build step on Pi)
- Single update point (Server Pi only)

## Tech Stack

- **Backend**: Node.js, Express, SQLite, Socket.io, Multer
- **Frontend**: React, Vite, CSS3
- **Deployment**: Raspberry Pi 4, Chromium kiosk mode, Systemd

---

## Getting Started

### 1. Push to GitHub (First Time)

```bash

# Initialize git
git init
git add .
git commit -m "Initial commit"

# Create PRIVATE repository on GitHub, then:
git remote add origin git@github.com:YOUR_USERNAME/restaurant-kiosk-system.git
git branch -M main
git push -u origin main
```

### 2. Clone on Raspberry Pi (Private Repo)

**Setup SSH Key:**
```bash
# On the Pi
ssh-keygen -t ed25519 -C "your_email@example.com"
cat ~/.ssh/id_ed25519.pub  # Copy this

# Add to GitHub → Settings → SSH and GPG keys → New SSH key
```

**Clone:**
```bash
cd ~
git clone git@github.com:YOUR_USERNAME/restaurant-kiosk-system.git
cd restaurant-kiosk-system
```

---

## Raspberry Pi Deployment

### Hardware Requirements
- **Server Pi**: Raspberry Pi 4 (4GB+ RAM)
- **Kiosk Pis**: Raspberry Pi 4 (2GB+ RAM each)
- MicroSD cards (32GB+), touchscreen displays, local network

### Server Pi Setup

```bash
# 1. Install Node.js
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 2. Set hostname for mDNS
sudo hostnamectl set-hostname kioskserver

# 3. Install dependencies
cd ~/restaurant-kiosk-system/backend
npm install

# 4. Run migrations
npm run migrate

# 5. Create systemd service
sudo nano /etc/systemd/system/kiosk-server.service
```

**Service file content:**
```ini
[Unit]
Description=Restaurant Kiosk Server
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/ahmad/restaurant-kiosk-system/backend
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Enable service:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable kiosk-server
sudo systemctl start kiosk-server

# Test
curl http://kioskserver.local:3000/api/health
```

### Kiosk Pi Setup

```bash
# 1. Install Chromium
sudo apt update
sudo apt install chromium-browser unclutter -y

# 2. Setup auto-login
sudo raspi-config
# Select: System Options → Boot/Auto Login → Desktop Autologin

# 3. Create kiosk startup script
mkdir -p ~/kiosk
nano ~/kiosk/start-kiosk.sh
```

**Startup script:**
```bash
#!/bin/bash
xset s off
xset -dpms
xset s noblank
unclutter -idle 0.5 -root &

sed -i 's/"exited_cleanly":false/"exited_cleanly":true/' ~/.config/chromium/Default/Preferences
sed -i 's/"exit_type":"Crashed"/"exit_type":"Normal"/' ~/.config/chromium/Default/Preferences

chromium-browser \
  --noerrdialogs \
  --disable-infobars \
  --kiosk \
  --disable-features=TranslateUI \
  --disable-session-crashed-bubble \
  http://kioskserver.local:3000
```

**Make executable and setup autostart:**
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

## Local Development

### Prerequisites
- Node.js 18+
- npm
- Git

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
- API: http://localhost:3000/api

---

## Project Structure

```
restaurant-kiosk-system/
├── backend/
│   ├── src/
│   │   ├── config/      # Database config
│   │   ├── db/          # Migrations
│   │   ├── routes/      # API endpoints
│   │   └── server.js    # Main server
│   └── data/            # SQLite database
├── frontend/kiosk-app/
│   ├── src/
│   │   ├── pages/       # React pages
│   │   └── KioskApp.jsx
│   └── dist/            # Pre-built (included in repo)
└── assets/              # Uploaded images
```

## Key API Endpoints

- `GET /api/categories` - Get categories
- `POST /api/categories` - Create category
- `POST /api/categories/:id/sizes` - Add size
- `POST /api/categories/:id/ingredients` - Add ingredient (with image upload)
- `GET /api/menu` - Get menu items
- `POST /api/menu` - Create menu item
- `GET /api/orders` - Get orders
- `POST /api/orders` - Create order
- `PATCH /api/orders/:id/status` - Update order status
- `GET /api/health` - Health check

## Troubleshooting

**Server not starting:**
```bash
sudo journalctl -u kiosk-server -f
sudo lsof -i :3000
```

**Kiosk can't connect:**
```bash
ping kioskserver.local
curl http://kioskserver.local:3000/api/health
```

**Database reset:**
```bash
cd ~/restaurant-kiosk-system/backend
rm data/*.db
npm run migrate
```

## Updating the Application

### When you make changes to the app:

**⚠️ IMPORTANT: Always follow these steps in order**

**1. Make your changes locally**
```bash
# Edit code, add features, fix bugs, etc.
```

**2. Rebuild the frontend (CRITICAL - DON'T SKIP!)**
```bash
cd frontend/kiosk-app
npm run build
```
> **Why?** The dist/ folder must be updated with your changes. If you skip this, the Pi will run the old version!

**3. Test your changes**
```bash
# Start backend
cd backend
npm run dev

# In another terminal, verify the build works
cd frontend/kiosk-app
npm run preview  # Preview the production build
```

**4. Commit and push to GitHub**
```bash
cd /path/to/restaurant-kiosk-system
git add .
git commit -m "Describe your changes"
git push
```

**5. Update Server Pi**
```bash
# SSH into Server Pi
ssh pi@kioskserver

# Pull latest changes
cd ~/restaurant-kiosk-system
git pull

# If you added/changed backend dependencies:
cd backend
npm install

# If you added database migrations:
npm run migrate

# Restart the server
sudo systemctl restart kiosk-server
```

**6. Kiosks auto-update automatically**
- Kiosks are browsers pointing to the server
- They automatically load the new frontend
- No action needed on Kiosk Pis!
- (Optional: refresh browser with Ctrl+R or reboot)

### Quick Update Checklist

Before every git push, verify:
- [ ] Made changes and tested locally
- [ ] **Rebuilt frontend** (`npm run build`)
- [ ] Tested the production build (`npm run preview`)
- [ ] Committed all changes including dist/
- [ ] Pushed to GitHub

### Common Mistakes to Avoid

❌ **Forgetting to rebuild frontend** - Your changes won't appear on the Pi!
❌ Committing node_modules (already in .gitignore)
❌ Committing .env files (already in .gitignore)
❌ Committing database files (already in .gitignore)

## License

MIT
