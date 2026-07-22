<?php
// ============================================================
// Admin user management — admin role only.
// GET    /api/users.php                list
// POST   /api/users.php                create { name, email, password, role }
// PUT    /api/users.php?id=5           update { name, role, status, password? }
// DELETE /api/users.php?id=5
// ============================================================
require_once __DIR__ . '/_bootstrap.php';
$me = require_role('admin');
$method = $_SERVER['REQUEST_METHOD'];
$validRoles = ['admin', 'manager', 'editor', 'viewer'];

if ($method === 'GET') {
    [$page, $perPage, $offset] = pagination_params();
    $where = ''; $params = [];
    if (!empty($_GET['q'])) { $where = 'WHERE name LIKE :q OR email LIKE :q'; $params[':q'] = '%'.$_GET['q'].'%'; }

    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM admin_users $where");
    $countStmt->execute($params);
    $total = (int)$countStmt->fetchColumn();

    $stmt = $pdo->prepare(
        "SELECT id, name, email, role, status, last_login_at, created_at FROM admin_users
         $where ORDER BY created_at DESC LIMIT :limit OFFSET :offset"
    );
    foreach ($params as $k => $v) $stmt->bindValue($k, $v);
    $stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();

    json_out(['error' => false, 'data' => $stmt->fetchAll(), 'meta' => [
        'page' => $page, 'per_page' => $perPage, 'total' => $total, 'total_pages' => (int)ceil($total / max(1,$perPage)),
    ]]);
}

if ($method === 'POST') {
    $d = body_json();
    $err = require_fields($d, ['name', 'email', 'password', 'role']);
    if ($err) json_out(['error' => true, 'message' => $err], 422);
    if (!filter_var($d['email'], FILTER_VALIDATE_EMAIL)) json_out(['error' => true, 'message' => 'Invalid email'], 422);
    if (strlen($d['password']) < 8) json_out(['error' => true, 'message' => 'Password must be at least 8 characters'], 422);
    if (!in_array($d['role'], $validRoles, true)) json_out(['error' => true, 'message' => 'Invalid role'], 422);

    $stmt = $pdo->prepare(
        'INSERT INTO admin_users (name, email, password_hash, role) VALUES (:name, :email, :hash, :role)'
    );
    try {
        $stmt->execute([
            ':name' => $d['name'], ':email' => $d['email'],
            ':hash' => password_hash($d['password'], PASSWORD_DEFAULT), ':role' => $d['role'],
        ]);
    } catch (PDOException $e) {
        json_out(['error' => true, 'message' => 'A user with that email already exists'], 409);
    }
    $id = (int)$pdo->lastInsertId();
    log_activity($pdo, 'create', 'admin_user', $id, $d['email']);
    json_out(['error' => false, 'data' => ['id' => $id]], 201);
}

if ($method === 'PUT') {
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) json_out(['error' => true, 'message' => 'Missing id'], 422);
    $d = body_json();

    $sets = []; $params = [':id' => $id];
    if (isset($d['name'])) { $sets[] = 'name = :name'; $params[':name'] = $d['name']; }
    if (isset($d['role']) && in_array($d['role'], $validRoles, true)) { $sets[] = 'role = :role'; $params[':role'] = $d['role']; }
    if (isset($d['status']) && in_array($d['status'], ['active', 'suspended'], true)) {
        if ($id === $me['id'] && $d['status'] === 'suspended') {
            json_out(['error' => true, 'message' => 'You cannot suspend your own account'], 422);
        }
        $sets[] = 'status = :status'; $params[':status'] = $d['status'];
    }
    if (!empty($d['password'])) {
        if (strlen($d['password']) < 8) json_out(['error' => true, 'message' => 'Password must be at least 8 characters'], 422);
        $sets[] = 'password_hash = :hash'; $params[':hash'] = password_hash($d['password'], PASSWORD_DEFAULT);
    }
    if (empty($sets)) json_out(['error' => true, 'message' => 'Nothing to update'], 422);

    $stmt = $pdo->prepare('UPDATE admin_users SET ' . implode(', ', $sets) . ' WHERE id = :id');
    $stmt->execute($params);
    log_activity($pdo, 'update', 'admin_user', $id);
    json_out(['error' => false, 'affected' => $stmt->rowCount()]);
}

if ($method === 'DELETE') {
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) json_out(['error' => true, 'message' => 'Missing id'], 422);
    if ($id === $me['id']) json_out(['error' => true, 'message' => 'You cannot delete your own account'], 422);
    $stmt = $pdo->prepare('DELETE FROM admin_users WHERE id = :id');
    $stmt->execute([':id' => $id]);
    log_activity($pdo, 'delete', 'admin_user', $id);
    json_out(['error' => false, 'affected' => $stmt->rowCount()]);
}

json_out(['error' => true, 'message' => 'Method not allowed'], 405);
