-- Sample furniture data for the furniture gift system
-- Run this in your Supabase SQL editor to add furniture items

INSERT INTO furniture (name, image) VALUES 
('Chair', 'chair.png'),
('Table', 'table.png'), 
('Sofa', 'sofa.png'),
('Bookshelf', 'bookshelf.png'),
('Lamp', 'lamp.png'),
('Desk', 'desk.png'),
('Bed', 'bed.png'),
('Wardrobe', 'wardrobe.png'),
('Mirror', 'mirror.png'),
('Plant', 'plant.png');

-- You can also add furniture without images (will show as text)
INSERT INTO furniture (name) VALUES 
('Cushion'),
('Rug'),
('Clock'),
('Picture Frame'),
('Vase');
