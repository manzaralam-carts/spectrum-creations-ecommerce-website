<?php
// GET/POST/PUT/DELETE /api/tax_rates.php — regional tax rate CRUD.
require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_crud.php';

run_crud($pdo, [
    'table' => 'tax_rates',
    'entityName' => 'tax_rate',
    'searchable' => ['region'],
    'filters' => ['status'],
    'sortable' => ['region', 'rate', 'created_at'],
    'defaultSort' => 'region',
    'required' => ['region', 'rate'],
    'writableFields' => ['region', 'rate', 'status'],
    'bulkStatusValues' => ['active', 'inactive'],
]);
