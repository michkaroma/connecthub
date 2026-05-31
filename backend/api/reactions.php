<?php

$db   = getDB();
$auth = requireAuth();

if ($method === 'POST') {
    $targetType = $body['target_type'] ?? '';
    $targetId   = (int)($body['target_id'] ?? 0);
    $emoji      = $body['emoji'] ?? '👍';

    if (!in_array($targetType, ['post', 'comment']) || !$targetId) {
        http_response_code(422);
        echo json_encode(['error' => 'Invalid target']);
        return;
    }

    // est ce que il y a déjà une réaction de cet utilisateur sur cette cible ?
    $stmt = $db->prepare('SELECT id, emoji FROM reactions WHERE user_id=? AND target_type=? AND target_id=?');
    $stmt->execute([$auth['sub'], $targetType, $targetId]);
    $existing = $stmt->fetch();

    if ($existing) {
        if ($existing['emoji'] === $emoji) {
            // si c'est le même emoji → supprimer
            $db->prepare('DELETE FROM reactions WHERE id=?')->execute([$existing['id']]);
            echo json_encode(['action' => 'removed', 'emoji' => $emoji]);
        } else {
            // si c'est un emoji différent → mettre à jour
            $db->prepare('UPDATE reactions SET emoji=? WHERE id=?')->execute([$emoji, $existing['id']]);
            echo json_encode(['action' => 'updated', 'emoji' => $emoji]);
        }
        return;
    }

    // Nouvelle réaction
    $db->prepare('INSERT INTO reactions (user_id, target_type, target_id, emoji) VALUES (?,?,?,?)')->execute([$auth['sub'], $targetType, $targetId, $emoji]);

    // Notify author
    if ($targetType === 'post') {
        $stmt2 = $db->prepare('SELECT author_id FROM posts WHERE id=?');
        $stmt2->execute([$targetId]);
        $post = $stmt2->fetch();
        if ($post && $post['author_id'] != $auth['sub']) {
            $db->prepare("INSERT INTO notifications (user_id, actor_id, type, entity_type, entity_id, content) VALUES (?,?,'like','post',?,?)")
               ->execute([$post['author_id'], $auth['sub'], $targetId, 'Someone liked your post']);
        }
    } elseif ($targetType === 'comment') {
        $stmt2 = $db->prepare('SELECT author_id FROM comments WHERE id=?');
        $stmt2->execute([$targetId]);
        $comment = $stmt2->fetch();
        if ($comment && $comment['author_id'] != $auth['sub']) {
            $db->prepare("INSERT INTO notifications (user_id, actor_id, type, entity_type, entity_id, content) VALUES (?,?,'like','comment',?,?)")
               ->execute([$comment['author_id'], $auth['sub'], $targetId, 'Someone liked your comment']);
        }
    }

    echo json_encode(['action' => 'added', 'emoji' => $emoji]);

} elseif ($method === 'DELETE') {
    $targetType = $body['target_type'] ?? '';
    $targetId   = (int)($body['target_id'] ?? 0);

    if (!in_array($targetType, ['post', 'comment']) || !$targetId) {
        http_response_code(422);
        echo json_encode(['error' => 'Invalid target']);
        return;
    }

    $db->prepare('DELETE FROM reactions WHERE user_id=? AND target_type=? AND target_id=?')
       ->execute([$auth['sub'], $targetType, $targetId]);
    echo json_encode(['action' => 'removed']);

} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}
