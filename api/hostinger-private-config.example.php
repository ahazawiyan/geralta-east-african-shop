<?php
declare(strict_types=1);

// Copy this file to ../../private/gheralta-private-config.php relative to public_html/api,
// placing it inside a private folder beside public_html. Replace every
// placeholder and keep that private copy out of Git. This example contains no
// working credentials.
return [
    'GHERALTA_ENVIRONMENT' => 'production',
    'GHERALTA_MOLLIE_API_KEY' => 'test_replace_with_your_Mollie_test_key',
    'GHERALTA_FRONTEND_ORIGIN' => 'https://gheralta-brussels.be',
    'GHERALTA_PUBLIC_API_BASE_URL' => 'https://gheralta-brussels.be',
    'GHERALTA_DB_DSN' => 'mysql:host=YOUR_HOSTINGER_DB_HOST;dbname=YOUR_DATABASE;charset=utf8mb4',
    'GHERALTA_DB_USER' => 'YOUR_DATABASE_USER',
    'GHERALTA_DB_PASSWORD' => 'YOUR_DATABASE_PASSWORD',
];
