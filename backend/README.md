# Backend setup (MySQL + PHP)

This folder is a small REST API that gives the storefront a real database
for products/stock, orders, and wishlists. The frontend already talks to
it — if it can't reach this backend, it just keeps working the way it did
before (client-only), so nothing breaks while you're setting this up.

## What's here

```
your-project/
  index.html
  style.css
  images/               <- your existing product images
  backend/
    schema.sql          <- run once to create the database + tables + seed data
    config.php          <- DB credentials (edit this)
    .htaccess           <- blocks direct browser access to config.php/schema.sql
    api/
      products.php       GET  backend/api/products.php
      order.php           POST backend/api/order.php
      wishlist.php        GET/POST/DELETE backend/api/wishlist.php
```

`backend/` must sit in the **same folder** as `index.html` — the frontend
calls it using a relative path (`backend/api/...`), so this works whether
the site lives at your domain root or in a subfolder.

---

## Running it locally (XAMPP) — step by step

This is the easiest way to test everything on your own computer before
uploading anywhere.

**1. Install XAMPP** (if you don't have it): https://www.apachefriends.org
   — includes Apache, PHP, and MySQL/MariaDB in one installer.

**2. Start Apache and MySQL** from the XAMPP Control Panel — click
   "Start" next to both.

**3. Copy your whole project folder** into XAMPP's web root:
   - Windows: `C:\xampp\htdocs\mystore\`
   - macOS: `/Applications/XAMPP/htdocs/mystore/`
   - Linux: `/opt/lampp/htdocs/mystore/`

   So you end up with `.../htdocs/mystore/index.html`,
   `.../htdocs/mystore/backend/`, etc. (you can name the folder anything,
   `mystore` is just an example).

**4. Create the database.** Open **http://localhost/phpmyadmin** in your
   browser → click the **Import** tab → **Choose file** → select
   `backend/schema.sql` → click **Go** at the bottom.

   That single import creates the `ecommerce_db` database, all four
   tables, and seeds `products` with the 35 items already on your
   storefront.

**5. Check `backend/config.php`.** XAMPP's MySQL defaults are already
   what the file ships with, so **you usually don't need to change
   anything**:
   ```php
   define('DB_HOST', 'localhost');
   define('DB_NAME', 'ecommerce_db');
   define('DB_USER', 'root');
   define('DB_PASS', '');   // XAMPP's root user has no password by default
   ```
   Only edit this if your MySQL setup uses a different username/password.

**6. Open the site through Apache, not by double-clicking the file:**
   ```
   http://localhost/mystore/index.html
   ```
   Opening `index.html` directly from your file system (`file://...`)
   will **not** work — the backend calls need a real server behind them.

**7. Confirm it's connected.** Open DevTools (F12) → Console tab. You
   should *not* see `"Backend not reachable"` warnings. Add something to
   your wishlist or place a test order, then check phpMyAdmin →
   `ecommerce_db` → `wishlist` / `orders` tables — your action should
   show up there.

That's it — products now show real DB stock, wishlists sync to MySQL,
and orders are written (and stock decremented) server-side.

---

## Deploying to real hosting (cPanel / shared hosting / a VPS)

Same idea as above, just on your host instead of XAMPP:

1. Upload the whole project (including `backend/`) via FTP or your
   host's File Manager, into `public_html/` (or a subfolder of it).
2. In your host's phpMyAdmin, **Import** `backend/schema.sql` the same
   way as step 4 above.
3. Edit `backend/config.php` with the DB name/username/password your
   host gave you (shared hosts almost never use `root`/blank password —
   you'll have created a specific database user in cPanel's "MySQL
   Databases" section).
4. Visit your domain — no other changes needed.

Any host with PHP + the `pdo_mysql` extension works — that's enabled by
default on essentially every PHP host.

---

## Already imported schema.sql before? Run this migration

If you set up the database before this update, it won't have the
`payment_method` column (used for Cash on Delivery). Run this once in
phpMyAdmin's **SQL** tab (or `mysql -u root -p ecommerce_db`):

```sql
ALTER TABLE orders
  ADD COLUMN payment_method VARCHAR(20) NOT NULL DEFAULT 'cod' AFTER address_tag;
```

If you're setting the database up fresh, `schema.sql` already includes
this column — no migration needed.

## Fixing the price gap in the seed data

28 of the 35 seeded products have `price = 0`. That's because the site's
own HTML never set a price for those product cards — a pre-existing gap,
not something this backend introduced. Fix it either:
- directly in phpMyAdmin → `ecommerce_db` → `products` table → edit the
  `price` column, or
- by adding `data-price="1234"` to those product cards in `index.html`
  and re-importing `schema.sql` (re-importing will overwrite any manual
  price edits, since the seed script uses `ON DUPLICATE KEY UPDATE`).

---

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| Console shows `"Backend not reachable"` | You opened the file directly (`file://…`) instead of through `http://localhost/...` — or Apache/MySQL isn't running in XAMPP's Control Panel. |
| `products.php` returns a blank page or HTTP 500 | Check `backend/config.php` credentials match your MySQL setup. Check XAMPP's PHP error log (`xampp/php/logs/php_error_log`) for the exact error. |
| `"Database connection failed"` in the browser | Wrong `DB_USER`/`DB_PASS`/`DB_NAME` in `config.php`, or MySQL isn't running. |
| Visiting `backend/api/products.php` directly shows nothing visible | That's fine if there's no error — plain-text `{"error":false,"data":[...]}` with a 200 status is correct. A blank *white* page with nothing at all usually means a PHP fatal error — check the error log. |
| Orders aren't appearing in the `orders` table | Open DevTools → Network tab → find the `order.php` request → check its response. A `409` means a real validation/stock message (shown to you as an alert) — that's the backend working correctly, just rejecting that specific order. |
| 403 Forbidden when visiting `config.php` or `schema.sql` directly | That's intentional — `.htaccess` blocks direct browser access to those files. PHP scripts can still read `config.php` internally; this only blocks people from viewing it in a browser. |
| **Everything looks fine but nothing ever saves to the database** (this bit us during development — see below) | The whole `backend/` folder returns HTTP 500 on *every* request, including the working PHP files, because of a broken `.htaccess`. Some older Apache setups (2.2, or missing `mod_authz_core`) reject the syntax in `.htaccess`. **Try deleting `backend/.htaccess` entirely** and reload — if the site starts talking to the database, that confirms it and you can leave it deleted (you just lose the "hide config.php/schema.sql from direct browser access" protection, which isn't critical). |
| A yellow banner appears at the top of the site saying the database isn't connected | That's the new connection-status notice — it only ever shows when `backend/api/products.php` isn't reachable, and it tells you exactly which of the cases above is happening. Open the browser console (F12) for the full detail behind it. |

---

## What's actually stored where

| Data | Source of truth |
|---|---|
| Product **price** & **stock** | MySQL (`products` table) — the frontend fetches these on load and overrides whatever it guessed from the HTML |
| Product **name/image/description** | Still comes from the page's own HTML (the database only tracks price + stock for now) |
| **Orders** | Written to MySQL (`orders` + `order_items`) with a real stock-decrementing transaction — two people can't oversell the same last item |
| **Wishlist** | Synced to MySQL (`wishlist` table), keyed by an anonymous `device_id` generated in the browser's `localStorage` (there's no login system on this site, so this is "this browser's wishlist," not a real user account) |
| **Cart** | Still purely `localStorage` — carts are cheap/disposable, no reason to round-trip them to the server before checkout |
| Province / City / Area | Unchanged — still the OpenStreetMap / CountriesNow lookups from before, not part of this database |

## Notes on the order flow

`order.php` re-validates everything server-side (name, phone format,
address length, stock availability) — it does not trust the client's
validation, since that's easy to bypass. If stock ran out between the
page loading and checkout, it returns a 409 with a clear message instead
of silently overselling, and the frontend shows that message and
refreshes the product list rather than pretending the order succeeded.
