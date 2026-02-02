-- Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    icon TEXT,
    display_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Add category_id to menu_items
ALTER TABLE menu_items ADD COLUMN category_id INTEGER REFERENCES categories(id);

-- Add order_type to orders (takeaway or dine-in)
ALTER TABLE orders ADD COLUMN order_type TEXT DEFAULT 'dine-in';

-- Add instructions to order_items
ALTER TABLE order_items ADD COLUMN instructions TEXT;

-- Insert default pizza category
INSERT INTO categories (name, display_name, icon, display_order) VALUES ('pizza', 'Pizzas', '🍕', 1);

-- Update existing pizzas to use the category
UPDATE menu_items SET category_id = 1 WHERE category = 'pizza';

-- Create index
CREATE INDEX IF NOT EXISTS idx_menu_items_category_id ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active);

-- Trigger for categories updated_at
CREATE TRIGGER IF NOT EXISTS update_categories_updated_at
AFTER UPDATE ON categories
BEGIN
    UPDATE categories SET updated_at = datetime('now') WHERE id = NEW.id;
END;
