-- Add customizable feature to categories
ALTER TABLE categories ADD COLUMN is_customizable INTEGER DEFAULT 0;

-- Category Sizes Table (for customizable items like Small, Medium, Large)
CREATE TABLE IF NOT EXISTS category_sizes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    price REAL NOT NULL DEFAULT 0,
    display_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- Category Ingredients Table (for customizable toppings/ingredients)
CREATE TABLE IF NOT EXISTS category_ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    price REAL NOT NULL DEFAULT 0,
    display_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- Order Item Customizations Table (stores selected size and ingredients for each order item)
CREATE TABLE IF NOT EXISTS order_item_customizations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_item_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('size', 'ingredient')),
    name TEXT NOT NULL,
    price REAL NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_category_sizes_category_id ON category_sizes(category_id);
CREATE INDEX IF NOT EXISTS idx_category_ingredients_category_id ON category_ingredients(category_id);
CREATE INDEX IF NOT EXISTS idx_order_item_customizations_order_item_id ON order_item_customizations(order_item_id);

-- Triggers to update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_category_sizes_updated_at
AFTER UPDATE ON category_sizes
BEGIN
    UPDATE category_sizes SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_category_ingredients_updated_at
AFTER UPDATE ON category_ingredients
BEGIN
    UPDATE category_ingredients SET updated_at = datetime('now') WHERE id = NEW.id;
END;
