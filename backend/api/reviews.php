<?php
// ============================================================
// GET    /api/reviews.php                 list (filter by status/product)
// PUT    /api/reviews.php?id=5             { status: approved|rejected }
// DELETE /api/reviews.php?id=5
// POST   /api/reviews.php?bulk=1           { ids:[], action }
// ============================================================
require_once __DIR__ . '/_bootstrap.php';
require_login();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST' && isset($_GET['bulk'])) {
    require_role('manager');
    $d = body_json();
    $ids = array_filter(array_map('intval', $d['ids'] ?? []));
    $action = $d['action'] ?? '';
    if (empty($ids)) json_out(['error' => true, 'message' => 'No ids provided'], 422);
    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    if ($action === 'delete') {
        $stmt = $pdo->prepare("DELETE FROM reviews WHERE id IN ($placeholders)");
        $stmt->execute($ids);
    } elseif (in_array($action, ['approved', 'rejected', 'pending'], true)) {
        $stmt = $pdo->prepare("UPDATE reviews SET status = ? WHERE id IN ($placeholders)");
        $stmt->execute(array_merge([$action], $ids));
    } else {
        json_out(['error' => true, 'message' => 'Unsupported action'], 422);
    }
    log_activity($pdo, "bulk_$action", 'review', implode(',', $ids));
    json_out(['error' => false, 'affected' => $stmt->rowCount()]);
}

if ($method === 'GET') {
    [$page, $perPage, $offset] = pagination_params();
    $where = []; $params = [];
    if (!empty($_GET['status'])) { $where[] = 'r.status = :status'; $params[':status'] = $_GET['status']; }
    if (!empty($_GET['product_id'])) { $where[] = 'r.product_id = :pid'; $params[':pid'] = (int)$_GET['product_id']; }
    if (!empty($_GET['q'])) { $where[] = '(r.customer_name LIKE :q OR r.comment LIKE :q)'; $params[':q'] = '%'.$_GET['q'].'%'; }
    $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM reviews r $whereSql");
    $countStmt->execute($params);
    $total = (int)$countStmt->fetchColumn();

    $stmt = $pdo->prepare(
        "SELECT r.*, p.name AS product_name FROM reviews r
         LEFT JOIN products p ON p.id = r.product_id
         $whereSql ORDER BY r.created_at DESC LIMIT :limit OFFSET :offset"
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
    if (!$id || !in_array($status, ['pending', 'approved', 'rejected'], true)) {
        json_out(['error' => true, 'message' => 'Invalid status'], 422);
    }
    $stmt = $pdo->prepare('UPDATE reviews SET status = :status WHERE id = :id');
    $stmt->execute([':status' => $status, ':id' => $id]);
    log_activity($pdo, 'moderate', 'review', $id, $status);
    json_out(['error' => false, 'affected' => $stmt->rowCount()]);
}

if ($method === 'DELETE') {
    require_role('manager');
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) json_out(['error' => true, 'message' => 'Missing id'], 422);
    $stmt = $pdo->prepare('DELETE FROM reviews WHERE id = :id');
    $stmt->execute([':id' => $id]);
    log_activity($pdo, 'delete', 'review', $id);
    json_out(['error' => false, 'affected' => $stmt->rowCount()]);
}

json_out(['error' => true, 'message' => 'Method not allowed'], 405);
