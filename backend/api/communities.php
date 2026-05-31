<?php

$db = getDB();

switch ($method) {
    case 'GET':
        if (!$id) {
            $page  = max(1,(int)($_GET['page']??1));
            $limit = min(50,max(1,(int)($_GET['limit']??20)));
            $offset = ($page-1)*$limit;
            $stmt = $db->prepare("SELECT c.*, u.username AS creator_username,
                (SELECT COUNT(*) FROM community_members cm WHERE cm.community_id=c.id) AS member_count
                FROM communities c JOIN users u ON u.id=c.creator_id
                ORDER BY member_count DESC LIMIT ? OFFSET ?");
            $stmt->execute([$limit, $offset]);
            echo json_encode(['communities' => $stmt->fetchAll()]);
            break;
        }

        $stmt = $db->prepare("SELECT c.*, u.username AS creator_username,
            (SELECT COUNT(*) FROM community_members cm WHERE cm.community_id=c.id) AS member_count
            FROM communities c JOIN users u ON u.id=c.creator_id WHERE c.id=?");
        $stmt->execute([(int)$id]);
        $community = $stmt->fetch();
        if (!$community) { http_response_code(404); echo json_encode(['error'=>'Not found']); break; }

        // les membres de la communauté
        $mStmt = $db->prepare("SELECT u.id, u.username, u.display_name, u.avatar_url, cm.role, cm.joined_at
            FROM community_members cm JOIN users u ON u.id=cm.user_id WHERE cm.community_id=? ORDER BY cm.role DESC, cm.joined_at ASC");
        $mStmt->execute([(int)$id]);
        $community['members'] = $mStmt->fetchAll();

        // est ce que c'est un membre connecté qui consulte ? si oui, quel est son rôle ?
        $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if (preg_match('/^Bearer\s+(.+)$/', $header, $m)) {
            $auth = verifyToken($m[1]);
            if ($auth) {
                $stmt2 = $db->prepare('SELECT role FROM community_members WHERE community_id=? AND user_id=?');
                $stmt2->execute([(int)$id, $auth['sub']]);
                $mem = $stmt2->fetch();
                $community['user_role'] = $mem ? $mem['role'] : null;
            }
        }
        echo json_encode($community);
        break;

    case 'POST':
        if ($id && $action === 'join') {
            $auth = requireAuth();
            $commId = (int)$id;
            $stmt = $db->prepare('SELECT 1 FROM community_members WHERE community_id=? AND user_id=?');
            $stmt->execute([$commId, $auth['sub']]);
            if ($stmt->fetch()) { http_response_code(409); echo json_encode(['error'=>'Already member']); break; }
            $db->prepare('INSERT INTO community_members (community_id, user_id) VALUES (?,?)')->execute([$commId, $auth['sub']]);

            // Notifier le créateur de la communauté
            $stmt2 = $db->prepare('SELECT creator_id FROM communities WHERE id=?');
            $stmt2->execute([$commId]);
            $comm = $stmt2->fetch();
            if ($comm) {
                $db->prepare("INSERT INTO notifications (user_id, actor_id, type, entity_type, entity_id, content) VALUES (?,?,'community_join','community',?,?)"
                )->execute([$comm['creator_id'], $auth['sub'], $commId, 'Someone joined your community']);
            }
            echo json_encode(['joined' => true]);
            break;
        }

        $auth = requireAuth();
        $name = trim($body['name'] ?? '');
        $desc = trim($body['description'] ?? '');
        if (!$name || strlen($name) < 3) { http_response_code(422); echo json_encode(['error'=>'Name required (min 3 chars)']); break; }

        $slug = strtolower(preg_replace('/[^a-zA-Z0-9]+/', '-', $name));
        $stmt = $db->prepare('SELECT id FROM communities WHERE slug=?');
        $stmt->execute([$slug]);
        if ($stmt->fetch()) { http_response_code(409); echo json_encode(['error'=>'Name already taken']); break; }

        $db->prepare('INSERT INTO communities (name, slug, description, creator_id) VALUES (?,?,?,?)')->execute([$name, $slug, $desc, $auth['sub']]);
        $commId = (int)$db->lastInsertId();
        $db->prepare('INSERT INTO community_members (community_id, user_id, role) VALUES (?,?,\'admin\')')->execute([$commId, $auth['sub']]);

        http_response_code(201);
        echo json_encode(['id' => $commId, 'slug' => $slug]);
        break;

    case 'PUT':
        $auth = requireAuth();
        if ($id && $action === 'members' && isset($parts[3])) {
            $commId    = (int)$id;
            $targetUid = (int)$parts[3];
            $newRole   = $body['role'] ?? '';
            if (!in_array($newRole, ['member','admin'])) {
                http_response_code(422); echo json_encode(['error'=>'Invalid role']); break;
            }
            //doit être admin de la communauté ou admin de la plateforme
            $stmt = $db->prepare('SELECT role FROM community_members WHERE community_id=? AND user_id=?');
            $stmt->execute([$commId, $auth['sub']]);
            $myRole = $stmt->fetchColumn();
            if ($myRole !== 'admin' && $auth['role'] !== 'admin') {
                http_response_code(403); echo json_encode(['error'=>'Forbidden']); break;
            }
            $db->prepare('UPDATE community_members SET role=? WHERE community_id=? AND user_id=?')->execute([$newRole, $commId, $targetUid]);
            echo json_encode(['updated' => true]);
            break;
        }
        http_response_code(404); echo json_encode(['error'=>'Route not found']); break;

    case 'DELETE':
        if ($id && $action === 'join') {
            $auth = requireAuth();
            $db->prepare('DELETE FROM community_members WHERE community_id=? AND user_id=?')->execute([(int)$id, $auth['sub']]);
            echo json_encode(['left' => true]);
            break;
        }

        if ($id && $action === 'members' && isset($parts[3])) {
            $auth = requireAuth();
            $commId    = (int)$id;
            $targetUid = (int)$parts[3];
            $stmt = $db->prepare('SELECT role FROM community_members WHERE community_id=? AND user_id=?');
            $stmt->execute([$commId, $auth['sub']]);
            $myRole = $stmt->fetchColumn();
            if ($myRole !== 'admin' && $auth['role'] !== 'admin') {
                http_response_code(403); echo json_encode(['error'=>'Forbidden']); break;
            }
            $db->prepare('DELETE FROM community_members WHERE community_id=? AND user_id=?')->execute([$commId, $targetUid]);
            echo json_encode(['removed' => true]);
            break;
        }

        $auth = requireAuth();
        if (!$id) { http_response_code(400); echo json_encode(['error'=>'ID required']); break; }
        // Pour supprimer une communauté, il faut être admin de la communauté ou admin de la plateforme
        if ($auth['role'] !== 'admin') {
            $stmt = $db->prepare('SELECT role FROM community_members WHERE community_id=? AND user_id=?');
            $stmt->execute([(int)$id, $auth['sub']]);
            $myRole = $stmt->fetchColumn();
            if ($myRole !== 'admin') {
                http_response_code(403); echo json_encode(['error'=>'Forbidden']); break;
            }
        }
        $db->prepare('DELETE FROM communities WHERE id=?')->execute([(int)$id]);
        echo json_encode(['deleted' => true]);
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}
