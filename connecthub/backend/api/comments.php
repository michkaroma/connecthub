<?php
// POST   /api/comments           - create comment
// PUT    /api/comments/:id       - update
// DELETE /api/comments/:id       - delete

$db = getDB();

switch ($method) {
    case 'POST':
        $auth    = requireAuth();
        $postId  = (int)($body['post_id'] ?? 0);
        $content = trim($body['content'] ?? '');
        $parentId = !empty($body['parent_id']) ? (int)$body['parent_id'] : null;

        if (!$postId || !$content) {
            http_response_code(422);
            echo json_encode(['error' => 'post_id and content required']);
            break;
        }
        if (strlen($content) > 2000) {
            http_response_code(422);
            echo json_encode(['error' => 'Comment too long']);
            break;
        }

        $stmt = $db->prepare('SELECT id, author_id FROM posts WHERE id=? AND is_deleted=0');
        $stmt->execute([$postId]);
        $post = $stmt->fetch();
        if (!$post) { http_response_code(404); echo json_encode(['error'=>'Post not found']); break; }

        $db->prepare('INSERT INTO comments (post_id, author_id, parent_id, content) VALUES (?,?,?,?)')->execute([$postId, $auth['sub'], $parentId, $content]);
        $commentId = (int)$db->lastInsertId();

        // Notify post author
        if ($post['author_id'] != $auth['sub']) {
            $db->prepare("INSERT INTO notifications (user_id, actor_id, type, entity_type, entity_id, content) VALUES (?,?,'comment','post',?,?)"
            )->execute([$post['author_id'], $auth['sub'], $postId, 'Someone commented on your post']);
        }

        http_response_code(201);
        echo json_encode(['id' => $commentId, 'message' => 'Comment created']);
        break;

    case 'PUT':
        $auth = requireAuth();
        if (!$id) { http_response_code(400); echo json_encode(['error'=>'Comment ID required']); break; }

        $stmt = $db->prepare('SELECT author_id FROM comments WHERE id=? AND is_deleted=0');
        $stmt->execute([(int)$id]);
        $comment = $stmt->fetch();
        if (!$comment) { http_response_code(404); echo json_encode(['error'=>'Not found']); break; }
        if ($comment['author_id'] != $auth['sub'] && !in_array($auth['role'],['admin','moderator'])) {
            http_response_code(403); echo json_encode(['error'=>'Forbidden']); break;
        }

        $content = trim($body['content'] ?? '');
        if (!$content) { http_response_code(422); echo json_encode(['error'=>'Content required']); break; }
        $db->prepare('UPDATE comments SET content=?, updated_at=NOW() WHERE id=?')->execute([$content, (int)$id]);
        echo json_encode(['updated' => true]);
        break;

    case 'DELETE':
        $auth = requireAuth();
        if (!$id) { http_response_code(400); echo json_encode(['error'=>'Comment ID required']); break; }

        $stmt = $db->prepare('SELECT author_id FROM comments WHERE id=? AND is_deleted=0');
        $stmt->execute([(int)$id]);
        $comment = $stmt->fetch();
        if (!$comment) { http_response_code(404); echo json_encode(['error'=>'Not found']); break; }
        if ($comment['author_id'] != $auth['sub'] && !in_array($auth['role'],['admin','moderator'])) {
            http_response_code(403); echo json_encode(['error'=>'Forbidden']); break;
        }
        $db->prepare('UPDATE comments SET is_deleted=1 WHERE id=?')->execute([(int)$id]);
        echo json_encode(['deleted' => true]);
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}
