<?php
// ============================================================
// GET    /api/products_admin.php                 list (search/filter/paginate)
// GET    /api/products_admin.php?id=5             single product
// POST   /api/products_admin.php                  create
// PUT    /api/products_admin.php?id=5              update
// DELETE /api/products_admin.php?id=5              delete
// POST   /api/products_admin.php?bulk=1            { ids:[], action:'delete'|'activate'|'archive' }
// ============================================================
require_once __DIR__ . '/_bootstrap.php';
$admin = require_login();
$method = $_SERVER['REQUEST_METHOD'];

// ---- Bulk actions -------------------------------------------------
if ($method === 'POST' && isset($_GET['bulk'])) {
    require_role('manager');
    $data = body_json();
    $ids = array_filter(array_map('intval', $data['ids'] ?? []));
    $action = $data['action'] ?? '';
    if (empty($ids) || !in_array($action, ['delete', 'activate', 'draft', 'archive'], true)) {
        json_out(['error' => true, 'message' => 'Invalid bulk request'], 422);
    }
    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    if ($action === 'delete') {
        require_role('admin');
        $stmt = $pdo->prepare("DELETE FROM products WHERE id IN ($placeholders)");
    } else {
        $status = $action === 'activate' ? 'active' : $action;
        $stmt = $pdo->prepare("UPDATE products SET status = ? WHERE id IN ($placeholders)");
        array_unshift($ids, $status);
    }
    $stmt->execute($ids);
    log_activity($pdo, "bulk_$action", 'product', implode(',', $ids));
    json_out(['error' => false, 'affected' => $stmt->rowCount()]);
}

// ---- Single item ----------------------------------------------------
if ($method === 'GET' && isset($_GET['id'])) {
    $stmt = $pdo->prepare(
        'SELECT p.*, c.name AS category_name, v.name AS vendor_name
         FROM products p
         LEFT JOIN categories c ON c.id = p.category_id
         LEFT JOIN vendors v ON v.id = p.vendor_id
         WHERE p.id = :id'
    );
    $stmt->execute([':id' => (int)$_GET['id']]);
    $product = $stmt->fetch();
    if (!$product) json_out(['error' => true, 'message' => 'Product not found'], 404);
    json_out(['error' => false, 'data' => $product]);
}

// ---- List (search/filter/sort/paginate) ------------------------------
if ($method === 'GET') {
    [$page, $perPage, $offset] = pagination_params();
    $where = [];
    $params = [];

    if (!empty($_GET['q'])) {
        $where[] = '(p.name LIKE :q OR p.sku LIKE :q)';
        $params[':q'] = '%' . $_GET['q'] . '%';
    }
    if (!empty($_GET['category_id'])) {
        $where[] = 'p.category_id = :category_id';
        $params[':category_id'] = (int)$_GET['category_id'];
    }
    if (!empty($_GET['status'])) {
        $where[] = 'p.status = :status';
        $params[':status'] = $_GET['status'];
    }
    if (!empty($_GET['stock']) && $_GET['stock'] === 'low') {
        $where[] = 'p.stock <= p.low_stock_threshold';
    }
    $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

    $allowedSort = ['name', 'price', 'stock', 'created_at'];
    $sort = in_array($_GET['sort'] ?? '', $allowedSort, true) ? $_GET['sort'] : 'created_at';
    $dir = (($_GET['dir'] ?? 'desc') === 'asc') ? 'ASC' : 'DESC';

    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM products p $whereSql");
    $countStmt->execute($params);
    $total = (int)$countStmt->fetchColumn();

    $stmt = $pdo->prepare(
        "SELECT p.*, c.name AS category_name
         FROM products p LEFT JOIN categories c ON c.id = p.category_id
         $whereSql ORDER BY p.$sort $dir LIMIT :limit OFFSET :offset"
    );
    foreach ($params as $k => $v) $stmt->bindValue($k, $v);
    $stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();

    json_out(['error' => false, 'data' => $stmt->fetchAll(), 'meta' => [
        'page' => $page, 'per_page' => $perPage, 'total' => $total, 'total_pages' => (int)ceil($total / $perPage),
    ]]);
}

// ---- Create -----------------------------------------------------------
if ($method === 'POST') {
    require_role('editor');
    $d = body_json();
    $err = require_fields($d, ['name', 'price']);
    if ($err) json_out(['error' => true, 'message' => $err], 422);

    $stmt = $pdo->prepare(
        'INSERT INTO products (id, name, description, category_id, vendor_id, sku, price, image, stock, status, low_stock_threshold)
         VALUES (:id, :name, :description, :category_id, :vendor_id, :sku, :price, :image, :stock, :status, :low_stock_threshold)'
    );
    $newId = (int)($d['id'] ?? 0);
    if ($newId <= 0) {
        $newId = (int)$pdo->query('SELECT COALESCE(MAX(id),0)+1 FROM products')->fetchColumn();
    }
    $stmt->execute([
        ':id' => $newId,
        ':name' => $d['name'],
        ':description' => $d['description'] ?? '',
        ':category_id' => $d['category_id'] ?? null,
        ':vendor_id' => $d['vendor_id'] ?? null,
        ':sku' => $d['sku'] ?? null,
        ':price' => (float)$d['price'],
        ':image' => $d['image'] ?? '',
        ':stock' => (int)($d['stock'] ?? 0),
        ':status' => $d['status'] ?? 'active',
        ':low_stock_threshold' => (int)($d['low_stock_threshold'] ?? 5),
    ]);
    log_activity($pdo, 'create', 'product', $newId, $d['name']);
    json_out(['error' => false, 'data' => ['id' => $newId]], 201);
}

// ---- Update -------------------------------------------------------------
if ($method === 'PUT') {
    require_role('editor');
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) json_out(['error' => true, 'message' => 'Missing id'], 422);
    $d = body_json();

    $fields = ['name', 'description', 'category_id', 'vendor_id', 'sku', 'price', 'image', 'stock', 'status', 'low_stock_threshold'];
    $sets = [];
    $params = [':id' => $id];
    foreach ($fields as $f) {
        if (array_key_exists($f, $d)) {
            $sets[] = "$f = :$f";
            $params[":$f"] = $d[$f];
        }
    }
    if (empty($sets)) json_out(['error' => true, 'message' => 'Nothing to update'], 422);

    $stmt = $pdo->prepare('UPDATE products SET ' . implode(', ', $sets) . ' WHERE id = :id');
    $stmt->execute($params);
    log_activity($pdo, 'update', 'product', $id, $d['name'] ?? '');
    json_out(['error' => false, 'affected' => $stmt->rowCount()]);
}

// ---- Delete ---------------------------------------------------------------
if ($method === 'DELETE') {
    require_role('admin');
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) json_out(['error' => true, 'message' => 'Missing id'], 422);
    $stmt = $pdo->prepare('DELETE FROM products WHERE id = :id');
    $stmt->execute([':id' => $id]);
    log_activity($pdo, 'delete', 'product', $id);
    json_out(['error' => false, 'affected' => $stmt->rowCount()]);
}

json_out(['error' => true, 'message' => 'Method not allowed'], 405);
