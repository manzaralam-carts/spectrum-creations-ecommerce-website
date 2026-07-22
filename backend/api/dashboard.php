<?php
// ============================================================
// GET /api/dashboard.php — summary cards, sales trend, top
// products, low stock, and recent orders for the dashboard.
// ============================================================
require_once __DIR__ . '/_bootstrap.php';
require_login();

try {
    // Summary cards
    $revenue = $pdo->query(
        "SELECT COALESCE(SUM(total),0) FROM orders WHERE status != 'cancelled'"
    )->fetchColumn();

    $revenue30d = $pdo->query(
        "SELECT COALESCE(SUM(total),0) FROM orders
         WHERE status != 'cancelled' AND created_at >= (NOW() - INTERVAL 30 DAY)"
    )->fetchColumn();

    $orderCount = $pdo->query("SELECT COUNT(*) FROM orders")->fetchColumn();
    $pendingOrders = $pdo->query("SELECT COUNT(*) FROM orders WHERE status = 'pending'")->fetchColumn();
    $productCount = $pdo->query("SELECT COUNT(*) FROM products")->fetchColumn();
    $lowStockCount = $pdo->query(
        "SELECT COUNT(*) FROM products WHERE stock <= low_stock_threshold"
    )->fetchColumn();
    $customerCount = $pdo->query(
        "SELECT COUNT(DISTINCT mobile) FROM orders"
    )->fetchColumn();

    // Sales trend, last 14 days
    $trendStmt = $pdo->query(
        "SELECT DATE(created_at) AS d, COALESCE(SUM(total),0) AS total, COUNT(*) AS orders
         FROM orders
         WHERE created_at >= (NOW() - INTERVAL 14 DAY) AND status != 'cancelled'
         GROUP BY DATE(created_at)
         ORDER BY d ASC"
    );
    $trendRaw = $trendStmt->fetchAll();
    $trendByDay = [];
    foreach ($trendRaw as $row) $trendByDay[$row['d']] = $row;
    $trend = [];
    for ($i = 13; $i >= 0; $i--) {
        $day = date('Y-m-d', strtotime("-$i days"));
        $trend[] = [
            'date' => $day,
            'total' => isset($trendByDay[$day]) ? (float)$trendByDay[$day]['total'] : 0,
            'orders' => isset($trendByDay[$day]) ? (int)$trendByDay[$day]['orders'] : 0,
        ];
    }

    // Top selling products (by quantity, all time)
    $topProducts = $pdo->query(
        "SELECT oi.product_id, oi.product_name, SUM(oi.qty) AS qty_sold,
                SUM(oi.qty * oi.unit_price) AS revenue
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id AND o.status != 'cancelled'
         GROUP BY oi.product_id, oi.product_name
         ORDER BY qty_sold DESC
         LIMIT 5"
    )->fetchAll();

    // Order status breakdown
    $statusBreakdown = $pdo->query(
        "SELECT status, COUNT(*) AS count FROM orders GROUP BY status"
    )->fetchAll();

    // Low stock products
    $lowStock = $pdo->query(
        "SELECT id, name, stock, low_stock_threshold FROM products
         WHERE stock <= low_stock_threshold ORDER BY stock ASC LIMIT 8"
    )->fetchAll();

    // Recent orders
    $recentOrders = $pdo->query(
        "SELECT id, order_no, customer_name, total, status, created_at
         FROM orders ORDER BY created_at DESC LIMIT 8"
    )->fetchAll();

    json_out(['error' => false, 'data' => [
        'cards' => [
            'total_revenue' => (float)$revenue,
            'revenue_30d' => (float)$revenue30d,
            'order_count' => (int)$orderCount,
            'pending_orders' => (int)$pendingOrders,
            'product_count' => (int)$productCount,
            'low_stock_count' => (int)$lowStockCount,
            'customer_count' => (int)$customerCount,
        ],
        'trend' => $trend,
        'top_products' => $topProducts,
        'status_breakdown' => $statusBreakdown,
        'low_stock' => $lowStock,
        'recent_orders' => $recentOrders,
    ]]);
} catch (Throwable $e) {
    json_out(['error' => true, 'message' => 'Failed to load dashboard data'], 500);
}
