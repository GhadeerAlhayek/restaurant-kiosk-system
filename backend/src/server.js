const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const logger = require('./utils/logger');
const { queryOne } = require('./config/database');

// Import routes
const menuRoutes = require('./routes/menu');
const orderRoutes = require('./routes/orders');
const deviceRoutes = require('./routes/devices');
const printerRoutes = require('./routes/printer');
const reportRoutes = require('./routes/reports');
const categoryRoutes = require('./routes/categories');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.SOCKET_CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (menu images)
app.use('/api/images', express.static(__dirname + '/../../assets/menu-images'));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// Make io available to routes
app.set('io', io);

// API Routes
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/printer', printerRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/categories', categoryRoutes);

// Health check endpoint
app.get('/api/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: require('../package.json').version,
  };

  try {
    // Check database connection
    queryOne('SELECT 1 as test');
    health.database = 'connected';
  } catch (error) {
    health.database = 'error';
    health.status = 'error';
    logger.error('Database health check failed:', error);
  }

  // Check connected devices
  health.devices = {
    total: io.sockets.sockets.size,
    kiosks: Array.from(io.sockets.adapter.rooms.get('all-kiosks') || []).length,
    admin: Array.from(io.sockets.adapter.rooms.get('admin') || []).length,
    kitchen: Array.from(io.sockets.adapter.rooms.get('kitchen') || []).length,
  };

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Serve frontend static files (after API routes)
const path = require('path');
const frontendDistPath = path.join(__dirname, '../../frontend/kiosk-app/dist');

// Serve static assets (js, css, images, etc)
app.use(express.static(frontendDistPath));

// Handle client-side routing - serve index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
});

// Socket.io connection handling
const deviceConnections = new Map();

io.on('connection', (socket) => {
  const { device_id, device_type } = socket.handshake.auth;

  logger.info(`Device connected: ${device_id} (${device_type})`);

  // Store device connection
  deviceConnections.set(device_id, {
    socketId: socket.id,
    deviceType: device_type,
    connectedAt: new Date(),
  });

  // Join device-specific room
  socket.join(device_id);

  // Join type-specific rooms
  if (device_type === 'kiosk') {
    socket.join('all-kiosks');
  } else if (device_type === 'admin') {
    socket.join('admin');
  } else if (device_type === 'kitchen') {
    socket.join('kitchen');
  }

  // Send connection acknowledgment
  socket.emit('connected', {
    device_id,
    server_time: new Date().toISOString(),
    connected_devices: io.sockets.sockets.size,
  });

  // Notify admin of new device
  io.to('admin').emit('device:online', {
    device_id,
    device_type,
    timestamp: new Date().toISOString(),
  });

  // Handle heartbeat
  socket.on('heartbeat', async (data) => {
    try {
      // Update device heartbeat in database
      await pool.query(
        `INSERT INTO devices (device_id, device_type, last_heartbeat, status)
         VALUES ($1, $2, NOW(), 'online')
         ON CONFLICT (device_id)
         DO UPDATE SET last_heartbeat = NOW(), status = 'online'`,
        [device_id, device_type]
      );
    } catch (error) {
      logger.error(`Heartbeat update failed for ${device_id}:`, error);
    }
  });

  // Handle order creation from kiosk
  socket.on('order:create', async (data, callback) => {
    try {
      // This will be handled by the order controller
      // Broadcast to kitchen and admin
      io.to('kitchen').to('admin').emit('order:new', data);

      if (callback) callback({ success: true });
    } catch (error) {
      logger.error('Order creation error:', error);
      if (callback) callback({ success: false, error: error.message });
    }
  });

  // Handle order status update from kitchen
  socket.on('order:update-status', async (data, callback) => {
    try {
      // Broadcast status change to all clients
      io.emit('order:status-changed', {
        order_id: data.order_id,
        order_number: data.order_number,
        old_status: data.old_status,
        new_status: data.new_status,
        timestamp: new Date().toISOString(),
      });

      if (callback) callback({ success: true });
    } catch (error) {
      logger.error('Order status update error:', error);
      if (callback) callback({ success: false, error: error.message });
    }
  });

  // Handle menu updates from admin
  socket.on('menu:update', (data) => {
    // Broadcast to all kiosks
    io.to('all-kiosks').emit('menu:item-updated', data);
  });

  socket.on('menu:toggle-availability', (data) => {
    const event = data.is_available ? 'menu:item-available' : 'menu:item-unavailable';
    io.to('all-kiosks').emit(event, {
      item_id: data.item_id,
      item_name: data.item_name,
    });
  });

  // Handle device disconnection
  socket.on('disconnect', () => {
    logger.info(`Device disconnected: ${device_id}`);
    deviceConnections.delete(device_id);

    // Notify admin
    io.to('admin').emit('device:offline', {
      device_id,
      device_type,
      timestamp: new Date().toISOString(),
    });
  });
});

// Monitor devices for offline status
setInterval(async () => {
  try {
    const { run } = require('./config/database');
    // Mark devices offline if no heartbeat for 30 seconds
    await run(
      `UPDATE devices
       SET status = 'offline'
       WHERE datetime(last_heartbeat) < datetime('now', '-30 seconds')
       AND status = 'online'`
    );
  } catch (error) {
    logger.error('Device monitoring error:', error);
  }
}, 10000); // Check every 10 seconds

// Cleanup old orders (every 30 minutes)
setInterval(async () => {
  try {
    const { run, query } = require('./config/database');
    const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();

    // First delete order items for old completed/cancelled orders
    await run(
      `DELETE FROM order_items WHERE order_id IN (
        SELECT id FROM orders WHERE created_at < ? AND status IN ('completed', 'cancelled')
      )`,
      [fiveHoursAgo]
    );

    // Then delete the old orders
    const result = await run(
      `DELETE FROM orders WHERE created_at < ? AND status IN ('completed', 'cancelled')`,
      [fiveHoursAgo]
    );

    if (result.changes > 0) {
      logger.info(`Auto-cleanup: Deleted ${result.changes} orders older than 5 hours`);
    }
  } catch (error) {
    logger.error('Order cleanup error:', error);
  }
}, 30 * 60 * 1000); // Run every 30 minutes

// Start server
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  logger.info(`Server running on http://${HOST}:${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    pool.end();
    process.exit(0);
  });
});

module.exports = { app, server, io };
