<?php
// GET /api/activity_logs.php — read-only audit trail, filterable.
require_once __DIR__ . '/_bootstrap.php';
require_role('manager');
if ($_SERVER['REQUEST_METHOD'] !== 'GET') json_out(['error' => true, 'message' => 'Method not allowed'], 405);

[$page, $perPage, $offset] = pagination_params();
$where = []; $params = [];
if (!empty($_GET['entity'])) { $where[] = 'entity = :entity'; $params[':entity'] = $_GET['entity']; }
if (!empty($_GET['admin_id'])) { $where[] = 'admin_id = :aid'; $params[':aid'] = (int)$_GET['admin_id']; }
if (!empty($_GET['q'])) { $where[] = '(admin_name LIKE :q OR action LIKE :q OR details LIKE :q)'; $params[':q'] = '%'.$_GET['q'].'%'; }
$whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

$countStmt = $pdo->prepare("SELECT COUNT(*) FROM activity_logs $whereSql");
$countStmt->execute($params);
$total = (int)$countStmt->fetchColumn();

$stmt = $pdo->prepare("SELECT * FROM activity_logs $whereSql ORDER BY created_at DESC LIMIT :limit OFFSET :offset");
foreach ($params as $k => $v) $stmt->bindValue($k, $v);
$stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
$stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
$stmt->execute();

json_out(['error' => false, 'data' => $stmt->fetchAll(), 'meta' => [
    'page' => $page, 'per_page' => $perPage, 'total' => $total, 'total_pages' => (int)ceil($total / max(1,$perPage)),
]]);
