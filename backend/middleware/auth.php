<?php
define('JWT_SECRET', 'connecthub_secret_key_change_in_production_2026');
define('JWT_EXPIRE', 86400 * 7); // 7 days
// Middleware d'authentification JWT pour les API
function generateToken(int $userId, string $role): string {
    $header  = base64url_encode(json_encode(['alg'=>'HS256','typ'=>'JWT']));
    $payload = base64url_encode(json_encode([
        'sub'  => $userId,
        'role' => $role,
        'iat'  => time(),
        'exp'  => time() + JWT_EXPIRE,
    ]));
    $sig = base64url_encode(hash_hmac('sha256', "$header.$payload", JWT_SECRET, true));
    return "$header.$payload.$sig";
}

function verifyToken(string $token): ?array {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;
    [$header, $payload, $sig] = $parts;
    $expected = base64url_encode(hash_hmac('sha256', "$header.$payload", JWT_SECRET, true));
    if (!hash_equals($expected, $sig)) return null;
    $data = json_decode(base64url_decode($payload), true);
    if (!$data || $data['exp'] < time()) return null;
    return $data;
}

// Also patch the optional-auth pattern used in feed & profile endpoints
function getOptionalAuth(): ?array {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION']
        ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
        ?? (function_exists('getallheaders') ? (getallheaders()['Authorization'] ?? '') : '');
    if (preg_match('/^Bearer\s+(.+)$/', $authHeader, $m)) {
        return verifyToken($m[1]);
    }
    return null;
}

function requireAuth(): array {
    // Try multiple sources — Apache strips Authorization in some XAMPP configs
    $authHeader = $_SERVER['HTTP_AUTHORIZATION']
        ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
        ?? (function_exists('getallheaders') ? (getallheaders()['Authorization'] ?? '') : '');

    if (!preg_match('/^Bearer\s+(.+)$/', $authHeader, $m)) {
        http_response_code(401);
        die(json_encode(['error' => 'Authentication required']));
    }
    $data = verifyToken($m[1]);
    if (!$data) {
        http_response_code(401);
        die(json_encode(['error' => 'Invalid or expired token']));
    }
    return $data; // ['sub' => userId, 'role' => role]
}

function requireRole(string ...$roles): array {
    $auth = requireAuth();
    if (!in_array($auth['role'], $roles)) {
        http_response_code(403);
        die(json_encode(['error' => 'Insufficient permissions']));
    }
    return $auth;
}

function base64url_encode(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64url_decode(string $data): string {
    return base64_decode(strtr($data, '-_', '+/'));
}
