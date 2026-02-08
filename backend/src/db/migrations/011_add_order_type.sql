-- Add order_type column to orders table
ALTER TABLE orders ADD COLUMN order_type TEXT DEFAULT 'dine-in' CHECK (order_type IN ('takeaway', 'dine-in'));

-- Update existing orders to have a default type
UPDATE orders SET order_type = 'dine-in' WHERE order_type IS NULL;
