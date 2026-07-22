<?php
// GET/POST/PUT/DELETE /api/banners.php — homepage/promo banner CRUD.
require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_crud.php';

run_crud($pdo, [
    'table' => 'banners',
    'entityName' => 'banner',
    'searchable' => ['title', 'subtitle'],
    'filters' => ['status', 'position'],
    'sortable' => ['title', 'sort_order', 'created_at'],
    'defaultSort' => 'sort_order',
    'required' => ['title', 'image'],
    'writableFields' => ['title', 'subtitle', 'image', 'link_url', 'position', 'sort_order', 'status', 'starts_at', 'ends_at'],
    'bulkStatusValues' => ['active', 'inactive'],
]);
