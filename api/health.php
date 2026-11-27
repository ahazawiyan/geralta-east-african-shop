<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

try {
    database();
    jsonResponse(200, [
        'status' => 'ok',
        'service' => 'gheralta-shop-api',
        'database' => 'ok',
        'timestamp' => gmdate('c'),
    ]);
} catch (Throwable $error) {
    error_log('Health check failed: ' . $error->getMessage());
    jsonResponse(503, [
        'status' => 'unavailable',
        'service' => 'gheralta-shop-api',
        'timestamp' => gmdate('c'),
    ]);
}
