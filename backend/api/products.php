<?php
require __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(["error" => true, "message" => "Method not allowed"]);
    exit();
}

try {
    $stmt = $pdo->query(
        "SELECT p.id, p.name, p.description, p.price, p.image, p.stock, c.name AS category
         FROM products p
         LEFT JOIN categories c ON c.id = p.category_id
         ORDER BY p.id"
    );
    $products = $stmt->fetchAll();

    // Cast numeric fields — PDO returns everything as strings by default
    foreach ($products as &$p) {
        $p['id'] = (int)$p['id'];
        $p['price'] = (float)$p['price'];
        $p['stock'] = (int)$p['stock'];
    }

    echo json_encode(["error" => false, "data" => $products]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => true, "message" => "Could not load products"]);
}
