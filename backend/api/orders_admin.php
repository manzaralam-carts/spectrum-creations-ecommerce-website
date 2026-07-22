<?php
// ============================================================
// GET  /api/orders_admin.php                list (search/filter/paginate)
// GET  /api/orders_admin.php?id=5            single order + items
// PUT  /api/orders_admin.php?id=5            { status }
// POST /api/orders_admin.php?bulk=1          { ids:[], status }
// ============================================================
require_once __DIR__ . '/_bootstrap.php';
require_login();
$method = $_SERVER['REQUEST_METHOD'];
$validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

if ($method === 'POST' && isset($_GET['bulk'])) {
    require_role('manager');
    $d = body_json();
    $ids = array_filter(array_map('intval', $d['ids'] ?? []));
    $status = $d['status'] ?? '';
    if (empty($ids) || !in_array($status, $validStatuses, true)) {
        json_out(['error' => true, 'message' => 'Invalid bulk request'], 422);
    }
    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $stmt = $pdo->prepare("UPDATE orders SET status = ? WHERE id IN ($placeholders)");
    $stmt->execute(array_merge([$status], $ids));
    log_activity($pdo, 'bulk_status_update', 'order', implode(',', $ids), $status);
    json_out(['error' => false, 'affected' => $stmt->rowCount()]);
}

if ($method === 'GET' && isset($_GET['id'])) {
    $stmt = $pdo->prepare('SELECT * FROM orders WHERE id = :id');
    $stmt->execute([':id' => (int)$_GET['id']]);
    $order = $stmt->fetch();
    if (!$order) json_out(['error' => true, 'message' => 'Order not found'], 404);
    $items = $pdo->prepare('SELECT * FROM order_items WHERE order_id = :id');
    $items->execute([':id' => $order['id']]);
    $order['items'] = $items->fetchAll();
    json_out(['error' => false, 'data' => $order]);
}

if ($method === 'GET') {
    [$page, $perPage, $offset] = pagination_params();
    $where = []; $params = [];
    if (!empty($_GET['q'])) {
        $where[] = '(customer_name LIKE :q OR order_no LIKE :q OR mobile LIKE :q)';
        $params[':q'] = '%' . $_GET['q'] . '%';
    }
    if (!empty($_GET['status'])) { $where[] = 'status = :status'; $params[':status'] = $_GET['status']; }
    if (!empty($_GET['payment_method'])) { $where[] = 'payment_method = :pm'; $params[':pm'] = $_GET['payment_method']; }
    if (!empty($_GET['date_from'])) { $where[] = 'created_at >= :date_from'; $params[':date_from'] = $_GET['date_from'] . ' 00:00:00'; }
    if (!empty($_GET['date_to'])) { $where[] = 'created_at <= :date_to'; $params[':date_to'] = $_GET['date_to'] . ' 23:59:59'; }
    $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM orders $whereSql");
    $countStmt->execute($params);
    $total = (int)$countStmt->fetchColumn();

    $stmt = $pdo->prepare(
        "SELECT * FROM orders $whereSql ORDER BY created_at DESC LIMIT :limit OFFSET :offset"
    );
    foreach ($params as $k => $v) $stmt->bindValue($k, $v);
    $stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();

    json_out(['error' => false, 'data' => $stmt->fetchAll(), 'meta' => [
        'page' => $page, 'per_page' => $perPage, 'total' => $total, 'total_pages' => (int)ceil($total / max(1,$perPage)),
    ]]);
}

if ($method === 'PUT') {
    require_role('editor');
    $id = (int)($_GET['id'] ?? 0);
    $d = body_json();
    $status = $d['status'] ?? '';
    if (!$id || !in_array($status, $validStatuses, true)) {
        json_out(['error' => true, 'message' => 'Invalid status'], 422);
    }
    $stmt = $pdo->prepare('UPDATE orders SET status = :status WHERE id = :id');
    $stmt->execute([':status' => $status, ':id' => $id]);
    log_activity($pdo, 'update_status', 'order', $id, $status);
    json_out(['error' => false, 'affected' => $stmt->rowCount()]);
}

json_out(['error' => true, 'message' => 'Method not allowed'], 405);
