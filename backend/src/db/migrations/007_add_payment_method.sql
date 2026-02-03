-- Add payment_method column to orders table
ALTER TABLE orders ADD COLUMN payment_method TEXT CHECK (payment_method IN ('card', 'cash', NULL));
