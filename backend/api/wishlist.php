<?php
require __DIR__ . '/../config.php';

$method = $_SERVER['REQUEST_METHOD'];

// ---- GET: fetch a device's saved wishlist, joined with live product data ----
if ($method === 'GET') {
    $deviceId = trim($_GET['device_id'] ?? '');
    if ($deviceId === '') {
        http_response_code(400);
        echo json_encode(["error" => true, "message" => "device_id is required"]);
        exit();
    }

    $stmt = $pdo->prepare(
        "SELECT p.id, p.name, p.price, p.image, p.stock
         FROM wishlist w
         JOIN products p ON p.id = w.product_id
         WHERE w.device_id = ?
         ORDER BY w.created_at DESC"
    );
    $stmt->execute([$deviceId]);
    $rows = $stmt->fetchAll();
    foreach ($rows as &$r) {
        $r['id'] = (int)$r['id'];
        $r['price'] = (float)$r['price'];
        $r['stock'] = (int)$r['stock'];
    }

    echo json_encode(["error" => false, "data" => $rows]);
    exit();
}

// ---- POST: add a product to a device's wishlist ----
if ($method === 'POST') {
    $body = json_decode(file_get_contents("php://input"), true);
    $deviceId  = trim($body['device_id'] ?? '');
    $productId = (int)($body['product_id'] ?? 0);

    if ($deviceId === '' || $productId <= 0) {
        http_response_code(400);
        echo json_encode(["error" => true, "message" => "device_id and product_id are required"]);
        exit();
    }

    try {
        $stmt = $pdo->prepare("INSERT IGNORE INTO wishlist (device_id, product_id) VALUES (?, ?)");
        $stmt->execute([$deviceId, $productId]);
        echo json_encode(["error" => false]);
    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode(["error" => true, "message" => "Could not add to wishlist"]);
    }
    exit();
}

// ---- DELETE: remove a product from a device's wishlist ----
if ($method === 'DELETE') {
    $body = json_decode(file_get_contents("php://input"), true);
    $deviceId  = trim($body['device_id'] ?? '');
    $productId = (int)($body['product_id'] ?? 0);

    if ($deviceId === '' || $productId <= 0) {
        http_response_code(400);
        echo json_encode(["error" => true, "message" => "device_id and product_id are required"]);
        exit();
    }

    $stmt = $pdo->prepare("DELETE FROM wishlist WHERE device_id = ? AND product_id = ?");
    $stmt->execute([$deviceId, $productId]);
    echo json_encode(["error" => false]);
    exit();
}

http_response_code(405);
echo json_encode(["error" => true, "message" => "Method not allowed"]);
