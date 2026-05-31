<?php
file_put_contents('/tmp/webhook_test', date('Y-m-d H:i:s') . "\n", FILE_APPEND);

$secret = 'TON_SECRET_WEBHOOK';
$payload = file_get_contents('php://input');
$sig = 'sha256=' . hash_hmac('sha256', $payload, $secret);
//verifiér que la signature correspond à celle envoyée par GitHub
if (!hash_equals($sig, $_SERVER['HTTP_X_HUB_SIGNATURE_256'] ?? '')) {
    http_response_code(403);
    die('Forbidden');
}

file_put_contents('/tmp/deploy_trigger', date('Y-m-d H:i:s'));
echo json_encode(['status' => 'OK']);
