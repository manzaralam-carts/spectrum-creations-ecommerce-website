<?php
// ============================================================
// POST /api/auth.php?action=login   { email, password }
// POST /api/auth.php?action=logout
// GET  /api/auth.php?action=me
// ============================================================
require_once __DIR__ . '/_bootstrap.php';

$action = $_GET['action'] ?? '';

if ($action === 'login' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = body_json();
    $email = trim($data['email'] ?? '');
    $password = (string)($data['password'] ?? '');

    if ($email === '' || $password === '') {
        json_out(['error' => true, 'message' => 'Email and password are required'], 422);
    }

    // Very light rate limiting per session to slow brute force.
    $_SESSION['login_attempts'] = ($_SESSION['login_attempts'] ?? 0) + 1;
    $_SESSION['login_attempts_at'] = $_SESSION['login_attempts_at'] ?? time();
    if ($_SESSION['login_attempts'] > 10 && (time() - $_SESSION['login_attempts_at']) < 300) {
        json_out(['error' => true, 'message' => 'Too many attempts. Try again in a few minutes.'], 429);
    }

    $stmt = $pdo->prepare('SELECT * FROM admin_users WHERE email = :email LIMIT 1');
    $stmt->execute([':email' => $email]);
    $user = $stmt->fetch();

    if (!$user || $user['status'] !== 'active' || !password_verify($password, $user['password_hash'])) {
        log_activity($pdo, 'login_failed', 'auth', null, "email=$email");
        json_out(['error' => true, 'message' => 'Invalid credentials'], 401);
    }

    session_regenerate_id(true); // prevent session fixation
    $_SESSION['admin_id'] = $user['id'];
    $_SESSION['admin_name'] = $user['name'];
    $_SESSION['admin_email'] = $user['email'];
    $_SESSION['admin_role'] = $user['role'];
    unset($_SESSION['login_attempts'], $_SESSION['login_attempts_at']);

    $upd = $pdo->prepare('UPDATE admin_users SET last_login_at = NOW() WHERE id = :id');
    $upd->execute([':id' => $user['id']]);

    log_activity($pdo, 'login', 'auth', $user['id']);

    json_out(['error' => false, 'data' => [
        'id' => $user['id'], 'name' => $user['name'], 'email' => $user['email'], 'role' => $user['role'],
    ]]);
}

if ($action === 'logout') {
    $admin = current_admin();
    if ($admin) log_activity($pdo, 'logout', 'auth', $admin['id']);
    $_SESSION = [];
    session_destroy();
    json_out(['error' => false, 'message' => 'Logged out']);
}

if ($action === 'me') {
    $admin = current_admin();
    if (!$admin) json_out(['error' => true, 'message' => 'Not authenticated'], 401);
    json_out(['error' => false, 'data' => $admin]);
}

json_out(['error' => true, 'message' => 'Unknown action'], 400);
