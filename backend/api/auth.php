<?php
$db = getDB();

switch ("$method:$id") {
    case 'POST:register':
        $username = trim($body['username'] ?? '');
        $email    = trim($body['email'] ?? '');
        $password = $body['password'] ?? '';
        $name     = trim($body['display_name'] ?? $username);

        // Validation
        $errors = [];
        if (!preg_match('/^[a-zA-Z0-9_]{3,50}$/', $username))
            $errors[] = 'Username must be 3-50 alphanumeric characters';
        if (!filter_var($email, FILTER_VALIDATE_EMAIL))
            $errors[] = 'Invalid email';
        if (strlen($password) < 8)
            $errors[] = 'Password must be at least 8 characters';
        if (!empty($errors)) {
            http_response_code(422);
            echo json_encode(['errors' => $errors]);
            break;
        }

        // Check 
        $stmt = $db->prepare('SELECT id FROM users WHERE username=? OR email=?');
        $stmt->execute([$username, $email]);
        if ($stmt->fetch()) {
            http_response_code(409);
            echo json_encode(['error' => 'Username or email already taken']);
            break;
        }

        $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
        $stmt = $db->prepare('INSERT INTO users (username,email,password,display_name) VALUES (?,?,?,?)');
        $stmt->execute([$username, $email, $hash, $name]);
        $userId = (int)$db->lastInsertId();

        $token = generateToken($userId, 'user');
        echo json_encode(['token' => $token, 'user' => [
            'id' => $userId, 'username' => $username,
            'display_name' => $name, 'role' => 'user'
        ]]);
        break;

    // ── Login ─────────────────────────────────────────────────────────────────
    case 'POST:login':
        $identifier = trim($body['identifier'] ?? ''); // username or email
        $password   = $body['password'] ?? '';

        $stmt = $db->prepare('SELECT * FROM users WHERE (username=? OR email=?) AND is_banned=0');
        $stmt->execute([$identifier, $identifier]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password'])) {
            http_response_code(401);
            echo json_encode(['error' => 'Invalid credentials']);
            break;
        }

        $token = generateToken((int)$user['id'], $user['role']);
        unset($user['password']);
        echo json_encode(['token' => $token, 'user' => $user]);
        break;

    // ── Me ────────────────────────────────────────────────────────────────────
    case 'GET:me':
        $auth = requireAuth();
        $stmt = $db->prepare('SELECT id,username,email,display_name,bio,avatar_url,cover_url,role,is_verified,created_at FROM users WHERE id=?');
        $stmt->execute([$auth['sub']]);
        $user = $stmt->fetch();
        if (!$user) { http_response_code(404); echo json_encode(['error'=>'User not found']); break; }
        echo json_encode($user);
        break;

    default:
        http_response_code(404);
        echo json_encode(['error' => 'Auth route not found']);
}
