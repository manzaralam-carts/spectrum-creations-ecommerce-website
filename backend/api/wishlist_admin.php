<?php
// ============================================================
// GET /api/wishlist_admin.php — which products are most wishlisted
// across anonymous storefront visitors (read-only; the wishlist
// table itself is written by the public wishlist.php endpoint).
// ============================================================
require_once __DIR__ . '/_bootstrap.php';
require_login();
if ($_SERVER['REQUEST_METHOD'] !== 'GET') json_out(['error' => true, 'message' => 'Method not allowed'], 405);

[$page, $perPage, $offset] = pagination_params();

$countStmt = $pdo->query('SELECT COUNT(DISTINCT product_id) FROM wishlist');
$total = (int)$countStmt->fetchColumn();

$stmt = $pdo->prepare(
    "SELECT w.product_id, p.name AS product_name, p.image, p.price, p.stock,
            COUNT(*) AS wishlist_count
     FROM wishlist w
     LEFT JOIN products p ON p.id = w.product_id
     GROUP BY w.product_id, p.name, p.image, p.price, p.stock
     ORDER BY wishlist_count DESC
     LIMIT :limit OFFSET :offset"
);
$stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
$stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
$stmt->execute();

json_out(['error' => false, 'data' => $stmt->fetchAll(), 'meta' => [
    'page' => $page, 'per_page' => $perPage, 'total' => $total, 'total_pages' => (int)ceil($total / max(1,$perPage)),
]]);
