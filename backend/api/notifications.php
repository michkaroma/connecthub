<?php

// GET    /api/notifications           - list (auth)
// POST   /api/notifications/read-all  - mark all read
// PUT    /api/notifications/:id       - mark read/unread

$db = getDB();
$auth = requireAuth();

switch ($method) {
    case 'GET':
        $stmt = $db->prepare("SELECT n.*, u.username AS actor_username, u.display_name AS actor_name, u.avatar_url AS actor_avatar
            FROM notifications n LEFT JOIN users u ON u.id=n.actor_id
            WHERE n.user_id=? ORDER BY n.created_at DESC LIMIT 50");
        $stmt->execute([$auth['sub']]);
        $notifications = $stmt->fetchAll();

        $unread = array_filter($notifications, fn($n) => !$n['is_read']);
        echo json_encode(['notifications' => $notifications, 'unread_count' => count($unread)]);
        break;

    case 'POST':
        if ($id === 'read-all') {
            $db->prepare('UPDATE notifications SET is_read=1 WHERE user_id=?')->execute([$auth['sub']]);
            echo json_encode(['updated' => true]);
        }
        break;

    case 'PUT':
        if (!$id) { http_response_code(400); echo json_encode(['error'=>'ID required']); break; }
        $isRead = (int)($body['is_read'] ?? 1);
        $db->prepare('UPDATE notifications SET is_read=? WHERE id=? AND user_id=?')->execute([$isRead, (int)$id, $auth['sub']]);
        echo json_encode(['updated' => true]);
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}
