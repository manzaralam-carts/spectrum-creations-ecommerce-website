<?php
// ============================================================
// GET /api/backup.php?download=1 — downloads a JSON snapshot of
// every table. Portable across any host (no shell/mysqldump
// access needed on shared hosting). Admin-only: this is a full
// data export, including customer names/addresses.
// ============================================================
require_once __DIR__ . '/_bootstrap.php';
require_role('admin');
if ($_SERVER['REQUEST_METHOD'] !== 'GET') json_out(['error' => true, 'message' => 'Method not allowed'], 405);

$tables = [
    'products', 'orders', 'order_items', 'wishlist', 'categories', 'vendors', 'coupons',
    'reviews', 'banners', 'blog_posts', 'tax_rates', 'email_templates', 'settings',
];

$snapshot = ['generated_at' => date('c'), 'tables' => []];
foreach ($tables as $t) {
    try {
        $snapshot['tables'][$t] = $pdo->query("SELECT * FROM `$t`")->fetchAll();
    } catch (Throwable $e) {
        $snapshot['tables'][$t] = [];
    }
}

log_activity($pdo, 'export', 'backup', null, 'full data snapshot');

if (isset($_GET['download'])) {
    $filename = 'backup-' . date('Y-m-d-His') . '.json';
    header('Content-Type: application/json');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    echo json_encode($snapshot, JSON_PRETTY_PRINT);
    exit();
}

json_out(['error' => false, 'data' => $snapshot]);
