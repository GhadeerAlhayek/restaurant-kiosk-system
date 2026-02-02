-- Add name column to order_items for build-your-own items
-- For regular items, name comes from menu_items table
-- For build-your-own items, name is stored directly in order_items
ALTER TABLE order_items ADD COLUMN name TEXT;
