<?php
// GET/POST/PUT/DELETE /api/blog.php — blog post CRUD.
require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_crud.php';

run_crud($pdo, [
    'table' => 'blog_posts',
    'entityName' => 'blog_post',
    'searchable' => ['title', 'excerpt'],
    'filters' => ['status'],
    'sortable' => ['title', 'created_at', 'published_at'],
    'defaultSort' => 'created_at',
    'required' => ['title', 'body'],
    'writableFields' => ['title', 'slug', 'excerpt', 'body', 'cover_image', 'author_id', 'status', 'published_at'],
    'bulkStatusValues' => ['draft', 'published'],
    'beforeCreate' => function ($d) {
        if (empty($d['slug'])) {
            $d['slug'] = trim(preg_replace('/[^a-z0-9]+/', '-', strtolower($d['title'])), '-');
        }
        return $d;
    },
]);
