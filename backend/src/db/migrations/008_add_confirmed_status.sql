-- Drop the old constraint and add confirmed status
-- SQLite doesn't support ALTER TABLE ... MODIFY, so we need to recreate the table

-- Create temporary table with new schema
CREATE TABLE orders_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number TEXT UNIQUE NOT NULL,
    device_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN
        ('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled')),
    total_amount REAL NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT,
    notes TEXT,
    payment_method TEXT CHECK (payment_method IN ('card', 'cash', NULL))
);

-- Copy data from old table
INSERT INTO orders_new SELECT
    id, order_number, device_id, status, total_amount,
    created_at, updated_at, completed_at, notes, payment_method
FROM orders;

-- Drop old table
DROP TABLE orders;

-- Rename new table
ALTER TABLE orders_new RENAME TO orders;

-- Recreate indexes
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_device_id ON orders(device_id);

-- Recreate trigger
CREATE TRIGGER update_orders_updated_at
AFTER UPDATE ON orders
BEGIN
    UPDATE orders SET updated_at = datetime('now') WHERE id = NEW.id;
END;
