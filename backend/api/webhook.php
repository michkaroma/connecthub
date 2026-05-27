<?php
$secret = 'TON_SECRET_WEBHOOK';
$payload = file_get_contents('php://input');
$sig = 'sha256=' . hash_hmac('sha256', $payload, $secret);

if (!hash_equals($sig, $_SERVER['HTTP_X_HUB_SIGNATURE_256'] ?? '')) {
    http_response_code(403);
    die('Forbidden');
}

exec('sudo /var/www/html/connecthub/deploy.sh > /tmp/deploy.log 2>&1 &');
echo 'OK';
