<?php
// ============================================================
// GET /api/settings.php                 all settings, grouped
// GET /api/settings.php?group=payment   one group
// PUT /api/settings.php?group=payment   { key: value, ... } — bulk-set a group
// ============================================================
require_once __DIR__ . '/_bootstrap.php';
require_login();
$method = $_SERVER['REQUEST_METHOD'];
$validGroups = ['general', 'payment', 'shipping', 'tax', 'seo'];

if ($method === 'GET') {
    $group = $_GET['group'] ?? null;
    if ($group) {
        $stmt = $pdo->prepare('SELECT setting_key, setting_value FROM settings WHERE setting_group = :g');
        $stmt->execute([':g' => $group]);
    } else {
        $stmt = $pdo->query('SELECT setting_group, setting_key, setting_value FROM settings ORDER BY setting_group, setting_key');
    }
    $rows = $stmt->fetchAll();

    if ($group) {
        $out = [];
        foreach ($rows as $r) $out[$r['setting_key']] = $r['setting_value'];
        json_out(['error' => false, 'data' => $out]);
    }
    $grouped = [];
    foreach ($rows as $r) $grouped[$r['setting_group']][$r['setting_key']] = $r['setting_value'];
    json_out(['error' => false, 'data' => $grouped]);
}

if ($method === 'PUT') {
    require_role('manager');
    $group = $_GET['group'] ?? '';
    if (!in_array($group, $validGroups, true)) json_out(['error' => true, 'message' => 'Unknown settings group'], 422);
    // Payment gateway credentials and tax config are sensitive enough
    // to require the top role even though other settings only need manager.
    if (in_array($group, ['payment', 'tax'], true)) require_role('admin');

    $d = body_json();
    if (empty($d)) json_out(['error' => true, 'message' => 'No settings provided'], 422);

    $stmt = $pdo->prepare(
        'INSERT INTO settings (setting_group, setting_key, setting_value) VALUES (:g, :k, :v)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)'
    );
    $pdo->beginTransaction();
    foreach ($d as $key => $value) {
        $stmt->execute([':g' => $group, ':k' => $key, ':v' => is_scalar($value) ? (string)$value : json_encode($value)]);
    }
    $pdo->commit();
    log_activity($pdo, 'update', 'settings', $group);
    json_out(['error' => false]);
}

json_out(['error' => true, 'message' => 'Method not allowed'], 405);
