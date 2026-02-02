-- Seed menu items from minue.md
INSERT OR IGNORE INTO menu_items (name, description, base_type, price, image_url, ingredients, display_order) VALUES
-- Tomato Base Pizzas
('Mergheritta', 'tomates, mozzarella', 'tomato', 6.00, 'Mergheritta.jpeg',
    '["tomates", "mozzarella"]', 1),
('Fruits de mer', 'tomates, mozzarella, fruits de mer', 'tomato', 9.00, 'Fruit de mer.jpeg',
    '["tomates", "mozzarella", "fruits de mer"]', 2),
('Végétarienne', 'tomates, mozzarella, aubergines, courgettes, champignons, poivrons, oignons', 'tomato', 8.00, 'Vegeterian.jpeg',
    '["tomates", "mozzarella", "aubergines", "courgettes", "champignons", "poivrons", "oignons"]', 3),
('Halloumi', 'tomates, mozzarella, halloumi, olives', 'tomato', 8.00, 'Halloumi.jpeg',
    '["tomates", "mozzarella", "halloumi", "olives"]', 4),
('Bolognaise', 'tomates, mozzarella, viande hachée', 'tomato', 7.00, 'Bolognaise.jpeg',
    '["tomates", "mozzarella", "viande hachée"]', 5),
('4 fromage', 'tomates, mozzarella, emmental, chèvre, fromtina', 'tomato', 8.00, '4 fromage.jpeg',
    '["tomates", "mozzarella", "emmental", "chèvre", "fromtina"]', 6),
('Thon', 'tomates, mozzarella, thon, olives', 'tomato', 9.00, 'Thon.jpeg',
    '["tomates", "mozzarella", "thon", "olives"]', 7),
('Mexicain', 'tomates, mozzarella, viande haché, merguez, poivrons, olives', 'tomato', 9.00, 'Mexican.jpeg',
    '["tomates", "mozzarella", "viande haché", "merguez", "poivrons", "olives"]', 8),

-- Cream Base Pizzas
('Poulet', 'crème, mozzarella, poulet', 'cream', 6.00, 'Chicken base creme.jpeg',
    '["crème", "mozzarella", "poulet"]', 9),
('Poulet raclette', 'crème, mozzarella, poulet, raclette', 'cream', 6.00, 'Chicken raclette base creme.jpeg',
    '["crème", "mozzarella", "poulet", "raclette"]', 10),
('Saumon', 'crème, mozzarella, saumon', 'cream', 6.00, 'Saumon base creme.jpeg',
    '["crème", "mozzarella", "saumon"]', 11),
('Tartiflette', 'crème, mozzarella, lardon, pomme de terre', 'cream', 6.00, 'Royal.jpeg',
    '["crème", "mozzarella", "lardon", "pomme de terre"]', 12);
