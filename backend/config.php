<?php
// ============================================================
// Database connection, shared by every endpoint in /api.
// Edit DB_USER / DB_PASS (and DB_HOST if needed) for your host.
// ============================================================

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

// Preflight requests end here
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

define('DB_HOST', 'localhost');
define('DB_NAME', 'ecommerce_db');
define('DB_USER', 'root');   // <-- change for your host
define('DB_PASS', '');       // <-- change for your host

// For Infinity Hosting

// define('DB_HOST', 'sql111.infinityfree.com');
// define('DB_NAME', 'if0_42467561_ecommerce_db');
// define('DB_USER', 'if0_42467561');
// define('DB_PASS', 'Admincarts12345');

try {
    $pdo = new PDO(
        "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
        DB_USER,
        DB_PASS,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => true, "message" => "Database connection failed"]);
    exit();
}