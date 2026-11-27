<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    header('Allow: POST');
    exit;
}

$paymentId = $_POST['id'] ?? '';
if (!is_string($paymentId) || !preg_match('/^tr_[A-Za-z0-9]+$/', $paymentId)) {
    http_response_code(400);
    exit;
}

try {
    $payment = mollieRequest('GET', '/payments/' . rawurlencode($paymentId));
    $orderId = $payment['metadata']['order_id'] ?? null;
    $status = $payment['status'] ?? null;
    if (!is_string($orderId) || !preg_match('/^[a-f0-9]{32}$/', $orderId) ||
        !is_string($status) || !in_array($status, ['open', 'pending', 'authorized', 'paid', 'canceled', 'expired', 'failed'], true)) {
        http_response_code(200);
        exit;
    }

    $pdo = database();
    $lookup = $pdo->prepare('SELECT order_id, total_cents, currency FROM orders WHERE order_id = :order_id AND payment_id = :payment_id');
    $lookup->execute([':order_id' => $orderId, ':payment_id' => $paymentId]);
    $order = $lookup->fetch();
    if (!$order || $order['currency'] !== ($payment['amount']['currency'] ?? null) ||
        euroAmount((int) $order['total_cents']) !== ($payment['amount']['value'] ?? null)) {
        http_response_code(200);
        exit;
    }

    $update = $pdo->prepare(<<<'SQL'
        UPDATE orders
        SET status = CASE WHEN status = 'paid' AND :incoming_status <> 'paid' THEN status ELSE :applied_status END,
            payment_status = :payment_status,
            updated_at = :updated_at
        WHERE order_id = :order_id AND payment_id = :payment_id
        SQL);
    $update->execute([
        ':incoming_status' => $status,
        ':applied_status' => $status,
        ':payment_status' => $status,
        ':updated_at' => gmdate('c'),
        ':order_id' => $orderId,
        ':payment_id' => $paymentId,
    ]);
    http_response_code(200);
} catch (Throwable $error) {
    error_log('Mollie webhook processing failed: ' . $error->getMessage());
    http_response_code(503);
}
