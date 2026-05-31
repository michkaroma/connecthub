<?php

 
$db     = getDB();
$auth   = requireAuth();
$userId = (int)$auth['sub'];
 
switch ($method) {
 
    
    case 'GET':
    
 
        if ($id && $action === 'messages') {
 
            // Permet de vérifier que l'utilisateur est bien participant
            $stmt = $db->prepare(
                'SELECT 1 FROM conversation_participants WHERE conversation_id = ? AND user_id = ?'
            );
            $stmt->execute([(int)$id, $userId]);
            if (!$stmt->fetch()) {
                http_response_code(403);
                echo json_encode(['error' => 'Not a participant']);
                break;
            }
 
            $page   = max(1, (int)($_GET['page']  ?? 1));
            $limit  = min(100, max(1, (int)($_GET['limit'] ?? 50)));
            $offset = ($page - 1) * $limit;
 
            $stmt = $db->prepare(
                "SELECT m.id, m.conversation_id, m.sender_id, m.content, m.created_at,
                        u.username, u.display_name, u.avatar_url
                 FROM messages m
                 JOIN users u ON u.id = m.sender_id
                 WHERE m.conversation_id = ? AND m.is_deleted = 0
                 ORDER BY m.created_at ASC
                 LIMIT ? OFFSET ?"
            );
            $stmt->execute([(int)$id, $limit, $offset]);
            $messages = $stmt->fetchAll(PDO::FETCH_ASSOC);
 
            // Marquer comme lu
            $db->prepare(
                'UPDATE conversation_participants SET last_read_at = NOW()
                 WHERE conversation_id = ? AND user_id = ?'
            )->execute([(int)$id, $userId]);
 
            echo json_encode(['messages' => $messages]);
            break;
        }
 
        // Lister toutes les conversations de l'utilisateur
        $stmt = $db->prepare(
            "SELECT cv.id, cv.name, cv.is_group, cv.created_at,
                    cp.role AS my_role, cp.last_read_at,
                    (SELECT COUNT(*)
                     FROM messages m
                     WHERE m.conversation_id = cv.id
                       AND m.is_deleted = 0
                       AND m.created_at > COALESCE(cp.last_read_at, '1970-01-01')
                    ) AS unread_count,
                    (SELECT m2.content
                     FROM messages m2
                     WHERE m2.conversation_id = cv.id AND m2.is_deleted = 0
                     ORDER BY m2.created_at DESC LIMIT 1
                    ) AS last_message,
                    (SELECT m2.created_at
                     FROM messages m2
                     WHERE m2.conversation_id = cv.id AND m2.is_deleted = 0
                     ORDER BY m2.created_at DESC LIMIT 1
                    ) AS last_message_at
             FROM conversations cv
             JOIN conversation_participants cp ON cp.conversation_id = cv.id AND cp.user_id = ?
             ORDER BY last_message_at DESC"
        );
        $stmt->execute([$userId]);
        $convs = $stmt->fetchAll(PDO::FETCH_ASSOC);
 
        foreach ($convs as &$conv) {
            if (!$conv['is_group']) {
                $stmt2 = $db->prepare(
                    "SELECT u.id, u.username, u.display_name, u.avatar_url
                     FROM conversation_participants cp
                     JOIN users u ON u.id = cp.user_id
                     WHERE cp.conversation_id = ? AND cp.user_id != ?"
                );
                $stmt2->execute([$conv['id'], $userId]);
                $conv['other_user'] = $stmt2->fetch(PDO::FETCH_ASSOC) ?: null;
            } else {
                $stmt2 = $db->prepare(
                    "SELECT u.id, u.username, u.display_name, u.avatar_url
                     FROM conversation_participants cp
                     JOIN users u ON u.id = cp.user_id
                     WHERE cp.conversation_id = ? LIMIT 5"
                );
                $stmt2->execute([$conv['id']]);
                $conv['participants'] = $stmt2->fetchAll(PDO::FETCH_ASSOC);
            }
        }
        unset($conv);
 
        echo json_encode(['conversations' => $convs]);
        break;
 
    case 'POST':
 
        if ($id && $action === 'messages') {
 
            // Vérifier la participation dans le message
            $stmt = $db->prepare(
                'SELECT 1 FROM conversation_participants WHERE conversation_id = ? AND user_id = ?'
            );
            $stmt->execute([(int)$id, $userId]);
            if (!$stmt->fetch()) {
                http_response_code(403);
                echo json_encode(['error' => 'Not a participant']);
                break;
            }
 
            $content = trim($body['content'] ?? '');
            if ($content === '') {
                http_response_code(422);
                echo json_encode(['error' => 'Content required']);
                break;
            }
            if (strlen($content) > 5000) {
                http_response_code(422);
                echo json_encode(['error' => 'Message too long (max 5000 chars)']);
                break;
            }
 
            $db->prepare(
                'INSERT INTO messages (conversation_id, sender_id, content) VALUES (?, ?, ?)'
            )->execute([(int)$id, $userId, $content]);
            $msgId = (int)$db->lastInsertId();
 
            // Récupérer le message complet pour le renvoyer au frontend
            $stmt = $db->prepare(
                "SELECT m.id, m.conversation_id, m.sender_id, m.content, m.created_at,
                        u.username, u.display_name, u.avatar_url
                 FROM messages m
                 JOIN users u ON u.id = m.sender_id
                 WHERE m.id = ?"
            );
            $stmt->execute([$msgId]);
            $message = $stmt->fetch(PDO::FETCH_ASSOC);
 
            // Notifier les autres participants
            $pStmt = $db->prepare(
                'SELECT user_id FROM conversation_participants WHERE conversation_id = ? AND user_id != ?'
            );
            $pStmt->execute([(int)$id, $userId]);
            $notifStmt = $db->prepare(
                "INSERT INTO notifications (user_id, actor_id, type, entity_type, entity_id, content)
                 VALUES (?, ?, 'message', 'conversation', ?, ?)"
            );
            foreach ($pStmt->fetchAll(PDO::FETCH_ASSOC) as $p) {
                $notifStmt->execute([$p['user_id'], $userId, (int)$id, 'New message']);
            }
 
            http_response_code(201);
            echo json_encode($message);
            break;
        }
 
        // Créer une conversation (DM ou groupe)
        $isGroup      = !empty($body['is_group']);
        $name         = trim($body['name'] ?? '');
        $participants = array_map('intval', $body['participants'] ?? []);
        $participants = array_values(array_filter($participants));
 
        if (empty($participants)) {
            http_response_code(422);
            echo json_encode(['error' => 'participants required']);
            break;
        }
 
        $others = array_values(array_filter($participants, fn($uid) => $uid !== $userId));
        if (empty($others)) {
            http_response_code(422);
            echo json_encode(['error' => 'Cannot start a conversation with yourself only']);
            break;
        }
 
        // DM : retourner la conversation existante si elle existe déjà
        if (!$isGroup && count($others) === 1) {
            $otherId = $others[0];
            $stmt = $db->prepare(
                "SELECT cv.id FROM conversations cv
                 JOIN conversation_participants cp1 ON cp1.conversation_id = cv.id AND cp1.user_id = ?
                 JOIN conversation_participants cp2 ON cp2.conversation_id = cv.id AND cp2.user_id = ?
                 WHERE cv.is_group = 0
                 LIMIT 1"
            );
            $stmt->execute([$userId, $otherId]);
            $existing = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($existing) {
                echo json_encode(['id' => (int)$existing['id'], 'existing' => true]);
                break;
            }
        }
 
        $db->prepare(
            'INSERT INTO conversations (name, is_group, created_by) VALUES (?, ?, ?)'
        )->execute([$name ?: null, $isGroup ? 1 : 0, $userId]);
        $convId = (int)$db->lastInsertId();
 
        // Ajouter le créateur en admin
        $db->prepare(
            "INSERT INTO conversation_participants (conversation_id, user_id, role) VALUES (?, ?, 'admin')"
        )->execute([$convId, $userId]);
 
        // Ajouter les autres (vérifier qu'ils existent)
        $addStmt   = $db->prepare(
            'INSERT IGNORE INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)'
        );
        $checkUser = $db->prepare('SELECT 1 FROM users WHERE id = ? AND is_banned = 0');
        foreach ($others as $uid) {
            $checkUser->execute([$uid]);
            if ($checkUser->fetch()) {
                $addStmt->execute([$convId, $uid]);
            }
        }
 
        http_response_code(201);
        echo json_encode(['id' => $convId]);
        break;
 
    case 'DELETE':
    
 
        // supprimer conv de api
        if (!$id || $action !== 'messages' || !$subId) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing conversation id or message id']);
            break;
        }
 
        // Vérifier que le message existe dans cette conversation
        $stmt = $db->prepare(
            'SELECT id, sender_id FROM messages WHERE id = ? AND conversation_id = ? AND is_deleted = 0'
        );
        $stmt->execute([(int)$subId, (int)$id]);
        $msg = $stmt->fetch(PDO::FETCH_ASSOC);
 
        if (!$msg) {
            http_response_code(404);
            echo json_encode(['error' => 'Message not found']);
            break;
        }
 
        // Seul l'expéditeur ou un admin de la conversation peut supprimer
        $canDelete = ((int)$msg['sender_id'] === $userId);
        if (!$canDelete) {
            $roleStmt = $db->prepare(
                'SELECT role FROM conversation_participants WHERE conversation_id = ? AND user_id = ?'
            );
            $roleStmt->execute([(int)$id, $userId]);
            $row = $roleStmt->fetch(PDO::FETCH_ASSOC);
            $canDelete = ($row && $row['role'] === 'admin');
        }
 
        if (!$canDelete) {
            http_response_code(403);
            echo json_encode(['error' => 'Not allowed to delete this message']);
            break;
        }
 
        $db->prepare('UPDATE messages SET is_deleted = 1 WHERE id = ?')->execute([(int)$subId]);
 
        http_response_code(200);
        echo json_encode(['success' => true]);
        break;
 
   
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}