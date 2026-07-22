# Spectrum Creations — Admin CMS

A full admin panel for the storefront, built on top of the existing
`backend/` (PHP + MySQL) from the earlier zip. Nothing in the original
`products.php`, `order.php`, `wishlist.php`, `config.php`, or the
storefront `index.html`/`style.css` was changed — this only **adds**
new files alongside them.

## What's included

**Dashboard** — revenue, orders, low stock, 14-day sales trend, top products, order status breakdown, recent orders.

**Catalog** — Products (CRUD, search/filter/sort/pagination/bulk actions), Categories (CRUD, nested via `parent_id`), Inventory (dedicated stock-adjustment view).

**Sales** — Orders (search/filter by status/date, status workflow, bulk status update, itemized detail view), Customers (aggregated from order history — see note below), Vendors (CRUD), Coupons (percent/fixed, usage limits, expiry).

**Content** — Reviews (approve/reject/bulk moderate), Wishlist (read-only insight into what's most-wishlisted), Banners (CRUD, position + scheduling), Blog (CRUD, draft/publish).

**Insights** — Reports: sales (date-range, CSV export), inventory (low/out-of-stock, inventory value), customers (top spenders, new vs. returning).

**System** — Notifications, Users & Roles (RBAC), Media Library (secure upload), Payment & Shipping settings, Taxes (global + regional rates), SEO defaults, Email Templates, Backups (JSON export), Activity Logs (audit trail), System Settings.

## Setup

1. **Run the schema.** In phpMyAdmin (or `mysql` CLI), run `schema.sql` first if you haven't already (from the original zip), then run **`backend/schema_admin.sql`**. It only adds new tables and a few nullable columns on `products` — it won't touch your existing data.
   - Requires MySQL 8.0.29+ or MariaDB 10.3+ for the `IF NOT EXISTS` clauses on `ALTER TABLE`/`CREATE INDEX`. If your host is older, open the file and drop those two words — the statements still work, they just won't be safely re-runnable.
2. **Drop the folders in.** Copy `backend/` (merging into your existing one) and `admin/` into your project root, so you have:
   ```
   your-project/
     backend/
       config.php          (existing)
       .htaccess           (existing, extended)
       schema.sql          (existing)
       schema_admin.sql    (new)
       api/
         products.php ...  (existing, public storefront API)
         products_admin.php, orders_admin.php, ...  (new, admin API)
       tools/hash_password.php
     admin/
       login.html
       index.html
       assets/...
       uploads/media/
     index.html            (existing storefront)
     style.css             (existing storefront)
   ```
3. **Sign in.** Visit `your-project/admin/login.html`.
   - Email: `admin@spectrumcreations.test`
   - Password: `Admin@12345`
   - **Change this immediately** from Users & Roles → edit your account → set a new password. The seed hash is public (it's in this README's git history the moment you commit it), so treat it as a placeholder, not a real credential.

## Architecture notes

- **Auth**: PHP sessions, `httpOnly` + `SameSite=Lax` cookies, `password_hash()`/`password_verify()` (bcrypt), session regeneration on login, light in-session rate limiting on failed attempts. Turn on `'secure' => true` in `backend/api/_bootstrap.php` once you're serving over HTTPS.
- **Roles are a simple 4-tier ladder** (`viewer < editor < manager < admin`), not a granular permissions table. That's a deliberate scope cut: it covers "who can view vs. edit vs. delete vs. touch money/credentials" without a permissions-matrix UI. See the capability table on the Users & Roles page. If you outgrow it, swap `ROLE_RANK` checks in `_bootstrap.php` for a real `permissions` join table — every endpoint already funnels through `require_role()`, so it's a single-point change.
- **Generic CRUD engine**: six of the simpler modules (vendors, coupons, banners, blog, tax rates, email templates) share one backend engine (`backend/api/_crud.php`) and one frontend engine (`CrudView` in `admin/assets/js/app.js`) instead of duplicating list/create/edit/delete/bulk logic six times. Products, orders, categories, reviews, and customers have their own endpoints because they need custom joins or workflows a generic engine can't express cleanly.
- **Customers aren't a real accounts table.** The storefront has no login system — `order.php` just takes a name/mobile/address. So "customers" in the admin panel are orders grouped by name+mobile. If you add real customer accounts later, `customers.php` is the only file that needs to change.
- **Media uploads** are re-validated server-side by actual file bytes (`finfo`, not the extension or client MIME header), capped at 5MB, renamed to random filenames on disk, and the `uploads/` folder has its own `.htaccess` disabling PHP execution — so even a disguised upload can't run as a script.
- **Backups** export as JSON via PHP (not `mysqldump`), so it works on shared hosting with no shell access.
- **Activity log**: every create/update/delete/login/export writes a row, viewable (and searchable) on the Activity Logs page — manager role and up.

## Known simplifications (by design, given scope)

- No email actually gets sent — Email Templates just stores/edits the content; wiring it to an SMTP/API provider is a small addition to `order.php` (call it when an order's status changes) once you pick a provider.
- No payment gateway is actually integrated — the Payment settings page stores which one you intend to use and its API key; wiring the storefront checkout to it depends on which gateway you pick (Stripe vs. PayFast vs. JazzCash all differ enough that guessing would've meant throwaway code).
- Tax is stored and displayed but not yet applied to order totals in `order.php` — add a lookup against `tax_rates` there once you decide the calculation should live server-side vs. at checkout.

## If something doesn't load

- **Login fails immediately**: confirm `schema_admin.sql` ran (check `admin_users` has a row) and that `backend/config.php` has the right DB credentials.
- **"Cannot reach the backend"**: the admin panel calls `../backend/api/...` relative to `admin/index.html` — keep the two folders as siblings, don't move `admin/` elsewhere without updating `API_BASE` in `admin/assets/js/api.js`.
- **500 error on the whole `backend/` folder** after adding the new `.htaccess` rule: same caveat as the original — delete the added `<FilesMatch "^_.*\.php$">` block if your host's Apache doesn't support it.
