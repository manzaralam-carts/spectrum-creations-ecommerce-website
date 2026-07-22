<?php
// ============================================================
// GET/POST/PUT/DELETE /api/categories.php — category CRUD.
// ============================================================
require_once __DIR__ . '/_bootstrap.php';
require_login();
$method = $_SERVER['REQUEST_METHOD'];

function slugify(string $s): string {
    $s = strtolower(trim($s));
    $s = preg_replace('/[^a-z0-9]+/', '-', $s);
    return trim($s, '-');
}

if ($method === 'GET' && isset($_GET['id'])) {
    $stmt = $pdo->prepare('SELECT * FROM categories WHERE id = :id');
    $stmt->execute([':id' => (int)$_GET['id']]);
    $row = $stmt->fetch();
    if (!$row) json_out(['error' => true, 'message' => 'Category not found'], 404);
    json_out(['error' => false, 'data' => $row]);
}

if ($method === 'GET') {
    [$page, $perPage, $offset] = pagination_params();
    $where = [];
    $params = [];
    if (!empty($_GET['q'])) {
        $where[] = 'name LIKE :q';
        $params[':q'] = '%' . $_GET['q'] . '%';
    }
    if (!empty($_GET['status'])) {
        $where[] = 'status = :status';
        $params[':status'] = $_GET['status'];
    }
    $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM categories $whereSql");
    $countStmt->execute($params);
    $total = (int)$countStmt->fetchColumn();

    $stmt = $pdo->prepare(
        "SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS product_count
         FROM categories c $whereSql ORDER BY sort_order ASC, name ASC LIMIT :limit OFFSET :offset"
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
    require_role('editor');
    $d = body_json();
    $err = require_fields($d, ['name']);
    if ($err) json_out(['error' => true, 'message' => $err], 422);
    $slug = !empty($d['slug']) ? slugify($d['slug']) : slugify($d['name']);

    $stmt = $pdo->prepare(
        'INSERT INTO categories (name, slug, description, parent_id, image, status, sort_order)
         VALUES (:name, :slug, :description, :parent_id, :image, :status, :sort_order)'
    );
    try {
        $stmt->execute([
            ':name' => $d['name'], ':slug' => $slug, ':description' => $d['description'] ?? '',
            ':parent_id' => $d['parent_id'] ?? null, ':image' => $d['image'] ?? '',
            ':status' => $d['status'] ?? 'active', ':sort_order' => (int)($d['sort_order'] ?? 0),
        ]);
    } catch (PDOException $e) {
        json_out(['error' => true, 'message' => 'A category with that slug already exists'], 409);
    }
    $id = (int)$pdo->lastInsertId();
    log_activity($pdo, 'create', 'category', $id, $d['name']);
    json_out(['error' => false, 'data' => ['id' => $id]], 201);
}

if ($method === 'PUT') {
    require_role('editor');
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) json_out(['error' => true, 'message' => 'Missing id'], 422);
    $d = body_json();
    $fields = ['name', 'slug', 'description', 'parent_id', 'image', 'status', 'sort_order'];
    $sets = []; $params = [':id' => $id];
    foreach ($fields as $f) {
        if (array_key_exists($f, $d)) { $sets[] = "$f = :$f"; $params[":$f"] = $d[$f]; }
    }
    if (empty($sets)) json_out(['error' => true, 'message' => 'Nothing to update'], 422);
    $stmt = $pdo->prepare('UPDATE categories SET ' . implode(', ', $sets) . ' WHERE id = :id');
    $stmt->execute($params);
    log_activity($pdo, 'update', 'category', $id);
    json_out(['error' => false, 'affected' => $stmt->rowCount()]);
}

if ($method === 'DELETE') {
    require_role('admin');
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) json_out(['error' => true, 'message' => 'Missing id'], 422);
    $stmt = $pdo->prepare('DELETE FROM categories WHERE id = :id');
    $stmt->execute([':id' => $id]);
    log_activity($pdo, 'delete', 'category', $id);
    json_out(['error' => false, 'affected' => $stmt->rowCount()]);
}

json_out(['error' => true, 'message' => 'Method not allowed'], 405);
