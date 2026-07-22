<?php
// ============================================================
// GET  /api/notifications.php                list + unread_count
// PUT  /api/notifications.php?id=5           mark one read
// POST /api/notifications.php?mark_all_read=1
// ============================================================
require_once __DIR__ . '/_bootstrap.php';
require_login();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST' && isset($_GET['mark_all_read'])) {
    $pdo->exec('UPDATE notifications SET is_read = 1 WHERE is_read = 0');
    json_out(['error' => false]);
}

if ($method === 'GET') {
    [$page, $perPage, $offset] = pagination_params();
    $where = ''; $params = [];
    if (isset($_GET['unread']) && $_GET['unread'] === '1') $where = 'WHERE is_read = 0';

    $unreadCount = (int)$pdo->query('SELECT COUNT(*) FROM notifications WHERE is_read = 0')->fetchColumn();
    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM notifications $where");
    $countStmt->execute($params);
    $total = (int)$countStmt->fetchColumn();

    $stmt = $pdo->prepare("SELECT * FROM notifications $where ORDER BY created_at DESC LIMIT :limit OFFSET :offset");
    $stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();

    json_out(['error' => false, 'data' => $stmt->fetchAll(), 'unread_count' => $unreadCount, 'meta' => [
        'page' => $page, 'per_page' => $perPage, 'total' => $total, 'total_pages' => (int)ceil($total / max(1,$perPage)),
    ]]);
}

if ($method === 'PUT') {
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) json_out(['error' => true, 'message' => 'Missing id'], 422);
    $stmt = $pdo->prepare('UPDATE notifications SET is_read = 1 WHERE id = :id');
    $stmt->execute([':id' => $id]);
    json_out(['error' => false, 'affected' => $stmt->rowCount()]);
}

json_out(['error' => true, 'message' => 'Method not allowed'], 405);
