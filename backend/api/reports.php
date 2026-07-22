<?php
// ============================================================
// GET /api/reports.php?type=sales&from=2026-01-01&to=2026-07-01
// GET /api/reports.php?type=inventory
// GET /api/reports.php?type=customers
// ============================================================
require_once __DIR__ . '/_bootstrap.php';
require_role('manager');
if ($_SERVER['REQUEST_METHOD'] !== 'GET') json_out(['error' => true, 'message' => 'Method not allowed'], 405);

$type = $_GET['type'] ?? 'sales';
$from = !empty($_GET['from']) ? $_GET['from'] . ' 00:00:00' : date('Y-m-d 00:00:00', strtotime('-30 days'));
$to = !empty($_GET['to']) ? $_GET['to'] . ' 23:59:59' : date('Y-m-d 23:59:59');

if ($type === 'sales') {
    $summary = $pdo->prepare(
        "SELECT COUNT(*) AS orders, COALESCE(SUM(total),0) AS revenue, COALESCE(AVG(total),0) AS aov
         FROM orders WHERE created_at BETWEEN :from AND :to AND status != 'cancelled'"
    );
    $summary->execute([':from' => $from, ':to' => $to]);

    $byDay = $pdo->prepare(
        "SELECT DATE(created_at) AS date, COUNT(*) AS orders, COALESCE(SUM(total),0) AS revenue
         FROM orders WHERE created_at BETWEEN :from AND :to AND status != 'cancelled'
         GROUP BY DATE(created_at) ORDER BY date ASC"
    );
    $byDay->execute([':from' => $from, ':to' => $to]);

    $byStatus = $pdo->prepare(
        "SELECT status, COUNT(*) AS count, COALESCE(SUM(total),0) AS revenue
         FROM orders WHERE created_at BETWEEN :from AND :to GROUP BY status"
    );
    $byStatus->execute([':from' => $from, ':to' => $to]);

    $topProducts = $pdo->prepare(
        "SELECT oi.product_name, SUM(oi.qty) AS qty_sold, SUM(oi.qty * oi.unit_price) AS revenue
         FROM order_items oi JOIN orders o ON o.id = oi.order_id
         WHERE o.created_at BETWEEN :from AND :to AND o.status != 'cancelled'
         GROUP BY oi.product_name ORDER BY revenue DESC LIMIT 10"
    );
    $topProducts->execute([':from' => $from, ':to' => $to]);

    json_out(['error' => false, 'data' => [
        'summary' => $summary->fetch(),
        'by_day' => $byDay->fetchAll(),
        'by_status' => $byStatus->fetchAll(),
        'top_products' => $topProducts->fetchAll(),
    ]]);
}

if ($type === 'inventory') {
    $lowStock = $pdo->query(
        "SELECT id, name, sku, stock, low_stock_threshold, status FROM products
         WHERE stock <= low_stock_threshold ORDER BY stock ASC"
    )->fetchAll();
    $outOfStock = $pdo->query("SELECT COUNT(*) FROM products WHERE stock = 0")->fetchColumn();
    $totalUnits = $pdo->query("SELECT COALESCE(SUM(stock),0) FROM products")->fetchColumn();
    $inventoryValue = $pdo->query("SELECT COALESCE(SUM(stock * price),0) FROM products")->fetchColumn();

    json_out(['error' => false, 'data' => [
        'low_stock' => $lowStock,
        'out_of_stock_count' => (int)$outOfStock,
        'total_units' => (int)$totalUnits,
        'inventory_value' => (float)$inventoryValue,
    ]]);
}

if ($type === 'customers') {
    $topCustomers = $pdo->prepare(
        "SELECT customer_name, mobile, COUNT(*) AS order_count, SUM(total) AS lifetime_value
         FROM orders WHERE created_at BETWEEN :from AND :to
         GROUP BY customer_name, mobile ORDER BY lifetime_value DESC LIMIT 10"
    );
    $topCustomers->execute([':from' => $from, ':to' => $to]);

    $newVsReturning = $pdo->prepare(
        "SELECT mobile, COUNT(*) AS orders FROM orders GROUP BY mobile"
    );
    $newVsReturning->execute();
    $all = $newVsReturning->fetchAll();
    $returning = count(array_filter($all, fn($r) => $r['orders'] > 1));

    json_out(['error' => false, 'data' => [
        'top_customers' => $topCustomers->fetchAll(),
        'total_customers' => count($all),
        'returning_customers' => $returning,
    ]]);
}

json_out(['error' => true, 'message' => 'Unknown report type'], 400);
