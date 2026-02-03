-- Fix foreign key constraint on order_items to allow NULL menu_item_id
-- SQLite requires recreating the table to modify foreign keys

-- Create new table with corrected foreign key
CREATE TABLE order_items_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    menu_item_id INTEGER,
    quantity INTEGER NOT NULL DEFAULT 1,
    price_at_order REAL NOT NULL,
    subtotal REAL NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    instructions TEXT,
    name TEXT,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    -- Removed FOREIGN KEY on menu_item_id to allow build-your-own items
);

-- Copy data from old table
INSERT INTO order_items_new (id, order_id, menu_item_id, quantity, price_at_order, subtotal, created_at, instructions, name)
SELECT id, order_id, menu_item_id, quantity, price_at_order, subtotal, created_at, instructions, name
FROM order_items;

-- Drop old table
DROP TABLE order_items;

-- Rename new table
ALTER TABLE order_items_new RENAME TO order_items;

-- Recreate index if it existed
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
