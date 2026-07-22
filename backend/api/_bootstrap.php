<?php
// ============================================================
// Shared bootstrap for every admin/api/*.php endpoint.
// Handles: DB connection (reuses ../config.php), secure session,
// JSON helpers, auth guards, role checks, and activity logging.
// ============================================================

// Reuse the existing DB connection + CORS/JSON headers from the
// storefront backend so we don't maintain two sets of credentials.
require_once __DIR__ . '/../config.php';
// $pdo is now available.

// --- Secure session setup -----------------------------------
// Must happen before any output. Cookie is httpOnly (JS can't read
// it, blocking XSS token theft) and SameSite=Lax (blocks most CSRF
// on state-changing requests from other sites). Set 'secure' => true
// once you're serving the admin panel over HTTPS.
if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'lifetime' => 0,
        'path'     => '/',
        'httponly' => true,
        'samesite' => 'Lax',
        // 'secure' => true, // uncomment once running behind HTTPS
    ]);
    session_name('admin_sid');
    session_start();
}

header('Content-Type: application/json; charset=UTF-8');
// Admin endpoints are same-origin only (served from admin/ alongside
// the panel) — no wildcard CORS here, unlike the public storefront API.
header('Access-Control-Allow-Origin: null');
header_remove('Access-Control-Allow-Origin');

function json_out($data, int $status = 200): void {
    http_response_code($status);
    echo json_encode($data);
    exit();
}

function body_json(): array {
    $raw = file_get_contents('php://input');
    if (!$raw) return [];
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

/** Currently logged-in admin, or null. */
function current_admin(): ?array {
    if (empty($_SESSION['admin_id'])) return null;
    return [
        'id'    => (int)$_SESSION['admin_id'],
        'name'  => $_SESSION['admin_name'] ?? '',
        'email' => $_SESSION['admin_email'] ?? '',
        'role'  => $_SESSION['admin_role'] ?? 'viewer',
    ];
}

/** Blocks the request unless someone is logged in. */
function require_login(): array {
    $admin = current_admin();
    if (!$admin) {
        json_out(['error' => true, 'message' => 'Not authenticated'], 401);
    }
    return $admin;
}

// Role capability matrix. Simple by design — see README for the
// rationale — swap for a granular permissions table if you outgrow it.
const ROLE_RANK = ['viewer' => 1, 'editor' => 2, 'manager' => 3, 'admin' => 4];

/** Blocks the request unless the logged-in admin's role meets $minRole. */
function require_role(string $minRole): array {
    $admin = require_login();
    $have = ROLE_RANK[$admin['role']] ?? 0;
    $need = ROLE_RANK[$minRole] ?? 99;
    if ($have < $need) {
        json_out(['error' => true, 'message' => 'Insufficient permissions for this action'], 403);
    }
    return $admin;
}

/** Records an action in activity_logs. Never fatal if it fails. */
function log_activity(PDO $pdo, string $action, string $entity, $entityId = null, string $details = ''): void {
    try {
        $admin = current_admin();
        $stmt = $pdo->prepare(
            'INSERT INTO activity_logs (admin_id, admin_name, action, entity, entity_id, details, ip_address)
             VALUES (:admin_id, :admin_name, :action, :entity, :entity_id, :details, :ip)'
        );
        $stmt->execute([
            ':admin_id'   => $admin['id'] ?? null,
            ':admin_name' => $admin['name'] ?? 'system',
            ':action'     => $action,
            ':entity'     => $entity,
            ':entity_id'  => $entityId !== null ? (string)$entityId : null,
            ':details'    => $details,
            ':ip'         => $_SERVER['REMOTE_ADDR'] ?? '',
        ]);
    } catch (Throwable $e) {
        // Auditing should never break the actual request.
    }
}

/** Reads pagination params from the query string with sane caps. */
function pagination_params(): array {
    $page = max(1, (int)($_GET['page'] ?? 1));
    $perPage = (int)($_GET['per_page'] ?? 20);
    $perPage = max(1, min(100, $perPage));
    return [$page, $perPage, ($page - 1) * $perPage];
}

/** Basic string validator helper. */
function require_fields(array $data, array $fields): ?string {
    foreach ($fields as $f) {
        if (!isset($data[$f]) || $data[$f] === '') {
            return "Field '$f' is required";
        }
    }
    return null;
}
