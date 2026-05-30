<?php
// GET    /api/conversations              - list user conversations
// GET    /api/conversations/:id/messages - messages
// POST   /api/conversations              - create (DM or group)
// POST   /api/conversations/:id/messages - send message
// DELETE /api/conversations/:id/messages/:msgId - delete message
// PUT    /api/conversations/:id/mark-uread - mark unread

$db = getDB();
$auth = requireAuth();

switch ($method) {
    case 'GET':
        if ($id && $action === 'messages') {
            // Verify participation
            $stmt = $db->prepare('SELECT 1 FROM conversation_participants WHERE conversation_id=? AND user_id=?');
            $stmt->execute([(int)$id, $auth['sub']]);
            if (!$stmt->fetch()) { http_response_code(403); echo json_encode(['error'=>'Not a participant']); break; }

            $page   = max(1,(int)($_GET['page']??1));
            $limit  = min(100,max(1,(int)($_GET['limit']??50)));
            $offset = ($page-1)*$limit;

            $stmt = $db->prepare("SELECT m.*, u.username, u.display_name, u.avatar_url
                FROM messages m JOIN users u ON u.id=m.sender_id
                WHERE m.conversation_id=? AND m.is_deleted=0
                ORDER BY m.created_at ASC LIMIT ? OFFSET ?");
            $stmt->execute([(int)$id, $limit, $offset]);
            $messages = $stmt->fetchAll();

            // Mark as read
            $db->prepare('UPDATE conversation_participants SET last_read_at=NOW() WHERE conversation_id=? AND user_id=?')->execute([(int)$id, $auth['sub']]);

            echo json_encode(['messages' => $messages]);
            break;
        }

        // List conversations
        $stmt = $db->prepare("SELECT cv.*, cp.role AS my_role, cp.last_read_at,
            (SELECT COUNT(*) FROM messages m WHERE m.conversation_id=cv.id AND m.is_deleted=0 AND m.created_at > COALESCE(cp.last_read_at,'1970-01-01')) AS unread_count,
            (SELECT m2.content FROM messages m2 WHERE m2.conversation_id=cv.id AND m2.is_deleted=0 ORDER BY m2.created_at DESC LIMIT 1) AS last_message,
            (SELECT m2.created_at FROM messages m2 WHERE m2.conversation_id=cv.id AND m2.is_deleted=0 ORDER BY m2.created_at DESC LIMIT 1) AS last_message_at
            FROM conversations cv
            JOIN conversation_participants cp ON cp.conversation_id=cv.id AND cp.user_id=?
            ORDER BY last_message_at DESC");
        $stmt->execute([$auth['sub']]);
        $convs = $stmt->fetchAll();

        // For DMs, get the other participant
        foreach ($convs as &$conv) {
            if (!$conv['is_group']) {
                $stmt2 = $db->prepare("SELECT u.id, u.username, u.display_name, u.avatar_url FROM conversation_participants cp JOIN users u ON u.id=cp.user_id WHERE cp.conversation_id=? AND cp.user_id != ?");
                $stmt2->execute([$conv['id'], $auth['sub']]);
                $conv['other_user'] = $stmt2->fetch();
            } else {
                $stmt2 = $db->prepare("SELECT u.id, u.username, u.display_name, u.avatar_url FROM conversation_participants cp JOIN users u ON u.id=cp.user_id WHERE cp.conversation_id=? LIMIT 5");
                $stmt2->execute([$conv['id']]);
                $conv['participants'] = $stmt2->fetchAll();
            }
        }

        echo json_encode(['conversations' => $convs]);
        break;

    case 'POST':
        if ($id && $action === 'messages') {
            $stmt = $db->prepare('SELECT 1 FROM conversation_participants WHERE conversation_id=? AND user_id=?');
            $stmt->execute([(int)$id, $auth['sub']]);
            if (!$stmt->fetch()) { http_response_code(403); echo json_encode(['error'=>'Not a participant']); break; }

            $content = trim($body['content'] ?? '');
            if (!$content) { http_response_code(422); echo json_encode(['error'=>'Content required']); break; }
            if (strlen($content) > 5000) { http_response_code(422); echo json_encode(['error'=>'Message too long']); break; }

            $db->prepare('INSERT INTO messages (conversation_id, sender_id, content) VALUES (?,?,?)')->execute([(int)$id, $auth['sub'], $content]);
            $msgId = (int)$db->lastInsertId();

            // Notify other participants
            $pStmt = $db->prepare('SELECT user_id FROM conversation_participants WHERE conversation_id=? AND user_id!=?');
            $pStmt->execute([(int)$id, $auth['sub']]);
            foreach ($pStmt->fetchAll() as $p) {
                $db->prepare("INSERT INTO notifications (user_id, actor_id, type, entity_type, entity_id, content) VALUES (?,?,'message','conversation',?,?)"
                )->execute([$p['user_id'], $auth['sub'], (int)$id, 'New message']);
            }

            http_response_code(201);
            echo json_encode(['id' => $msgId]);
            break;
        }

        // Create conversation
        $isGroup      = !empty($body['is_group']);
        $name         = trim($body['name'] ?? '');
        $participants = $body['participants'] ?? []; // array of user_ids

        if (empty($participants)) { http_response_code(422); echo json_encode(['error'=>'participants required']); break; }

        // For DM: check existing conversation
        if (!$isGroup && count($participants) === 1) {
            $otherId = (int)$participants[0];
            $stmt = $db->prepare("SELECT cv.id FROM conversations cv
                JOIN conversation_participants cp1 ON cp1.conversation_id=cv.id AND cp1.user_id=?
                JOIN conversation_participants cp2 ON cp2.conversation_id=cv.id AND cp2.user_id=?
                WHERE cv.is_group=0 LIMIT 1");
            $stmt->execute([$auth['sub'], $otherId]);
            $existing = $stmt->fetch();
            if ($existing) {
                echo json_encode(['id' => $existing['id'], 'existing' => true]);
                break;
            }
        }

        $db->prepare('INSERT INTO conversations (name, is_group, created_by) VALUES (?,?,?)')->execute([$name ?: null, $isGroup ? 1 : 0, $auth['sub']]);
        $convId = (int)$db->lastInsertId();

        // Add creator
        $db->prepare('INSERT INTO conversation_participants (conversation_id, user_id, role) VALUES (?,?,\'admin\')')->execute([$convId, $auth['sub']]);
        // Add others
        foreach ($participants as $uid) {
            if ((int)$uid !== $auth['sub']) {
                $db->prepare('INSERT IGNORE INTO conversation_participants (conversation_id, user_id) VALUES (?,?)')->execute([$convId, (int)$uid]);
            }
        }

        http_response_code(201);
        echo json_encode(['id' => $convId]);
        break;
    case 'PUT':
        if ($id && $action === 'mark-unread'){
            $stmt = $db->prepare('SELECT 1 FROM conversation_participants WHERE conversation_id=? AND user_id=?');
            $stmt->execute([(int)$id, $auth['sub']]);

            $stmt = $db->prepare('UPDATE conversation_participants SET last_read_at=NULL WHERE conversation_id=? AND user_id=?');
            $stmt->execute([(int)$id,$auth['sub']]);

            http_response_code(200);
            echo json_encode(['success' => true]);

            break;
        }
        if ($id && $action === 'mark-read'){
            $stmt = $db->prepare('SELECT 1 FROM conversation_participants WHERE conversation_id=? AND user_id=?');
            $stmt->execute([(int)$id, $auth['sub']]);

            $stmt = $db->prepare('UPDATE conversation_participants SET last_read_at=NOW() WHERE conversation_id=? AND user_id=?');
            $stmt->execute([(int)$id,$auth['sub']]);

            http_response_code(200);
            echo json_encode(['success' => true]);

            break;
        }
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}
