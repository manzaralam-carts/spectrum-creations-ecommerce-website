<?php
// ============================================================
// GET    /api/media.php           list uploaded files
// POST   /api/media.php           multipart upload, field name "file"
// DELETE /api/media.php?id=5
// ============================================================
require_once __DIR__ . '/_bootstrap.php';
require_login();
$method = $_SERVER['REQUEST_METHOD'];

// Only these are accepted, checked by real content, not just the
// extension or the client-supplied MIME type (both are spoofable).
const ALLOWED_MIME = [
    'image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/gif' => 'gif',
];
const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const UPLOAD_DIR = __DIR__ . '/../../admin/uploads/media/';

if ($method === 'GET') {
    [$page, $perPage, $offset] = pagination_params();
    $total = (int)$pdo->query('SELECT COUNT(*) FROM media')->fetchColumn();
    $stmt = $pdo->prepare('SELECT * FROM media ORDER BY created_at DESC LIMIT :limit OFFSET :offset');
    $stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    json_out(['error' => false, 'data' => $stmt->fetchAll(), 'meta' => [
        'page' => $page, 'per_page' => $perPage, 'total' => $total, 'total_pages' => (int)ceil($total / max(1,$perPage)),
    ]]);
}

if ($method === 'POST') {
    require_role('editor');
    if (empty($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        json_out(['error' => true, 'message' => 'No file uploaded, or upload failed'], 422);
    }
    $file = $_FILES['file'];
    if ($file['size'] > MAX_BYTES) {
        json_out(['error' => true, 'message' => 'File exceeds the 5MB limit'], 422);
    }

    // Inspect actual file bytes rather than trusting the extension/MIME header.
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $realMime = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);
    if (!isset(ALLOWED_MIME[$realMime])) {
        json_out(['error' => true, 'message' => 'Only JPG, PNG, WEBP, or GIF images are allowed'], 422);
    }

    if (!is_dir(UPLOAD_DIR)) mkdir(UPLOAD_DIR, 0755, true);
    // Random filename — never trust the client's original filename on disk,
    // and this also prevents overwrite collisions.
    $ext = ALLOWED_MIME[$realMime];
    $filename = bin2hex(random_bytes(16)) . '.' . $ext;
    $destPath = UPLOAD_DIR . $filename;

    if (!move_uploaded_file($file['tmp_name'], $destPath)) {
        json_out(['error' => true, 'message' => 'Could not save the uploaded file'], 500);
    }

    $publicPath = 'uploads/media/' . $filename;
    $stmt = $pdo->prepare(
        'INSERT INTO media (filename, path, mime_type, size_bytes, uploaded_by)
         VALUES (:filename, :path, :mime, :size, :uid)'
    );
    $admin = current_admin();
    $stmt->execute([
        ':filename' => $file['name'], ':path' => $publicPath, ':mime' => $realMime,
        ':size' => $file['size'], ':uid' => $admin['id'],
    ]);
    $id = (int)$pdo->lastInsertId();
    log_activity($pdo, 'upload', 'media', $id, $file['name']);
    json_out(['error' => false, 'data' => ['id' => $id, 'path' => $publicPath]], 201);
}

if ($method === 'DELETE') {
    require_role('editor');
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) json_out(['error' => true, 'message' => 'Missing id'], 422);
    $stmt = $pdo->prepare('SELECT path FROM media WHERE id = :id');
    $stmt->execute([':id' => $id]);
    $row = $stmt->fetch();
    if ($row) {
        $full = __DIR__ . '/../../admin/' . $row['path'];
        if (is_file($full)) @unlink($full);
    }
    $del = $pdo->prepare('DELETE FROM media WHERE id = :id');
    $del->execute([':id' => $id]);
    log_activity($pdo, 'delete', 'media', $id);
    json_out(['error' => false, 'affected' => $del->rowCount()]);
}

json_out(['error' => true, 'message' => 'Method not allowed'], 405);
