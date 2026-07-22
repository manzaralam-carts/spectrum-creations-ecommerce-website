-- ============================================================
-- Admin CMS schema — run AFTER schema.sql (adds to ecommerce_db,
-- does not touch products/orders/order_items/wishlist).
-- Safe to re-run: every statement is IF NOT EXISTS / INSERT IGNORE.
-- ============================================================

USE ecommerce_db;

-- ---------------------------------------------------------
-- Admin users + roles
-- Roles are intentionally simple (admin / manager / editor / viewer)
-- rather than a granular permissions table — see README for the
-- exact capability matrix. Swap for a permissions join table later
-- without touching any other module.
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('admin','manager','editor','viewer') NOT NULL DEFAULT 'viewer',
  status        ENUM('active','suspended') NOT NULL DEFAULT 'active',
  avatar        VARCHAR(255),
  last_login_at TIMESTAMP NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Default login: admin@spectrumcreations.test / Admin@12345
-- CHANGE THIS PASSWORD IMMEDIATELY AFTER FIRST LOGIN (see README).
INSERT IGNORE INTO admin_users (id, name, email, password_hash, role)
VALUES (1, 'Store Admin', 'admin@spectrumcreations.test',
  '$2b$10$DsZfbSo6Pl6L0tohCaTQhuAOOcVKlsKlKsuACsKEwhhbytil8ZeF2', 'admin');

-- ---------------------------------------------------------
-- Categories
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  slug        VARCHAR(120) NOT NULL UNIQUE,
  description TEXT,
  parent_id   INT NULL,
  image       VARCHAR(255),
  status      ENUM('active','inactive') NOT NULL DEFAULT 'active',
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Link products to categories without disturbing the existing table
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS category_id INT NULL AFTER description,
  ADD COLUMN IF NOT EXISTS vendor_id INT NULL AFTER category_id,
  ADD COLUMN IF NOT EXISTS sku VARCHAR(64) NULL AFTER vendor_id,
  ADD COLUMN IF NOT EXISTS status ENUM('active','draft','archived') NOT NULL DEFAULT 'active' AFTER stock,
  ADD COLUMN IF NOT EXISTS low_stock_threshold INT NOT NULL DEFAULT 5 AFTER status;

-- ---------------------------------------------------------
-- Vendors
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS vendors (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(150) NOT NULL,
  email       VARCHAR(150),
  phone       VARCHAR(30),
  commission_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  status      ENUM('active','pending','suspended') NOT NULL DEFAULT 'pending',
  notes       TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- Coupons
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS coupons (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  code          VARCHAR(40) NOT NULL UNIQUE,
  type          ENUM('percent','fixed') NOT NULL DEFAULT 'percent',
  value         DECIMAL(10,2) NOT NULL,
  min_order     DECIMAL(10,2) NOT NULL DEFAULT 0,
  usage_limit   INT NULL,
  used_count    INT NOT NULL DEFAULT 0,
  starts_at     DATE NULL,
  expires_at    DATE NULL,
  status        ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- Reviews
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS reviews (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  product_id  BIGINT UNSIGNED NOT NULL,
  customer_name VARCHAR(100) NOT NULL,
  rating      TINYINT NOT NULL,
  comment     TEXT,
  status      ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- Banners (homepage / promo slots)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS banners (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(150) NOT NULL,
  subtitle    VARCHAR(255),
  image       VARCHAR(255) NOT NULL,
  link_url    VARCHAR(255),
  position    ENUM('home_hero','home_strip','category_top') NOT NULL DEFAULT 'home_hero',
  sort_order  INT NOT NULL DEFAULT 0,
  status      ENUM('active','inactive') NOT NULL DEFAULT 'active',
  starts_at   DATE NULL,
  ends_at     DATE NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- Blog
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS blog_posts (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(200) NOT NULL,
  slug        VARCHAR(220) NOT NULL UNIQUE,
  excerpt     VARCHAR(300),
  body        LONGTEXT,
  cover_image VARCHAR(255),
  author_id   INT NULL,
  status      ENUM('draft','published') NOT NULL DEFAULT 'draft',
  published_at TIMESTAMP NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- Notifications (admin-facing, e.g. "new order", "low stock")
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  type        VARCHAR(40) NOT NULL,
  title       VARCHAR(150) NOT NULL,
  message     VARCHAR(255),
  link        VARCHAR(255),
  is_read     TINYINT(1) NOT NULL DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- Activity log (audit trail of admin actions)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS activity_logs (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  admin_id    INT NULL,
  admin_name  VARCHAR(100),
  action      VARCHAR(60) NOT NULL,
  entity      VARCHAR(60) NOT NULL,
  entity_id   VARCHAR(40),
  details     VARCHAR(255),
  ip_address  VARCHAR(45),
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- Settings — grouped key/value store (payment, shipping, tax,
-- SEO, general). Kept schemaless-ish so new settings don't need
-- migrations.
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
  setting_group VARCHAR(40) NOT NULL,
  setting_key   VARCHAR(60) NOT NULL,
  setting_value TEXT,
  PRIMARY KEY (setting_group, setting_key)
) ENGINE=InnoDB;

INSERT IGNORE INTO settings (setting_group, setting_key, setting_value) VALUES
  ('general', 'site_name', 'Spectrum Creations'),
  ('general', 'currency', 'PKR'),
  ('general', 'support_email', 'support@spectrumcreations.test'),
  ('general', 'timezone', 'Asia/Karachi'),
  ('payment', 'cod_enabled', '1'),
  ('payment', 'card_enabled', '0'),
  ('payment', 'card_provider', ''),
  ('payment', 'card_api_key', ''),
  ('shipping', 'flat_rate', '250'),
  ('shipping', 'free_shipping_threshold', '5000'),
  ('shipping', 'processing_days', '2'),
  ('tax', 'tax_enabled', '0'),
  ('tax', 'default_rate', '0'),
  ('seo', 'meta_title', 'Spectrum Creations — Art by Neurodiverse Artists'),
  ('seo', 'meta_description', 'Shop original art created by neurodiverse artists.'),
  ('seo', 'og_image', '');

-- ---------------------------------------------------------
-- Tax rates (region-based, referenced by the "tax" settings group)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS tax_rates (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  region      VARCHAR(100) NOT NULL,
  rate        DECIMAL(5,2) NOT NULL DEFAULT 0,
  status      ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- Email templates
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_templates (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  code        VARCHAR(60) NOT NULL UNIQUE,
  name        VARCHAR(120) NOT NULL,
  subject     VARCHAR(200) NOT NULL,
  body        LONGTEXT,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT IGNORE INTO email_templates (id, code, name, subject, body) VALUES
  (1, 'order_confirmation', 'Order Confirmation', 'Your Spectrum Creations order {{order_no}} is confirmed',
   'Hi {{customer_name}}, thanks for your order {{order_no}}! We are preparing it now.'),
  (2, 'order_shipped', 'Order Shipped', 'Your order {{order_no}} has shipped',
   'Hi {{customer_name}}, your order {{order_no}} is on its way.'),
  (3, 'welcome', 'Welcome Email', 'Welcome to Spectrum Creations',
   'Hi {{customer_name}}, welcome! Explore original art from neurodiverse artists.');

-- ---------------------------------------------------------
-- Media library
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS media (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  filename    VARCHAR(255) NOT NULL,
  path        VARCHAR(255) NOT NULL,
  mime_type   VARCHAR(100),
  size_bytes  INT,
  uploaded_by INT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (uploaded_by) REFERENCES admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Helpful indexes for search/filter/pagination performance
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_logs(created_at);
