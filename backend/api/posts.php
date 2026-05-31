<?php

// GET    /api/posts/:id          - single post
// POST   /api/posts              - create
// PUT    /api/posts/:id          - update
// DELETE /api/posts/:id          - delete
// GET    /api/posts/:id/comments - comments
// POST   /api/posts/:id/share    - share

$db = getDB();

switch ($method) {
    // ── Feed ──────────────────────────────────────────────────────────────────
    case 'GET':
        if (!$id) {
            // Optional auth for personalized feed
            $auth = getOptionalAuth();

            $page  = max(1, (int)($_GET['page']  ?? 1));
            $limit = min(50, max(1, (int)($_GET['limit'] ?? 20)));
            $offset = ($page - 1) * $limit;
            $filter = $_GET['filter'] ?? 'recent'; // recent | following | trending
            $communityId = $_GET['community'] ?? null;

            $where = ['p.is_deleted = 0'];
            $params = [];

            if ($communityId) {
                $where[] = 'p.community_id = ?';
                $params[] = (int)$communityId;
            } elseif ($filter === 'following' && $auth) {
                $where[] = '(p.author_id IN (SELECT following_id FROM follows WHERE follower_id=?) OR p.author_id=?)';
                $params[] = $auth['sub'];
                $params[] = $auth['sub'];
            }

            $orderBy = $filter === 'trending'
                ? '(SELECT COUNT(*) FROM reactions r WHERE r.target_type=\'post\' AND r.target_id=p.id) DESC, p.created_at DESC'
                : 'p.created_at DESC';

            $whereStr = implode(' AND ', $where);

            $sql = "SELECT p.*,
                        u.username, u.display_name, u.avatar_url,
                        (SELECT COUNT(*) FROM reactions r WHERE r.target_type='post' AND r.target_id=p.id) AS reaction_count,
                        (SELECT COUNT(*) FROM comments c WHERE c.post_id=p.id AND c.is_deleted=0) AS comment_count,
                        c.name AS community_name, c.slug AS community_slug
                    FROM posts p
                    JOIN users u ON u.id = p.author_id
                    LEFT JOIN communities c ON c.id = p.community_id
                    WHERE $whereStr
                    ORDER BY $orderBy
                    LIMIT ? OFFSET ?";
            $params[] = $limit;
            $params[] = $offset;

            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            $posts = $stmt->fetchAll();

            // Add user reaction and following status if authenticated
            if ($auth) {
                $postIds = array_column($posts, 'id');
                if ($postIds) {
                    $placeholders = implode(',', array_fill(0, count($postIds), '?'));

                    // User reactions
                    $rStmt = $db->prepare("SELECT target_id, emoji FROM reactions WHERE user_id=? AND target_type='post' AND target_id IN ($placeholders)");
                    $rStmt->execute(array_merge([$auth['sub']], $postIds));
                    $userReactions = [];
                    foreach ($rStmt->fetchAll() as $r) {
                        $userReactions[$r['target_id']] = $r['emoji'];
                    }

                    // Following status for each post author
                    $authorIds = array_unique(array_column($posts, 'author_id'));
                    $authorPlaceholders = implode(',', array_fill(0, count($authorIds), '?'));
                    $fStmt = $db->prepare("SELECT following_id FROM follows WHERE follower_id=? AND following_id IN ($authorPlaceholders)");
                    $fStmt->execute(array_merge([$auth['sub']], $authorIds));
                    $followingIds = [];
                    foreach ($fStmt->fetchAll() as $f) {
                        $followingIds[$f['following_id']] = true;
                    }

                    // Shared posts by current user
                    $sStmt = $db->prepare("SELECT post_id FROM shares WHERE user_id=? AND post_id IN ($placeholders)");
                    $sStmt->execute(array_merge([$auth['sub']], $postIds));
                    $sharedPostIds = [];
                    foreach ($sStmt->fetchAll() as $s) {
                        $sharedPostIds[$s['post_id']] = true;
                    }

                    foreach ($posts as &$post) {
                        $post['user_reaction']      = $userReactions[$post['id']] ?? null;
                        $post['is_following_author'] = isset($followingIds[$post['author_id']]);
                        $post['user_shared']         = isset($sharedPostIds[$post['id']]);
                    }
                }
            }

            echo json_encode(['posts' => $posts, 'page' => $page, 'limit' => $limit]);
            break;
        }

        if ($action === 'comments') {
            $stmt = $db->prepare("SELECT c.*, u.username, u.display_name, u.avatar_url,
                (SELECT COUNT(*) FROM reactions r WHERE r.target_type='comment' AND r.target_id=c.id) AS reaction_count
                FROM comments c JOIN users u ON u.id=c.author_id
                WHERE c.post_id=? AND c.is_deleted=0 AND c.parent_id IS NULL
                ORDER BY c.created_at ASC");
            $stmt->execute([(int)$id]);
            $comments = $stmt->fetchAll();

            // Add user_reaction per comment if authenticated
            $auth = getOptionalAuth();
            if ($auth && $comments) {
                $commentIds = array_column($comments, 'id');
                $placeholders = implode(',', array_fill(0, count($commentIds), '?'));
                $rStmt = $db->prepare("SELECT target_id, emoji FROM reactions WHERE user_id=? AND target_type='comment' AND target_id IN ($placeholders)");
                $rStmt->execute(array_merge([$auth['sub']], $commentIds));
                $userReactions = [];
                foreach ($rStmt->fetchAll() as $r) {
                    $userReactions[$r['target_id']] = $r['emoji'];
                }
                foreach ($comments as &$c) {
                    $c['user_reaction'] = $userReactions[$c['id']] ?? null;
                }
            }

            echo json_encode(['comments' => $comments]);
            break;
        }

        // Single post
        $stmt = $db->prepare("SELECT p.*, u.username, u.display_name, u.avatar_url,
            (SELECT COUNT(*) FROM reactions r WHERE r.target_type='post' AND r.target_id=p.id) AS reaction_count,
            (SELECT COUNT(*) FROM comments c WHERE c.post_id=p.id AND c.is_deleted=0) AS comment_count
            FROM posts p JOIN users u ON u.id=p.author_id WHERE p.id=? AND p.is_deleted=0");
        $stmt->execute([(int)$id]);
        $post = $stmt->fetch();
        if (!$post) { http_response_code(404); echo json_encode(['error' => 'Post not found']); break; }
        echo json_encode($post);
        break;

    // ── Create ────────────────────────────────────────────────────────────────
    case 'POST':
        if ($id && $action === 'share') {
            $auth = requireAuth();
            $postId = (int)$id;

            // Check post exists
            $stmt = $db->prepare('SELECT id, author_id, share_count FROM posts WHERE id=? AND is_deleted=0');
            $stmt->execute([$postId]);
            $post = $stmt->fetch();
            if (!$post) { http_response_code(404); echo json_encode(['error'=>'Post not found']); break; }

            // Prevent duplicate share
            $stmt = $db->prepare('SELECT id FROM shares WHERE user_id=? AND post_id=?');
            $stmt->execute([$auth['sub'], $postId]);
            if ($stmt->fetch()) { http_response_code(409); echo json_encode(['error'=>'Already shared']); break; }

            $db->prepare('INSERT INTO shares (user_id, post_id) VALUES (?,?)')->execute([$auth['sub'], $postId]);
            $db->prepare('UPDATE posts SET share_count = share_count + 1 WHERE id=?')->execute([$postId]);

            // Notify post author
            if ($post['author_id'] != $auth['sub']) {
                $db->prepare("INSERT INTO notifications (user_id, actor_id, type, entity_type, entity_id, content) VALUES (?,?,'share','post',?,?)"
                )->execute([$post['author_id'], $auth['sub'], $postId, 'Someone shared your post']);
            }

            echo json_encode(['shared' => true, 'share_count' => $post['share_count'] + 1]);
            break;
        }

        $auth = requireAuth();
        $content = trim($body['content'] ?? '');

        // Anti-spam: block empty or duplicate consecutive posts
        if (strlen($content) < 1) {
            http_response_code(422);
            echo json_encode(['error' => 'Content cannot be empty']);
            break;
        }
        if (strlen($content) > 5000) {
            http_response_code(422);
            echo json_encode(['error' => 'Content too long (max 5000 chars)']);
            break;
        }

        // Check duplicate (same content in last 60s)
        $stmt = $db->prepare('SELECT id FROM posts WHERE author_id=? AND content=? AND created_at > DATE_SUB(NOW(), INTERVAL 60 SECOND)');
        $stmt->execute([$auth['sub'], $content]);
        if ($stmt->fetch()) {
            http_response_code(429);
            echo json_encode(['error' => 'Duplicate post detected']);
            break;
        }

        $communityId = !empty($body['community_id']) ? (int)$body['community_id'] : null;
        $mediaUrl    = $body['media_url']  ?? null;
        $mediaType   = $body['media_type'] ?? null;
        $linkUrl     = $body['link_url']   ?? null;

        // Validate community membership
        if ($communityId) {
            $stmt = $db->prepare('SELECT role FROM community_members WHERE community_id=? AND user_id=?');
            $stmt->execute([$communityId, $auth['sub']]);
            if (!$stmt->fetch()) {
                http_response_code(403);
                echo json_encode(['error' => 'You must be a member to post in this community']);
                break;
            }
        }

        $stmt = $db->prepare('INSERT INTO posts (author_id, community_id, content, media_url, media_type, link_url) VALUES (?,?,?,?,?,?)');
        $stmt->execute([$auth['sub'], $communityId, $content, $mediaUrl, $mediaType, $linkUrl]);
        $postId = (int)$db->lastInsertId();

        // Extract and save hashtags
        preg_match_all('/#(\w+)/', $content, $matches);
        foreach (array_unique($matches[1]) as $tag) {
            $tag = strtolower(substr($tag, 0, 100));
            $db->prepare('INSERT IGNORE INTO hashtags (tag) VALUES (?)')->execute([$tag]);
            $stmt = $db->prepare('SELECT id FROM hashtags WHERE tag=?');
            $stmt->execute([$tag]);
            $hashtagId = (int)$stmt->fetchColumn();
            $db->prepare('INSERT IGNORE INTO post_hashtags (post_id, hashtag_id) VALUES (?,?)')->execute([$postId, $hashtagId]);
        }

        http_response_code(201);
        echo json_encode(['id' => $postId, 'message' => 'Post created']);
        break;

    // ── Update ────────────────────────────────────────────────────────────────
    case 'PUT':
        $auth = requireAuth();
        if (!$id) { http_response_code(400); echo json_encode(['error'=>'Post ID required']); break; }

        $stmt = $db->prepare('SELECT author_id FROM posts WHERE id=? AND is_deleted=0');
        $stmt->execute([(int)$id]);
        $post = $stmt->fetch();
        if (!$post) { http_response_code(404); echo json_encode(['error'=>'Not found']); break; }
        if ($post['author_id'] != $auth['sub'] && !in_array($auth['role'], ['admin','moderator'])) {
            http_response_code(403); echo json_encode(['error'=>'Forbidden']); break;
        }

        $content = trim($body['content'] ?? '');
        if (!$content) { http_response_code(422); echo json_encode(['error'=>'Content required']); break; }

        $db->prepare('UPDATE posts SET content=?, updated_at=NOW() WHERE id=?')->execute([$content, (int)$id]);
        echo json_encode(['updated' => true]);
        break;

    // ── Delete ────────────────────────────────────────────────────────────────
    case 'DELETE':
        $auth = requireAuth();
        if (!$id) { http_response_code(400); echo json_encode(['error'=>'Post ID required']); break; }

        $stmt = $db->prepare('SELECT author_id FROM posts WHERE id=? AND is_deleted=0');
        $stmt->execute([(int)$id]);
        $post = $stmt->fetch();
        if (!$post) { http_response_code(404); echo json_encode(['error'=>'Not found']); break; }
        if ($post['author_id'] != $auth['sub'] && !in_array($auth['role'], ['admin','moderator'])) {
            http_response_code(403); echo json_encode(['error'=>'Forbidden']); break;
        }

        $db->prepare('UPDATE posts SET is_deleted=1 WHERE id=?')->execute([(int)$id]);
        echo json_encode(['deleted' => true]);
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}
