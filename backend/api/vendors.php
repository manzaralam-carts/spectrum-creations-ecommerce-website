<?php
// GET/POST/PUT/DELETE /api/vendors.php — vendor directory CRUD.
require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_crud.php';

run_crud($pdo, [
    'table' => 'vendors',
    'entityName' => 'vendor',
    'searchable' => ['name', 'email', 'phone'],
    'filters' => ['status'],
    'sortable' => ['name', 'created_at', 'commission_rate'],
    'defaultSort' => 'name',
    'required' => ['name'],
    'writableFields' => ['name', 'email', 'phone', 'commission_rate', 'status', 'notes'],
    'bulkStatusValues' => ['active', 'pending', 'suspended'],
]);
