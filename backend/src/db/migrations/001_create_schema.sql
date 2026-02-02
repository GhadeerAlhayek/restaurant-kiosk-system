-- SQLite Schema for Restaurant Kiosk System

-- Menu Items Table
CREATE TABLE IF NOT EXISTS menu_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    base_type TEXT NOT NULL CHECK (base_type IN ('tomato', 'cream')),
    price REAL NOT NULL,
    image_url TEXT,
    ingredients TEXT, -- JSON array stored as text
    is_available INTEGER DEFAULT 1, -- SQLite doesn't have BOOLEAN, use INTEGER (0/1)
    category TEXT DEFAULT 'pizza',
    display_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number TEXT UNIQUE NOT NULL,
    device_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN
        ('pending', 'preparing', 'ready', 'completed', 'cancelled')),
    total_amount REAL NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT,
    notes TEXT
);

-- Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    menu_item_id INTEGER,
    quantity INTEGER NOT NULL DEFAULT 1,
    price_at_order REAL NOT NULL,
    subtotal REAL NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
);

-- Devices Table
CREATE TABLE IF NOT EXISTS devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT UNIQUE NOT NULL,
    device_type TEXT NOT NULL CHECK (device_type IN
        ('kiosk', 'kitchen', 'admin')),
    ip_address TEXT,
    status TEXT DEFAULT 'online' CHECK (status IN
        ('online', 'offline', 'error')),
    last_heartbeat TEXT DEFAULT (datetime('now')),
    printer_status TEXT DEFAULT 'unknown',
    metadata TEXT, -- JSON stored as text
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_device_id ON orders(device_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_base_type ON menu_items(base_type);
CREATE INDEX IF NOT EXISTS idx_menu_items_available ON menu_items(is_available);
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);

-- Triggers to update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_menu_items_updated_at
AFTER UPDATE ON menu_items
BEGIN
    UPDATE menu_items SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_orders_updated_at
AFTER UPDATE ON orders
BEGIN
    UPDATE orders SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_devices_updated_at
AFTER UPDATE ON devices
BEGIN
    UPDATE devices SET updated_at = datetime('now') WHERE id = NEW.id;
END;
