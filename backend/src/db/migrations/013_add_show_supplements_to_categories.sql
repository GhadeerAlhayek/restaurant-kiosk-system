-- Add show_supplements column to categories table
ALTER TABLE categories ADD COLUMN show_supplements INTEGER DEFAULT 1 CHECK (show_supplements IN (0, 1));

-- Default to showing supplements for all existing categories
UPDATE categories SET show_supplements = 1 WHERE show_supplements IS NULL;
