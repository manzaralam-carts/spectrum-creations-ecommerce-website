<?php
require __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["error" => true, "message" => "Method not allowed"]);
    exit();
}

$body = json_decode(file_get_contents("php://input"), true);
if (!is_array($body)) {
    http_response_code(400);
    echo json_encode(["error" => true, "message" => "Invalid request body"]);
    exit();
}

$name       = trim($body['name'] ?? '');
$mobile     = trim($body['mobile'] ?? '');
$address    = trim($body['address'] ?? '');
$addressTag = trim($body['addressTag'] ?? '');
$items      = $body['items'] ?? [];

// Only Cash on Delivery is supported right now — this whitelist is what
// you extend when a real payment gateway (card/wallet/etc.) gets added.
$SUPPORTED_PAYMENT_METHODS = ['cod'];
$paymentMethod = strtolower(trim($body['paymentMethod'] ?? 'cod'));
if (!in_array($paymentMethod, $SUPPORTED_PAYMENT_METHODS, true)) {
    $paymentMethod = 'cod';
}

// ---- Server-side validation — never trust the client ----
if ($name === '' || mb_strlen($name) < 3 || mb_strlen($name) > 60) {
    http_response_code(400);
    echo json_encode(["error" => true, "message" => "Enter a valid full name."]);
    exit();
}
if (!preg_match('/^03[0-9]{9}$/', $mobile)) {
    http_response_code(400);
    echo json_encode(["error" => true, "message" => "Enter a valid 11-digit mobile number starting with 03."]);
    exit();
}
if ($address === '' || mb_strlen($address) < 8 || mb_strlen($address) > 400) {
    http_response_code(400);
    echo json_encode(["error" => true, "message" => "Enter a complete delivery address."]);
    exit();
}
if (empty($items) || !is_array($items)) {
    http_response_code(400);
    echo json_encode(["error" => true, "message" => "Your cart is empty."]);
    exit();
}

// Normalize items into [productId => qty], accepting either
// { "12": 2, "45": 1 } or [{ id: 12, qty: 2 }, ...]
$normalized = [];
foreach ($items as $key => $val) {
    if (is_array($val) && isset($val['id'])) {
        $pid = (int)$val['id'];
        $qty = (int)($val['qty'] ?? 1);
    } else {
        $pid = (int)$key;
        $qty = (int)$val;
    }
    if ($pid > 0 && $qty > 0) {
        $normalized[$pid] = ($normalized[$pid] ?? 0) + $qty;
    }
}

if (empty($normalized)) {
    http_response_code(400);
    echo json_encode(["error" => true, "message" => "Your cart is empty."]);
    exit();
}

try {
    $pdo->beginTransaction();

    $total = 0;
    $lineItems = [];

    foreach ($normalized as $productId => $qty) {
        // Lock the row so two simultaneous orders can't oversell the same stock
        $stmt = $pdo->prepare("SELECT id, name, price, stock FROM products WHERE id = ? FOR UPDATE");
        $stmt->execute([$productId]);
        $product = $stmt->fetch();

        if (!$product) {
            throw new Exception("One of the items in your cart no longer exists.");
        }
        if ((int)$product['stock'] < $qty) {
            $left = (int)$product['stock'];
            $msg = $left > 0
                ? "\"{$product['name']}\" only has {$left} left in stock."
                : "\"{$product['name']}\" just went out of stock.";
            throw new Exception($msg);
        }

        $lineItems[] = [
            'id'    => (int)$product['id'],
            'name'  => $product['name'],
            'price' => (float)$product['price'],
            'qty'   => $qty,
        ];
        $total += $product['price'] * $qty;
    }

    $orderNo = "ORD-" . time() . "-" . random_int(100, 999);

    $stmt = $pdo->prepare(
        "INSERT INTO orders (order_no, customer_name, mobile, address, address_tag, payment_method, total, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')"
    );
    $stmt->execute([$orderNo, $name, $mobile, $address, $addressTag, $paymentMethod, $total]);
    $orderId = $pdo->lastInsertId();

    $itemStmt = $pdo->prepare(
        "INSERT INTO order_items (order_id, product_id, product_name, unit_price, qty)
         VALUES (?, ?, ?, ?, ?)"
    );
    $stockStmt = $pdo->prepare("UPDATE products SET stock = stock - ? WHERE id = ?");

    foreach ($lineItems as $item) {
        $itemStmt->execute([$orderId, $item['id'], $item['name'], $item['price'], $item['qty']]);
        $stockStmt->execute([$item['qty'], $item['id']]);
    }

    $pdo->commit();

    echo json_encode([
        "error"         => false,
        "orderNo"       => $orderNo,
        "paymentMethod" => $paymentMethod,
        "total"         => $total,
        "items"         => $lineItems,
    ]);
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    // 409 = conflict (stock ran out / bad item) vs 500 for a real server error
    http_response_code(409);
    echo json_encode(["error" => true, "message" => $e->getMessage()]);
}
