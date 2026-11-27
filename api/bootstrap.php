<?php
declare(strict_types=1);

const EU_PHONE_DIAL_CODES = [
    'AT' => '43', 'BE' => '32', 'BG' => '359', 'HR' => '385', 'CY' => '357',
    'CZ' => '420', 'DK' => '45', 'EE' => '372', 'FI' => '358', 'FR' => '33',
    'DE' => '49', 'GR' => '30', 'HU' => '36', 'IE' => '353', 'IT' => '39',
    'LV' => '371', 'LT' => '370', 'LU' => '352', 'MT' => '356', 'NL' => '31',
    'PL' => '48', 'PT' => '351', 'RO' => '40', 'SK' => '421', 'SI' => '386',
    'ES' => '34', 'SE' => '46',
];

const EU_NATIONAL_NUMBER_LENGTHS = [
    'AT' => [7, 13], 'BE' => [8, 9], 'BG' => [7, 9], 'HR' => [8, 9],
    'CY' => [8, 8], 'CZ' => [9, 9], 'DK' => [8, 8], 'EE' => [7, 8],
    'FI' => [5, 12], 'FR' => [9, 9], 'DE' => [5, 11], 'GR' => [10, 10],
    'HU' => [8, 9], 'IE' => [7, 9], 'IT' => [6, 11], 'LV' => [8, 8],
    'LT' => [8, 8], 'LU' => [4, 11], 'MT' => [8, 8], 'NL' => [9, 9],
    'PL' => [9, 9], 'PT' => [9, 9], 'RO' => [9, 9], 'SK' => [9, 9],
    'SI' => [8, 8], 'ES' => [9, 9], 'SE' => [7, 10],
];

function runtimeConfig(): array
{
    static $config = null;
    if (is_array($config)) {
        return $config;
    }

    // Keep Hostinger credentials outside public_html and Git deployments.
    // Prefer a dedicated sibling folder, while supporting the original location.
    $domainRoot = dirname(__DIR__, 2);
    $privatePath = $domainRoot . DIRECTORY_SEPARATOR . 'private' . DIRECTORY_SEPARATOR . 'gheralta-private-config.php';
    $legacyPath = $domainRoot . DIRECTORY_SEPARATOR . 'gheralta-private-config.php';
    $path = is_file($privatePath) ? $privatePath : $legacyPath;
    if (!is_file($path)) {
        $config = [];
        return $config;
    }

    $loaded = require $path;
    if (!is_array($loaded)) {
        throw new RuntimeException('Private shop configuration must return an array.');
    }
    $config = $loaded;
    return $config;
}

function runtimeSetting(string $name, string $default = ''): string
{
    $environmentValue = getenv($name);
    if (is_string($environmentValue) && $environmentValue !== '') {
        return $environmentValue;
    }
    $config = runtimeConfig();
    $value = $config[$name] ?? $default;
    return is_string($value) ? $value : $default;
}

/** @return never */
function jsonResponse(int $status, array $payload): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function browserCors(): void
{
    $allowedOrigin = rtrim(runtimeSetting('GHERALTA_FRONTEND_ORIGIN', 'http://127.0.0.1:8000'), '/');
    $origin = rtrim((string) ($_SERVER['HTTP_ORIGIN'] ?? ''), '/');

    if ($origin !== '' && $origin !== $allowedOrigin) {
        jsonResponse(403, ['error' => 'This shop is not allowed to use the checkout service.']);
    }

    if ($origin !== '') {
        header('Access-Control-Allow-Origin: ' . $allowedOrigin);
        header('Vary: Origin');
    }
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');

    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

function requireMethod(string $method): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== $method) {
        header('Allow: ' . $method . ', OPTIONS');
        jsonResponse(405, ['error' => 'Method not allowed.']);
    }
}

function readJsonRequest(): array
{
    $contentLength = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
    if ($contentLength > 65536) {
        jsonResponse(413, ['error' => 'The checkout request is too large.']);
    }

    $raw = file_get_contents('php://input');
    try {
        $data = json_decode($raw ?: '', true, 32, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        jsonResponse(400, ['error' => 'The checkout request was not valid JSON.']);
    }

    if (!is_array($data)) {
        jsonResponse(400, ['error' => 'The checkout request is incomplete.']);
    }
    return $data;
}

function database(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $dsn = runtimeSetting('GHERALTA_DB_DSN');
    $databaseUser = runtimeSetting('GHERALTA_DB_USER');
    $databasePassword = runtimeSetting('GHERALTA_DB_PASSWORD');
    $databasePath = runtimeSetting('GHERALTA_DB_PATH');
    $driver = '';

    if ($dsn !== '') {
        $driver = strtolower(strtok($dsn, ':') ?: '');
        if (!in_array($driver, ['mysql', 'sqlite'], true)) {
            throw new RuntimeException('The configured order database driver is unsupported.');
        }
    } else {
        $environment = strtolower(runtimeSetting('GHERALTA_ENVIRONMENT', 'production'));
        if ($environment !== 'development' && $databasePath === '') {
            throw new RuntimeException('Configure a persistent order database before using checkout.');
        }
        $databasePath = $databasePath ?: sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'gheralta-shop-orders.sqlite';
        $driver = 'sqlite';
        $dsn = 'sqlite:' . $databasePath;
    }

    if ($driver === 'sqlite') {
        $path = substr($dsn, strlen('sqlite:'));
        if ($path === '' || $path === ':memory:') {
            if (strtolower(runtimeSetting('GHERALTA_ENVIRONMENT', 'production')) !== 'development') {
                throw new RuntimeException('Production orders require persistent database storage.');
            }
        } else {
            $directory = dirname($path);
            if (!is_dir($directory) && !mkdir($directory, 0700, true) && !is_dir($directory)) {
                throw new RuntimeException('Order database directory is unavailable.');
            }
        }
    }

    $oldUmask = umask(0077);
    try {
        $pdo = new PDO($dsn, $databaseUser !== '' ? $databaseUser : null, $databasePassword !== '' ? $databasePassword : null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    } finally {
        umask($oldUmask);
    }
    if ($driver === 'sqlite') {
        $pdo->exec('PRAGMA foreign_keys = ON');
        $pdo->exec('PRAGMA journal_mode = DELETE');
        $pdo->exec('PRAGMA busy_timeout = 5000');
        if ($path !== ':memory:') {
            @chmod($path, 0600);
        }
    }

    $schema = <<<'SQL'
        CREATE TABLE IF NOT EXISTS orders (
            order_id VARCHAR(32) PRIMARY KEY,
            order_reference VARCHAR(40) NOT NULL UNIQUE,
            status VARCHAR(40) NOT NULL,
            payment_id VARCHAR(64) UNIQUE,
            payment_status VARCHAR(40),
            currency CHAR(3) NOT NULL,
            net_items_cents BIGINT NOT NULL,
            net_shipping_cents BIGINT NOT NULL,
            vat_cents BIGINT NOT NULL,
            total_cents BIGINT NOT NULL,
            vat_breakdown_json TEXT NOT NULL,
            items_json TEXT NOT NULL,
            customer_json TEXT NOT NULL,
            created_at VARCHAR(32) NOT NULL,
            updated_at VARCHAR(32) NOT NULL
        )
        SQL;
    if ($driver === 'mysql') {
        $schema .= ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4';
    }
    $pdo->exec($schema);

    return $pdo;
}

function mollieApiKey(): string
{
    $key = trim(runtimeSetting('GHERALTA_MOLLIE_API_KEY'));
    if ($key === '' || !str_starts_with($key, 'test_')) {
        jsonResponse(503, ['error' => 'Secure checkout is not configured for test payments yet.']);
    }
    return $key;
}

function postalCodeData(): array
{
    $source = file_get_contents(dirname(__DIR__) . DIRECTORY_SEPARATOR . 'postal-codes.js');
    if ($source === false || !preg_match('/window\.BELGIAN_POSTCODES\s*=\s*(\{.*\});\s*$/s', $source, $matches)) {
        throw new RuntimeException('Belgian postcode data is unavailable.');
    }

    $data = json_decode($matches[1], true, 512, JSON_THROW_ON_ERROR);
    if (!is_array($data)) {
        throw new RuntimeException('Belgian postcode data is invalid.');
    }
    return $data;
}

function textLength(string $value): int
{
    $matches = [];
    $count = preg_match_all('/./us', $value, $matches);
    return $count === false ? PHP_INT_MAX : $count;
}

function validateName(mixed $value, string $label): string
{
    if (!is_string($value)) {
        jsonResponse(422, ['error' => 'Enter a valid ' . $label . '.']);
    }
    $value = trim($value);
    if (textLength($value) < 1 || textLength($value) > 50 ||
        !preg_match('/^[\p{L}\p{M}]+(?:[ \'\x{2019}-][\p{L}\p{M}]+)*$/u', $value)) {
        jsonResponse(422, ['error' => 'Enter a valid ' . $label . ' using letters, spaces, apostrophes, or hyphens.']);
    }
    return $value;
}

function validatePhone(mixed $rawValue, mixed $countryValue): array
{
    $country = is_string($countryValue) ? strtoupper($countryValue) : '';
    $dialCode = EU_PHONE_DIAL_CODES[$country] ?? '';
    if ($dialCode === '' || !is_string($rawValue)) {
        jsonResponse(422, ['error' => 'Choose a valid EU phone country and enter a phone number.']);
    }

    $raw = trim($rawValue);
    if ($raw === '' || !preg_match('/^(?:\+?[0-9\s().\/-]+|00[0-9\s().\/-]+)$/', $raw)) {
        jsonResponse(422, ['error' => 'Enter a valid phone number.']);
    }

    $international = str_starts_with($raw, '+') || str_starts_with($raw, '00');
    $digits = preg_replace('/\D/', '', $raw) ?: '';
    if (str_starts_with($raw, '00')) {
        $digits = substr($digits, 2);
    }

    if ($international) {
        if (!str_starts_with($digits, $dialCode)) {
            jsonResponse(422, ['error' => 'The phone number does not match the selected country calling code.']);
        }
        $national = substr($digits, strlen($dialCode));
    } else {
        $national = $digits;
    }

    if ($country !== 'IT' && str_starts_with($national, '0')) {
        $national = substr($national, 1);
    }
    [$min, $max] = EU_NATIONAL_NUMBER_LENGTHS[$country];
    if (strlen($national) < $min || strlen($national) > $max || strlen($dialCode . $national) > 15) {
        jsonResponse(422, ['error' => 'Enter a valid phone number for the selected country.']);
    }

    return ['country' => $country, 'number' => $raw];
}

function productCatalog(): array
{
    // Prices are net EUR. Belgian Table A food classifications support 6% for
    // coffee, flour and spices. The beer products are treated as ordinary beer
    // (>0.5% ABV, 21%); verify the exact bottle labels before live payments.
    return [
        1 => ['name' => 'Ethiopian Coffee', 'unit_cents' => 2000, 'weight_tenths' => 10, 'vat_rate' => 6],
        2 => ['name' => 'White Teff Flour', 'unit_cents' => 2200, 'weight_tenths' => 50, 'vat_rate' => 6],
        3 => ['name' => 'Brown Teff Flour', 'unit_cents' => 2000, 'weight_tenths' => 50, 'vat_rate' => 6],
        4 => ['name' => 'Berbere', 'unit_cents' => 2500, 'weight_tenths' => 10, 'vat_rate' => 6],
        5 => ['name' => 'Shiro', 'unit_cents' => 1500, 'weight_tenths' => 10, 'vat_rate' => 6],
        6 => ['name' => 'Habesha Beer', 'unit_cents' => 300, 'weight_tenths' => 10, 'vat_rate' => 21],
        7 => ['name' => 'Asmera Beer', 'unit_cents' => 300, 'weight_tenths' => 10, 'vat_rate' => 21],
    ];
}

/** @return array{items: array, net_items_cents: int, shipping_cents: int, vat: array, vat_cents: int, total_cents: int, region: string} */
function calculateOrder(array $request): array
{
    $catalog = productCatalog();
    $requestedItems = $request['items'] ?? null;
    if (!is_array($requestedItems) || count($requestedItems) < 1 || count($requestedItems) > 50) {
        jsonResponse(422, ['error' => 'Your cart is empty or invalid.']);
    }

    $quantities = [];
    foreach ($requestedItems as $requestedItem) {
        if (!is_array($requestedItem)) {
            jsonResponse(422, ['error' => 'A cart item is invalid.']);
        }
        $id = filter_var($requestedItem['id'] ?? null, FILTER_VALIDATE_INT);
        $quantity = filter_var($requestedItem['qty'] ?? null, FILTER_VALIDATE_INT);
        if ($id === false || !isset($catalog[$id]) || $quantity === false || $quantity < 1 || $quantity > 99) {
            jsonResponse(422, ['error' => 'A cart item or quantity is invalid.']);
        }
        $quantities[$id] = ($quantities[$id] ?? 0) + $quantity;
        if ($quantities[$id] > 99) {
            jsonResponse(422, ['error' => 'The quantity for one product is too high.']);
        }
    }

    $postcode = is_string($request['deliveryPostcode'] ?? null) ? $request['deliveryPostcode'] : '';
    if (!preg_match('/^\d{4}$/', $postcode)) {
        jsonResponse(422, ['error' => 'Choose a valid Belgian postcode.']);
    }
    $postcodes = postalCodeData();
    $address = $postcodes[$postcode] ?? null;
    $cityValue = is_string($request['deliveryCity'] ?? null) ? $request['deliveryCity'] : '';
    $city = null;
    if (is_array($address)) {
        foreach (($address['cities'] ?? []) as $candidate) {
            if (($candidate['value'] ?? null) === $cityValue) {
                $city = $candidate['label'] ?? null;
                break;
            }
        }
    }
    if (!is_array($address) || !is_string($city) || !in_array($address['region'] ?? '', ['Brussels', 'Flanders', 'Wallonia'], true)) {
        jsonResponse(422, ['error' => 'The selected postcode and city do not match.']);
    }

    $firstName = validateName($request['customerFirstName'] ?? null, 'first name');
    $lastName = validateName($request['customerLastName'] ?? null, 'last name');
    $email = is_string($request['customerEmail'] ?? null) ? trim($request['customerEmail']) : '';
    if (strlen($email) > 254 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonResponse(422, ['error' => 'Enter a valid email address.']);
    }
    $phone = validatePhone($request['customerPhone'] ?? null, $request['phoneCountry'] ?? null);

    $street = is_string($request['deliveryStreet'] ?? null) ? trim($request['deliveryStreet']) : '';
    $box = is_string($request['deliveryBox'] ?? null) ? trim($request['deliveryBox']) : '';
    $instructions = is_string($request['deliveryInstructions'] ?? null) ? trim($request['deliveryInstructions']) : '';
    if ($street === '' || textLength($street) > 160 || textLength($box) > 40 || textLength($instructions) > 500) {
        jsonResponse(422, ['error' => 'Check the street, box number, and delivery instructions.']);
    }

    $items = [];
    $netByRate = [6 => 0, 21 => 0];
    $weightTenths = 5; // half-kilogram packaging allowance used by the storefront
    foreach ($quantities as $id => $quantity) {
        $product = $catalog[$id];
        $lineCents = $product['unit_cents'] * $quantity;
        $rate = $product['vat_rate'];
        $netByRate[$rate] += $lineCents;
        $weightTenths += $product['weight_tenths'] * $quantity;
        $items[] = [
            'id' => $id,
            'name' => $product['name'],
            'quantity' => $quantity,
            'unit_net_cents' => $product['unit_cents'],
            'line_net_cents' => $lineCents,
            'vat_rate' => $rate,
        ];
    }

    $netItems = array_sum($netByRate);
    $shippingByRegion = ['Brussels' => 1300, 'Flanders' => 1500, 'Wallonia' => 1900];
    $shipping = $shippingByRegion[$address['region']] + ($weightTenths > 200 ? 400 : 0);
    $rates = array_keys(array_filter($netByRate, static fn (int $amount): bool => $amount > 0));
    $shippingByRate = [];
    $remainingShipping = $shipping;
    foreach ($rates as $index => $rate) {
        $allocated = $index === count($rates) - 1
            ? $remainingShipping
            : (int) round($shipping * $netByRate[$rate] / $netItems, 0, PHP_ROUND_HALF_UP);
        $shippingByRate[$rate] = $allocated;
        $remainingShipping -= $allocated;
    }

    $vatBreakdown = [];
    $vatTotal = 0;
    foreach ($rates as $rate) {
        $taxableBase = $netByRate[$rate] + $shippingByRate[$rate];
        $vat = (int) round($taxableBase * $rate / 100, 0, PHP_ROUND_HALF_UP);
        $vatTotal += $vat;
        $vatBreakdown[(string) $rate] = [
            'rate' => $rate,
            'items_net_cents' => $netByRate[$rate],
            'shipping_net_cents' => $shippingByRate[$rate],
            'taxable_base_cents' => $taxableBase,
            'vat_cents' => $vat,
        ];
    }

    return [
        'items' => $items,
        'net_items_cents' => $netItems,
        'shipping_cents' => $shipping,
        'vat' => $vatBreakdown,
        'vat_cents' => $vatTotal,
        'total_cents' => $netItems + $shipping + $vatTotal,
        'region' => $address['region'],
        'customer' => [
            'firstName' => $firstName,
            'lastName' => $lastName,
            'email' => $email,
            'phone' => $phone,
            'postcode' => $postcode,
            'city' => $city,
            'street' => $street,
            'box' => $box,
            'deliveryInstructions' => $instructions,
        ],
    ];
}

function euroAmount(int $cents): string
{
    return number_format($cents / 100, 2, '.', '');
}

function mollieRequest(string $method, string $path, array $payload = []): array
{
    if (!function_exists('curl_init')) {
        throw new RuntimeException('The PHP cURL extension is required for Mollie payments.');
    }
    $handle = curl_init('https://api.mollie.com/v2' . $path);
    $headers = [
        'Authorization: Bearer ' . mollieApiKey(),
        'Accept: application/json',
        'Content-Type: application/json',
    ];
    curl_setopt_array($handle, [
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT => 25,
        CURLOPT_POSTFIELDS => $payload === [] ? null : json_encode($payload, JSON_THROW_ON_ERROR),
    ]);
    $raw = curl_exec($handle);
    $status = (int) curl_getinfo($handle, CURLINFO_RESPONSE_CODE);
    $curlError = curl_error($handle);
    curl_close($handle);

    if (!is_string($raw) || $status < 200 || $status >= 300) {
        error_log('Mollie API request failed (' . $status . '): ' . substr($curlError ?: (string) $raw, 0, 300));
        throw new RuntimeException('Mollie could not create or retrieve the payment.');
    }
    $data = json_decode($raw, true, 32, JSON_THROW_ON_ERROR);
    if (!is_array($data)) {
        throw new RuntimeException('Mollie returned an invalid response.');
    }
    return $data;
}
