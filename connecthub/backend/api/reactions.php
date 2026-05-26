<?php
// reactions.php
// POST   /api/reactions          - toggle reaction
// DELETE /api/reactions          - remove

$db = getDB();
$auth = requireAuth();

if ($method === 'POST') {
    $targetType = $body['target_type'] ?? '';
    $targetId   = (int)($body['target_id'] ?? 0);
    $emoji      = $body['emoji'] ?? '👍';

    if (!in_array($targetType, ['post','comment']) || !$targetId) {
        http_response_code(422);
        echo json_encode(['error' => 'Invalid target']);
        break;
    }

    $stmt = $db->prepare('SELECT id FROM reactions WHERE user_id=? AND target_type=? AND target_id=?');
    $stmt->execute([$auth['sub'], $targetType, $targetId]);
    $existing = $stmt->fetch();

    if ($existing) {
        // Toggle off or change emoji
        $db->prepare('UPDATE reactions SET emoji=? WHERE id=?')->execute([$emoji, $existing['id']]);
        echo json_encode(['action' => 'updated', 'emoji' => $emoji]);
    } else {
        $db->prepare('INSERT INTO reactions (user_id, target_type, target_id, emoji) VALUES (?,?,?,?)')->execute([$auth['sub'], $targetType, $targetId, $emoji]);

        // Notify post author
        if ($targetType === 'post') {
            $stmt2 = $db->prepare('SELECT author_id FROM posts WHERE id=?');
            $stmt2->execute([$targetId]);
            $post = $stmt2->fetch();
            if ($post && $post['author_id'] != $auth['sub']) {
                $db->prepare("INSERT INTO notifications (user_id, actor_id, type, entity_type, entity_id, content) VALUES (?,?,'like','post',?,?)"
                )->execute([$post['author_id'], $auth['sub'], $targetId, 'Someone liked your post']);
            }
        }
        echo json_encode(['action' => 'added', 'emoji' => $emoji]);
    }
} elseif ($method === 'DELETE') {
    $targetType = $body['target_type'] ?? '';
    $targetId   = (int)($body['target_id'] ?? 0);
    $db->prepare('DELETE FROM reactions WHERE user_id=? AND target_type=? AND target_id=?')->execute([$auth['sub'], $targetType, $targetId]);
    echo json_encode(['action' => 'removed']);
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}
