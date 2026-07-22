<?php
// GET/POST/PUT/DELETE /api/coupons.php — coupon CRUD.
require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_crud.php';

run_crud($pdo, [
    'table' => 'coupons',
    'entityName' => 'coupon',
    'searchable' => ['code'],
    'filters' => ['status', 'type'],
    'sortable' => ['code', 'value', 'created_at', 'expires_at'],
    'defaultSort' => 'created_at',
    'required' => ['code', 'type', 'value'],
    'writableFields' => ['code', 'type', 'value', 'min_order', 'usage_limit', 'starts_at', 'expires_at', 'status'],
    'bulkStatusValues' => ['active', 'inactive'],
    'beforeCreate' => function ($d) {
        $d['code'] = strtoupper(trim($d['code']));
        return $d;
    },
]);
