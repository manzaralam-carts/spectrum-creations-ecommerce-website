-- ============================================================
-- Ecommerce database schema + seed data
-- Generated from the live product catalog on the storefront
-- (35 products found; 28 of them have price = 0 because the
-- site's HTML never set a data-price for those cards — that's
-- a pre-existing gap in the frontend markup, not something
-- invented here. Fix real prices via phpMyAdmin or by adding
-- data-price="123" to those product cards and re-seeding.)
-- ============================================================

CREATE DATABASE IF NOT EXISTS ecommerce_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE ecommerce_db;

-- ---------------------------------------------------------
-- Products (source of truth for price + stock once connected)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id            BIGINT UNSIGNED PRIMARY KEY,   -- matches the frontend's data-id
  name          VARCHAR(150) NOT NULL,
  description   TEXT,
  price         DECIMAL(10,2) NOT NULL DEFAULT 0,
  image         VARCHAR(255),
  stock         INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- Orders + line items
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  order_no       VARCHAR(40) NOT NULL UNIQUE,
  customer_name  VARCHAR(100) NOT NULL,
  mobile         VARCHAR(20) NOT NULL,
  address        TEXT NOT NULL,
  address_tag    VARCHAR(20),
  payment_method VARCHAR(20) NOT NULL DEFAULT 'cod',
  total          DECIMAL(10,2) NOT NULL DEFAULT 0,
  status         ENUM('pending','confirmed','shipped','delivered','cancelled') DEFAULT 'pending',
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS order_items (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  order_id       INT NOT NULL,
  product_id     BIGINT UNSIGNED NOT NULL,
  product_name   VARCHAR(150) NOT NULL,   -- snapshot at time of order
  unit_price     DECIMAL(10,2) NOT NULL,
  qty            INT NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- Wishlist — keyed by an anonymous device_id (no login system
-- on this site), generated client-side and stored in localStorage
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS wishlist (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  device_id    VARCHAR(64) NOT NULL,
  product_id   BIGINT UNSIGNED NOT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_device_product (device_id, product_id),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_wishlist_device ON wishlist(device_id);
CREATE INDEX idx_order_items_order ON order_items(order_id);

-- ---------------------------------------------------------
-- Seed data — the actual products currently on the storefront
-- ---------------------------------------------------------
INSERT INTO products (id, name, description, price, image, stock) VALUES
(1, 'POP on Canvas', 'Handmade with love by neurodiverse creators.', 399, 'images/POP (Plaster Of Paris)/POP on Canvas (2).jpg', 4),
(2, 'Geometric Pots', 'Handmade with love by neurodiverse creators.', 249, 'images/POP (Plaster Of Paris)/Geometric Pots (2).jpg', 3),
(3, 'Product', 'Handmade with love by neurodiverse creators.', 0, 'images/Paper Clay/Bottle Flower Vase (1).jpg', 2),
(67241150, 'Bottle Flower Vase II', 'Handmade with love by neurodiverse creators.', 0, 'images/Paper Clay/Bottle Flower Vase (2).jpg', 17),
(337384524, 'Embroidered Canvas II', 'Handmade with love by neurodiverse creators.', 0, 'images/Canvas Arts/Embroided Canvas (2).jpg', 10),
(353948553, 'Sepian', 'Handmade with love by neurodiverse creators.', 0, 'images/Lifestyle Accessories/Sepian.jpg', 28),
(370165409, 'Art Canvas I', 'Handmade with love by neurodiverse creators.', 0, 'images/Canvas Arts/Art Canvas (1).jpg', 4),
(690986267, 'Macrame Money Jar', 'Handmade with love by neurodiverse creators.', 0, 'images/Money Jar/Macrame Thread Money Jar.jpg', 46),
(1485932789, 'Decorative Lamp', 'Handmade with love by neurodiverse creators.', 400, 'images/Paper Clay/Decorative Lamp (3).jpg', 3),
(1537409183, 'Air-Clay Wall Hanging', 'Handmade with love by neurodiverse creators.', 300, 'images/Wall Hangings/Air-Clay Wall Hanging.jpg', 4),
(1547236079, 'Sleepers', 'Handmade with love by neurodiverse creators.', 0, 'images/Lifestyle Accessories/Sleepers.jpg', 17),
(1548448044, 'Printed Mug I', 'Handmade with love by neurodiverse creators.', 0, 'images/Lifestyle Accessories/Mug (1).jpg', 41),
(1585908517, 'Calligraphy Tote Bag', 'Handmade with love by neurodiverse creators.', 0, 'images/Tote Bags/Calligraphy Tote Bag.jpg', 14),
(1614744005, 'Decorative Pen', 'Handmade with love by neurodiverse creators.', 0, 'images/Paper Clay/Decorative Pen.jpg', 3),
(1822927444, 'Decorative Lamp I', 'Handmade with love by neurodiverse creators.', 0, 'images/Paper Clay/Decorative Lamp (1).jpg', 28),
(1882775832, 'Geometric Pots II', 'Handmade with love by neurodiverse creators.', 0, 'images/POP (Plaster Of Paris)/Geometric Pots (2).jpg', 40),
(1939913336, 'Decorative Lamp III', 'Handmade with love by neurodiverse creators.', 0, 'images/Paper Clay/Decorative Lamp (3).jpg', 48),
(1947854380, 'Printed Mug III', 'Handmade with love by neurodiverse creators.', 0, 'images/Lifestyle Accessories/Mug (3).jpg', 30),
(2184463611, 'POP Bookends', 'Handmade with love by neurodiverse creators.', 0, 'images/POP (Plaster Of Paris)/POP Bookends.jpg', 5),
(2193744728, 'Embroidered Canvas I', 'Handmade with love by neurodiverse creators.', 0, 'images/Canvas Arts/Embroided Canvas (1).jpg', 48),
(2207399754, 'Bottle Flower Vase I', 'Handmade with love by neurodiverse creators.', 0, 'images/Paper Clay/Bottle Flower Vase (1).jpg', 45),
(2264135953, 'Flower Stand', 'Handmade with love by neurodiverse creators.', 0, 'images/POP (Plaster Of Paris)/Flower Stand.jpg', 0),
(2267427224, 'Flower Bucket', 'Handmade with love by neurodiverse creators.', 299, 'images/POP (Plaster Of Paris)/Geometric Pots (2).jpg', 21),
(2749733593, 'Printed Mug', 'Handmade with love by neurodiverse creators.', 799, 'images/Lifestyle Accessories/Mug (3).jpg', 5),
(2812726886, 'POP on Canvas II', 'Handmade with love by neurodiverse creators.', 0, 'images/POP (Plaster Of Paris)/POP on Canvas (2).jpg', 49),
(3034836700, 'POP on Canvas I', 'Handmade with love by neurodiverse creators.', 0, 'images/POP (Plaster Of Paris)/POP on Canvas (1).jpg', 17),
(3121388019, 'Geometric Pots', 'Handmade with love by neurodiverse creators.', 0, 'images/POP (Plaster Of Paris)/Geometric Pots (1).jpg', 7),
(3145776821, 'POP Tray', 'Handmade with love by neurodiverse creators.', 0, 'images/POP (Plaster Of Paris)/Plaster of Paris Tray.jpg', 3),
(3340541469, 'Geometric Pot with Tray', 'Handmade with love by neurodiverse creators.', 0, 'images/POP (Plaster Of Paris)/Geometric Pot with Tray.jpg', 4),
(3416674006, 'Decorative Lamp II', 'Handmade with love by neurodiverse creators.', 0, 'images/Paper Clay/Decorative Lamp (2).jpg', 16),
(3536935638, 'Printed Mug II', 'Handmade with love by neurodiverse creators.', 0, 'images/Lifestyle Accessories/Mug (2).jpg', 2),
(4034284375, 'Wooden Jewellery', 'Handmade with love by neurodiverse creators.', 0, 'images/Jewellery/Wooden Jewellery.jpg', 41),
(4068036378, 'Bottle Flower Vase III', 'Handmade with love by neurodiverse creators.', 0, 'images/Paper Clay/Bottle Flower Vase (3).jpg', 12),
(4173755019, 'Art Canvas II', 'Handmade with love by neurodiverse creators.', 0, 'images/Canvas Arts/Art Canvas (2).jpg', 45),
(4218312665, 'Printed T-Shirts', 'Handmade with love by neurodiverse creators.', 0, 'images/T-Shirts/', 49)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  price = VALUES(price),
  image = VALUES(image),
  stock = VALUES(stock);
