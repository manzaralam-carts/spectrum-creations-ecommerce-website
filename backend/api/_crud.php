<?php
// ============================================================
// Generic table CRUD engine. Endpoints like vendors.php, coupons.php,
// banners.php, blog.php, tax_rates.php are thin wrappers that call
// run_crud() with their table's config — keeps ~6 modules consistent
// and avoids six near-identical copies of the same CRUD logic.
//
// $config keys:
//   table          (string, required)
//   searchable     (array of column names for LIKE search)
//   filters        (array of column names allowed as exact-match filters)
//   sortable       (array of allowed sort columns)
//   defaultSort    (string)
//   writableFields (array of columns POST/PUT may set)
//   minRoleWrite   (string, default 'editor')
//   minRoleDelete  (string, default 'admin')
//   beforeCreate   (callable($data) -> $data, optional — e.g. slugify)
//   entityName     (string, for activity_logs)
// ============================================================

function run_crud(PDO $pdo, array $config): void {
    require_login();
    $method = $_SERVER['REQUEST_METHOD'];
    $table = $config['table'];
    $entity = $config['entityName'] ?? $table;
    $minWrite = $config['minRoleWrite'] ?? 'editor';
    $minDelete = $config['minRoleDelete'] ?? 'admin';

    if ($method === 'GET' && isset($_GET['id'])) {
        $stmt = $pdo->prepare("SELECT * FROM `$table` WHERE id = :id");
        $stmt->execute([':id' => (int)$_GET['id']]);
        $row = $stmt->fetch();
        if (!$row) json_out(['error' => true, 'message' => ucfirst($entity) . ' not found'], 404);
        json_out(['error' => false, 'data' => $row]);
    }

    if ($method === 'GET') {
        [$page, $perPage, $offset] = pagination_params();
        $where = []; $params = [];

        if (!empty($_GET['q']) && !empty($config['searchable'])) {
            $ors = [];
            foreach ($config['searchable'] as $i => $col) {
                $ors[] = "`$col` LIKE :q$i";
                $params[":q$i"] = '%' . $_GET['q'] . '%';
            }
            $where[] = '(' . implode(' OR ', $ors) . ')';
        }
        foreach (($config['filters'] ?? []) as $col) {
            if (!empty($_GET[$col])) {
                $where[] = "`$col` = :f_$col";
                $params[":f_$col"] = $_GET[$col];
            }
        }
        $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

        $sortable = $config['sortable'] ?? ['id'];
        $sort = in_array($_GET['sort'] ?? '', $sortable, true) ? $_GET['sort'] : ($config['defaultSort'] ?? 'id');
        $dir = (($_GET['dir'] ?? 'desc') === 'asc') ? 'ASC' : 'DESC';

        $countStmt = $pdo->prepare("SELECT COUNT(*) FROM `$table` $whereSql");
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();

        $stmt = $pdo->prepare("SELECT * FROM `$table` $whereSql ORDER BY `$sort` $dir LIMIT :limit OFFSET :offset");
        foreach ($params as $k => $v) $stmt->bindValue($k, $v);
        $stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        json_out(['error' => false, 'data' => $stmt->fetchAll(), 'meta' => [
            'page' => $page, 'per_page' => $perPage, 'total' => $total, 'total_pages' => (int)ceil($total / max(1, $perPage)),
        ]]);
    }

    if ($method === 'POST' && !isset($_GET['bulk'])) {
        require_role($minWrite);
        $d = body_json();
        if (!empty($config['required'])) {
            $err = require_fields($d, $config['required']);
            if ($err) json_out(['error' => true, 'message' => $err], 422);
        }
        if (!empty($config['beforeCreate'])) $d = ($config['beforeCreate'])($d);

        $cols = array_intersect(array_keys($d), $config['writableFields']);
        if (empty($cols)) json_out(['error' => true, 'message' => 'No valid fields provided'], 422);
        $colSql = implode(', ', array_map(fn($c) => "`$c`", $cols));
        $paramSql = implode(', ', array_map(fn($c) => ":$c", $cols));
        $stmt = $pdo->prepare("INSERT INTO `$table` ($colSql) VALUES ($paramSql)");
        $params = [];
        foreach ($cols as $c) $params[":$c"] = $d[$c];
        try {
            $stmt->execute($params);
        } catch (PDOException $e) {
            json_out(['error' => true, 'message' => 'Could not save — check for duplicate values'], 409);
        }
        $id = (int)$pdo->lastInsertId();
        log_activity($pdo, 'create', $entity, $id);
        json_out(['error' => false, 'data' => ['id' => $id]], 201);
    }

    if ($method === 'POST' && isset($_GET['bulk'])) {
        require_role('manager');
        $d = body_json();
        $ids = array_filter(array_map('intval', $d['ids'] ?? []));
        $action = $d['action'] ?? '';
        if (empty($ids)) json_out(['error' => true, 'message' => 'No ids provided'], 422);
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        if ($action === 'delete') {
            require_role($minDelete);
            $stmt = $pdo->prepare("DELETE FROM `$table` WHERE id IN ($placeholders)");
            $stmt->execute($ids);
        } elseif (in_array($action, $config['bulkStatusValues'] ?? [], true)) {
            $stmt = $pdo->prepare("UPDATE `$table` SET status = ? WHERE id IN ($placeholders)");
            $stmt->execute(array_merge([$action], $ids));
        } else {
            json_out(['error' => true, 'message' => 'Unsupported bulk action'], 422);
        }
        log_activity($pdo, "bulk_$action", $entity, implode(',', $ids));
        json_out(['error' => false, 'affected' => $stmt->rowCount()]);
    }

    if ($method === 'PUT') {
        require_role($minWrite);
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) json_out(['error' => true, 'message' => 'Missing id'], 422);
        $d = body_json();
        $cols = array_intersect(array_keys($d), $config['writableFields']);
        if (empty($cols)) json_out(['error' => true, 'message' => 'Nothing to update'], 422);
        $sets = implode(', ', array_map(fn($c) => "`$c` = :$c", $cols));
        $params = [':id' => $id];
        foreach ($cols as $c) $params[":$c"] = $d[$c];
        $stmt = $pdo->prepare("UPDATE `$table` SET $sets WHERE id = :id");
        $stmt->execute($params);
        log_activity($pdo, 'update', $entity, $id);
        json_out(['error' => false, 'affected' => $stmt->rowCount()]);
    }

    if ($method === 'DELETE') {
        require_role($minDelete);
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) json_out(['error' => true, 'message' => 'Missing id'], 422);
        $stmt = $pdo->prepare("DELETE FROM `$table` WHERE id = :id");
        $stmt->execute([':id' => $id]);
        log_activity($pdo, 'delete', $entity, $id);
        json_out(['error' => false, 'affected' => $stmt->rowCount()]);
    }

    json_out(['error' => true, 'message' => 'Method not allowed'], 405);
}
