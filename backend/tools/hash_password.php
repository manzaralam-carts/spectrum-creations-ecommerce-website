<?php
// ============================================================
// Run from the command line to generate a password hash you can
// paste directly into admin_users.password_hash via phpMyAdmin —
// useful if you're locked out and can't use the Users & Roles page.
//
// Usage:  php hash_password.php "YourNewPassword123"
// ============================================================
if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    die('This script is for command-line use only.');
}
if ($argc < 2) {
    fwrite(STDERR, "Usage: php hash_password.php \"YourNewPassword\"\n");
    exit(1);
}
echo password_hash($argv[1], PASSWORD_DEFAULT) . "\n";
