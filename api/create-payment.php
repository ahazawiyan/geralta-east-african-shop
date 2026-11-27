<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

browserCors();
requireMethod('POST');

try {
    $apiKey = mollieApiKey();
    $frontendUrl = rtrim(runtimeSetting('GHERALTA_FRONTEND_ORIGIN'), '/');
    $publicApiUrl = rtrim(runtimeSetting('GHERALTA_PUBLIC_API_BASE_URL'), '/');
    if ($frontendUrl === '' || $publicApiUrl === '' ||
        (!str_starts_with($frontendUrl, 'https://') && !str_starts_with($frontendUrl, 'http://127.0.0.1') && !str_starts_with($frontendUrl, 'http://localhost')) ||
        !str_starts_with($publicApiUrl, 'https://')) {
        jsonResponse(503, ['error' => 'The secure checkout URLs are not configured.']);
    }

    $order = calculateOrder(readJsonRequest());
    $pdo = database();
    $orderId = bin2hex(random_bytes(16));
    $orderReference = 'GH-' . gmdate('Ymd') . '-' . strtoupper(bin2hex(random_bytes(3)));
    $now = gmdate('c');

    $insert = $pdo->prepare(<<<'SQL'
        INSERT INTO orders (
            order_id, order_reference, status, currency,
            net_items_cents, net_shipping_cents, vat_cents, total_cents,
            vat_breakdown_json, items_json, customer_json, created_at, updated_at
        ) VALUES (
            :order_id, :order_reference, 'pending_payment', 'EUR',
            :net_items, :shipping, :vat, :total,
            :vat_breakdown, :items, :customer, :created_at, :updated_at
        )
        SQL);
    $insert->execute([
        ':order_id' => $orderId,
        ':order_reference' => $orderReference,
        ':net_items' => $order['net_items_cents'],
        ':shipping' => $order['shipping_cents'],
        ':vat' => $order['vat_cents'],
        ':total' => $order['total_cents'],
        ':vat_breakdown' => json_encode($order['vat'], JSON_THROW_ON_ERROR),
        ':items' => json_encode($order['items'], JSON_THROW_ON_ERROR),
        ':customer' => json_encode($order['customer'], JSON_THROW_ON_ERROR),
        ':created_at' => $now,
        ':updated_at' => $now,
    ]);

    try {
        $payment = mollieRequest('POST', '/payments', [
            'amount' => [
                'currency' => 'EUR',
                'value' => euroAmount($order['total_cents']),
            ],
            'description' => 'Gheralta order ' . $orderReference,
            'redirectUrl' => $frontendUrl . '/payment-return.html?order=' . rawurlencode($orderReference),
            'webhookUrl' => $publicApiUrl . '/api/mollie-webhook.php',
            'metadata' => [
                'order_id' => $orderId,
                'order_reference' => $orderReference,
            ],
        ]);
    } catch (Throwable $error) {
        $failed = $pdo->prepare("UPDATE orders SET status = 'payment_setup_failed', updated_at = :updated_at WHERE order_id = :order_id");
        $failed->execute([':updated_at' => gmdate('c'), ':order_id' => $orderId]);
        throw $error;
    }

    $paymentId = is_string($payment['id'] ?? null) ? $payment['id'] : '';
    $checkoutUrl = $payment['_links']['checkout']['href'] ?? '';
    $checkoutHost = is_string($checkoutUrl) ? parse_url($checkoutUrl, PHP_URL_HOST) : null;
    if (!preg_match('/^tr_[A-Za-z0-9]+$/', $paymentId) || !is_string($checkoutUrl) ||
        !is_string($checkoutHost) || !preg_match('/(^|\.)mollie\.com$/i', $checkoutHost)) {
        throw new RuntimeException('Mollie returned an invalid checkout link.');
    }

    $update = $pdo->prepare(<<<'SQL'
        UPDATE orders
        SET payment_id = :payment_id, payment_status = :payment_status,
            status = 'pending_payment', updated_at = :updated_at
        WHERE order_id = :order_id
        SQL);
    $update->execute([
        ':payment_id' => $paymentId,
        ':payment_status' => is_string($payment['status'] ?? null) ? $payment['status'] : 'open',
        ':updated_at' => gmdate('c'),
        ':order_id' => $orderId,
    ]);

    jsonResponse(201, [
        'orderReference' => $orderReference,
        'checkoutUrl' => $checkoutUrl,
        'currency' => 'EUR',
        'netItems' => euroAmount($order['net_items_cents']),
        'netDelivery' => euroAmount($order['shipping_cents']),
        'vat' => euroAmount($order['vat_cents']),
        'total' => euroAmount($order['total_cents']),
        'vatBreakdown' => $order['vat'],
    ]);
} catch (Throwable $error) {
    error_log('Checkout request failed: ' . $error->getMessage());
    jsonResponse(500, ['error' => 'We could not start secure checkout. Please try again or contact the shop.']);
}
