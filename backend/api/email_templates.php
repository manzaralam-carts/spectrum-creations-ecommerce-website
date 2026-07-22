<?php
// GET/PUT /api/email_templates.php — email templates (fixed set, edit only).
require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_crud.php';

run_crud($pdo, [
    'table' => 'email_templates',
    'entityName' => 'email_template',
    'searchable' => ['name', 'code'],
    'filters' => [],
    'sortable' => ['name', 'updated_at'],
    'defaultSort' => 'name',
    'writableFields' => ['name', 'subject', 'body'],
    'minRoleWrite' => 'manager',
]);
