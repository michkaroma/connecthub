<?php
// ConnectHub Backend - Main Router
// Architecture REST API

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/middleware/auth.php';
require_once __DIR__ . '/middleware/cors.php';

// CORS + JSON headers
handleCors();
header('Content-Type: application/json; charset=utf-8');

// Parse request
$method = $_SERVER['REQUEST_METHOD'];
$uri    = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$base = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/');
$uri  = preg_replace('#^' . preg_quote($base, '#') . '#', '', $uri);
$uri  = preg_replace('#^/api(?=/|$)#', '', $uri);
$parts  = explode('/', trim($uri, '/'));
$resource = $parts[0] ?? '';
$id       = $parts[1] ?? null;
$action   = $parts[2] ?? null;

// Load body for POST/PUT/PATCH
$body = [];
if (in_array($method, ['POST','PUT','PATCH'])) {
    $raw  = file_get_contents('php://input');
    $body = json_decode($raw, true) ?? [];
}

// Route dispatch
try {
    switch ($resource) {
        case 'auth':
            require __DIR__ . '/api/auth.php';
            break;
        case 'users':
            require __DIR__ . '/api/users.php';
            break;
        case 'posts':
            require __DIR__ . '/api/posts.php';
            break;
        case 'comments':
            require __DIR__ . '/api/comments.php';
            break;
        case 'reactions':
            require __DIR__ . '/api/reactions.php';
            break;
        case 'communities':
            require __DIR__ . '/api/communities.php';
            break;
        case 'conversations':
            require __DIR__ . '/api/conversations.php';
            break;
        case 'notifications':
            require __DIR__ . '/api/notifications.php';
            break;
        case 'reports':
            require __DIR__ . '/api/reports.php';
            break;
        case 'search':
            require __DIR__ . '/api/search.php';
            break;
	case 'webhook':
	    require __DIR__ . '/api/webhook.php'
	    break;
        default:
            http_response_code(404);
            echo json_encode(['error' => 'Route not found']);
    }
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error', 'message' => $e->getMessage()]);
}
