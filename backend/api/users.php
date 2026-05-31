<?php


$db = getDB();

switch ($method) {
    case 'GET':
        if (!$id) { http_response_code(400); echo json_encode(['error'=>'User ID required']); break; }

        if ($action === 'posts') {
            $page = max(1,(int)($_GET['page']??1));
            $limit = min(50,max(1,(int)($_GET['limit']??20)));
            $offset = ($page-1)*$limit;
            $stmt = $db->prepare("SELECT p.*, u.username, u.display_name, u.avatar_url,
                (SELECT COUNT(*) FROM reactions r WHERE r.target_type='post' AND r.target_id=p.id) AS reaction_count,
                (SELECT COUNT(*) FROM comments c WHERE c.post_id=p.id AND c.is_deleted=0) AS comment_count
                FROM posts p JOIN users u ON u.id=p.author_id
                WHERE p.author_id=? AND p.is_deleted=0
                ORDER BY p.created_at DESC LIMIT ? OFFSET ?");
            $stmt->execute([(int)$id, $limit, $offset]);
            echo json_encode(['posts' => $stmt->fetchAll()]);
            break;
        }

        if ($action === 'followers') {
            $stmt = $db->prepare("SELECT u.id, u.username, u.display_name, u.avatar_url FROM follows f JOIN users u ON u.id=f.follower_id WHERE f.following_id=?");
            $stmt->execute([(int)$id]);
            echo json_encode(['followers' => $stmt->fetchAll()]);
            break;
        }

        if ($action === 'following') {
            $stmt = $db->prepare("SELECT u.id, u.username, u.display_name, u.avatar_url FROM follows f JOIN users u ON u.id=f.following_id WHERE f.follower_id=?");
            $stmt->execute([(int)$id]);
            echo json_encode(['following' => $stmt->fetchAll()]);
            break;
        }

    
        $stmt = $db->prepare("SELECT id, username, display_name, bio, avatar_url, cover_url, role, is_verified, created_at,
            (SELECT COUNT(*) FROM follows WHERE following_id=u.id) AS followers_count,
            (SELECT COUNT(*) FROM follows WHERE follower_id=u.id) AS following_count,
            (SELECT COUNT(*) FROM posts WHERE author_id=u.id AND is_deleted=0) AS posts_count
            FROM users u WHERE id=? AND is_banned=0");
        $stmt->execute([(int)$id]);
        $user = $stmt->fetch();
        if (!$user) { http_response_code(404); echo json_encode(['error'=>'User not found']); break; }

        // Is current user following?
        $auth = getOptionalAuth();
        if ($auth) {
            $stmt2 = $db->prepare('SELECT 1 FROM follows WHERE follower_id=? AND following_id=?');
            $stmt2->execute([$auth['sub'], (int)$id]);
            $user['is_following'] = (bool)$stmt2->fetch();
        }
        echo json_encode($user);
        break;

    case 'PUT':
        $auth = requireAuth();
        if (!$id || $auth['sub'] != (int)$id) { http_response_code(403); echo json_encode(['error'=>'Forbidden']); break; }

        $allowed = ['display_name','bio','avatar_url','cover_url'];
        $sets = [];
        $params = [];
        foreach ($allowed as $field) {
            if (isset($body[$field])) {
                $sets[] = "$field=?";
                $params[] = $body[$field];
            }
        }
        if (!$sets) { http_response_code(422); echo json_encode(['error'=>'Nothing to update']); break; }
        $params[] = (int)$id;
        $db->prepare('UPDATE users SET ' . implode(',', $sets) . ' WHERE id=?')->execute($params);
        echo json_encode(['updated' => true]);
        break;

    case 'POST':
        if ($action === 'follow') {
            $auth = requireAuth();
            $targetId = (int)$id;
            if ($targetId === $auth['sub']) { http_response_code(400); echo json_encode(['error'=>'Cannot follow yourself']); break; }

            $stmt = $db->prepare('SELECT 1 FROM follows WHERE follower_id=? AND following_id=?');
            $stmt->execute([$auth['sub'], $targetId]);
            if ($stmt->fetch()) { http_response_code(409); echo json_encode(['error'=>'Already following']); break; }

            $db->prepare('INSERT INTO follows (follower_id, following_id) VALUES (?,?)')->execute([$auth['sub'], $targetId]);

            // Create notification
            $db->prepare("INSERT INTO notifications (user_id, actor_id, type, entity_type, entity_id, content) VALUES (?,?,'follow','user',?,?)
            ")->execute([$targetId, $auth['sub'], $auth['sub'], 'Someone followed you']);

            echo json_encode(['following' => true]);
            break;
        }
        http_response_code(404);
        echo json_encode(['error'=>'Action not found']);
        break;

    case 'DELETE':
        if ($action === 'follow') {
            $auth = requireAuth();
            $db->prepare('DELETE FROM follows WHERE follower_id=? AND following_id=?')->execute([$auth['sub'], (int)$id]);
            echo json_encode(['following' => false]);
            break;
        }
        http_response_code(404);
        echo json_encode(['error'=>'Action not found']);
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}
