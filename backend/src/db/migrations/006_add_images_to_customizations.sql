-- Add image_url columns to sizes and ingredients for visual selection
ALTER TABLE category_sizes ADD COLUMN image_url TEXT;
ALTER TABLE category_ingredients ADD COLUMN image_url TEXT;
