-- Add customization_steps JSON column to menu_items table
-- This allows each menu item to have its own customization flow
-- If set, this overrides the category's customization_steps
ALTER TABLE menu_items ADD COLUMN customization_steps TEXT DEFAULT NULL;

-- Example use case:
-- Category: "Tacos" (build_your_own)
-- Menu Item: "Tacos M" - customization_steps: [{"order":1,"title":"Choose 3 ingredients","ingredient_ids":[1,2,3],"max_selections":3}]
-- Menu Item: "Tacos L" - customization_steps: [{"order":1,"title":"Choose 5 ingredients","ingredient_ids":[1,2,3,4,5],"max_selections":5}]
