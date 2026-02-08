-- Add type column to category_ingredients table
ALTER TABLE category_ingredients ADD COLUMN type TEXT DEFAULT 'other' CHECK (type IN ('meat', 'sauce', 'vegetable', 'cheese', 'other'));

-- Update existing ingredients to have a default type
-- You can manually update these later through the admin panel
UPDATE category_ingredients SET type = 'other' WHERE type IS NULL;
