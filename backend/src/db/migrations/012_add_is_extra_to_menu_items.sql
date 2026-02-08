-- Add is_extra column to menu_items table
ALTER TABLE menu_items ADD COLUMN is_extra INTEGER DEFAULT 0 CHECK (is_extra IN (0, 1));

-- By default, no items are extras (admin can mark them manually)
UPDATE menu_items SET is_extra = 0 WHERE is_extra IS NULL;
