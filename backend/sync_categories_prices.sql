-- ============================================================
-- Sync categories + product prices/categories with the updated
-- frontend (index12). Safe to re-run.
-- Run AFTER schema.sql and schema_admin.sql.
-- ============================================================

USE ecommerce_db;

INSERT IGNORE INTO categories (name, slug, status) VALUES
  ('Canvas Art', 'canvas-art', 'active'),
  ('Jewellery', 'jewellery', 'active'),
  ('Lifestyle Accessories', 'lifestyle-accessories', 'active'),
  ('Money Jars', 'money-jars', 'active'),
  ('Paper Clay', 'paper-clay', 'active'),
  ('Plaster of Paris', 'plaster-of-paris', 'active'),
  ('T-Shirts', 't-shirts', 'active'),
  ('Tote Bags', 'tote-bags', 'active'),
  ('Wall Hangings', 'wall-hangings', 'active');

-- Product price + category sync
UPDATE products SET price = 399, category_id = (SELECT id FROM categories WHERE slug='plaster-of-paris') WHERE id = 1; -- 'POP on Canvas'
UPDATE products SET price = 249, category_id = (SELECT id FROM categories WHERE slug='plaster-of-paris') WHERE id = 2; -- 'Geometric Pots'
UPDATE products SET price = 600, category_id = (SELECT id FROM categories WHERE slug='paper-clay') WHERE id = 3; -- 'Product'
UPDATE products SET price = 620, category_id = (SELECT id FROM categories WHERE slug='paper-clay') WHERE id = 67241150; -- 'Bottle Flower Vase II'
UPDATE products SET price = 490, category_id = (SELECT id FROM categories WHERE slug='canvas-art') WHERE id = 337384524; -- 'Embroidered Canvas II'
UPDATE products SET price = 450, category_id = (SELECT id FROM categories WHERE slug='lifestyle-accessories') WHERE id = 353948553; -- 'Sepian'
UPDATE products SET price = 500, category_id = (SELECT id FROM categories WHERE slug='canvas-art') WHERE id = 370165409; -- 'Art Canvas I'
UPDATE products SET price = 350, category_id = (SELECT id FROM categories WHERE slug='money-jars') WHERE id = 690986267; -- 'Macrame Money Jar'
UPDATE products SET price = 400, category_id = (SELECT id FROM categories WHERE slug='paper-clay') WHERE id = 1485932789; -- 'Decorative Lamp'
UPDATE products SET price = 300, category_id = (SELECT id FROM categories WHERE slug='wall-hangings') WHERE id = 1537409183; -- 'Air-Clay Wall Hanging'
UPDATE products SET price = 600, category_id = (SELECT id FROM categories WHERE slug='lifestyle-accessories') WHERE id = 1547236079; -- 'Sleepers'
UPDATE products SET price = 350, category_id = (SELECT id FROM categories WHERE slug='lifestyle-accessories') WHERE id = 1548448044; -- 'Printed Mug I'
UPDATE products SET price = 450, category_id = (SELECT id FROM categories WHERE slug='tote-bags') WHERE id = 1585908517; -- 'Calligraphy Tote Bag'
UPDATE products SET price = 250, category_id = (SELECT id FROM categories WHERE slug='paper-clay') WHERE id = 1614744005; -- 'Decorative Pen'
UPDATE products SET price = 420, category_id = (SELECT id FROM categories WHERE slug='paper-clay') WHERE id = 1822927444; -- 'Decorative Lamp I'
UPDATE products SET price = 249, category_id = (SELECT id FROM categories WHERE slug='plaster-of-paris') WHERE id = 1882775832; -- 'Geometric Pots II'
UPDATE products SET price = 400, category_id = (SELECT id FROM categories WHERE slug='paper-clay') WHERE id = 1939913336; -- 'Decorative Lamp III'
UPDATE products SET price = 799, category_id = (SELECT id FROM categories WHERE slug='lifestyle-accessories') WHERE id = 1947854380; -- 'Printed Mug III'
UPDATE products SET price = 350, category_id = (SELECT id FROM categories WHERE slug='plaster-of-paris') WHERE id = 2184463611; -- 'POP Bookends'
UPDATE products SET price = 480, category_id = (SELECT id FROM categories WHERE slug='canvas-art') WHERE id = 2193744728; -- 'Embroidered Canvas I'
UPDATE products SET price = 600, category_id = (SELECT id FROM categories WHERE slug='paper-clay') WHERE id = 2207399754; -- 'Bottle Flower Vase I'
UPDATE products SET price = 399, category_id = (SELECT id FROM categories WHERE slug='plaster-of-paris') WHERE id = 2264135953; -- 'Flower Stand'
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug='plaster-of-paris') WHERE id = 2267427224; -- 'Flower Bucket': category only, name doesn't match new frontend (shares image with 'Geometric Pots II') — review manually
UPDATE products SET price = 799, category_id = (SELECT id FROM categories WHERE slug='lifestyle-accessories') WHERE id = 2749733593; -- 'Printed Mug'
UPDATE products SET price = 399, category_id = (SELECT id FROM categories WHERE slug='plaster-of-paris') WHERE id = 2812726886; -- 'POP on Canvas II'
UPDATE products SET price = 399, category_id = (SELECT id FROM categories WHERE slug='plaster-of-paris') WHERE id = 3034836700; -- 'POP on Canvas I'
UPDATE products SET price = 400, category_id = (SELECT id FROM categories WHERE slug='plaster-of-paris') WHERE id = 3121388019; -- 'Geometric Pots'
UPDATE products SET price = 280, category_id = (SELECT id FROM categories WHERE slug='plaster-of-paris') WHERE id = 3145776821; -- 'POP Tray'
UPDATE products SET price = 350, category_id = (SELECT id FROM categories WHERE slug='plaster-of-paris') WHERE id = 3340541469; -- 'Geometric Pot with Tray'
UPDATE products SET price = 430, category_id = (SELECT id FROM categories WHERE slug='paper-clay') WHERE id = 3416674006; -- 'Decorative Lamp II'
UPDATE products SET price = 380, category_id = (SELECT id FROM categories WHERE slug='lifestyle-accessories') WHERE id = 3536935638; -- 'Printed Mug II'
UPDATE products SET price = 350, category_id = (SELECT id FROM categories WHERE slug='jewellery') WHERE id = 4034284375; -- 'Wooden Jewellery'
UPDATE products SET price = 640, category_id = (SELECT id FROM categories WHERE slug='paper-clay') WHERE id = 4068036378; -- 'Bottle Flower Vase III'
UPDATE products SET price = 520, category_id = (SELECT id FROM categories WHERE slug='canvas-art') WHERE id = 4173755019; -- 'Art Canvas II'
UPDATE products SET price = 550, category_id = (SELECT id FROM categories WHERE slug='t-shirts') WHERE id = 4218312665; -- 'Printed T-Shirts'
