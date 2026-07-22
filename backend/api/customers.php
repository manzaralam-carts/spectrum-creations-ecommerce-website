<?php
// ============================================================
// GET /api/customers.php — customers aggregated from the orders
// table (the storefront has no account system, so "customer" =
// a distinct name+mobile pair that has placed at least one order).
// GET /api/customers.php?mobile=03001234567 — one customer's orders
// ============================================================
require_once __DIR__ . '/_bootstrap.php';
require_login();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_out(['error' => true, 'message' => 'Method not allowed'], 405);
}

if (!empty($_GET['mobile'])) {
    $stmt = $pdo->prepare(
        'SELECT id, order_no, total, status, created_at FROM orders WHERE mobile = :m ORDER BY created_at DESC'
    );
    $stmt->execute([':m' => $_GET['mobile']]);
    json_out(['error' => false, 'data' => $stmt->fetchAll()]);
}

[$page, $perPage, $offset] = pagination_params();
$where = '';
$params = [];
if (!empty($_GET['q'])) {
    $where = 'HAVING customer_name LIKE :q OR mobile LIKE :q';
    $params[':q'] = '%' . $_GET['q'] . '%';
}

$countStmt = $pdo->prepare(
    "SELECT COUNT(*) FROM (
        SELECT mobile FROM orders GROUP BY mobile, customer_name $where
     ) t"
);
$countStmt->execute($params);
$total = (int)$countStmt->fetchColumn();

$stmt = $pdo->prepare(
    "SELECT customer_name, mobile, COUNT(*) AS order_count, SUM(total) AS lifetime_value,
            MAX(created_at) AS last_order_at, MIN(created_at) AS first_order_at
     FROM orders
     GROUP BY mobile, customer_name
     $where
     ORDER BY lifetime_value DESC
     LIMIT :limit OFFSET :offset"
);
foreach ($params as $k => $v) $stmt->bindValue($k, $v);
$stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
$stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
$stmt->execute();

json_out(['error' => false, 'data' => $stmt->fetchAll(), 'meta' => [
    'page' => $page, 'per_page' => $perPage, 'total' => $total, 'total_pages' => (int)ceil($total / max(1,$perPage)),
]]);
