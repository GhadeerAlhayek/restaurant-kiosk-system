-- Add build-your-own feature to categories
-- This is for categories where customers build their item from scratch (like build-your-own sandwich)
-- Different from is_customizable which adds toppings to a predefined item
ALTER TABLE categories ADD COLUMN is_build_your_own INTEGER DEFAULT 0;

-- For build-your-own items, we don't need menu_items table entries
-- The customer builds entirely from category ingredients
