-- Add customization_steps JSON column to categories table
-- This allows admin to configure dynamic customization flow for each category
ALTER TABLE categories ADD COLUMN customization_steps TEXT DEFAULT NULL;

-- Example value for a sandwich category:
-- [{"order":1,"type":"sauce","title":"Choisissez votre sauce","required":true},
--  {"order":2,"type":"size","title":"Choisissez la taille","required":true},
--  {"order":3,"type":"meat","title":"Choisissez la viande","required":false}]
