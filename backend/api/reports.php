<?php

$db = getDB();

switch ($method) {
    // Créer un rapport
    case 'POST':
        $auth       = requireAuth();
        $targetType = $body['target_type'] ?? '';
        $targetId   = (int)($body['target_id'] ?? 0);
        $reason     = $body['reason'] ?? '';
        $desc       = trim($body['description'] ?? '');

        if (!in_array($targetType, ['post','comment','user']) || !$targetId) {
            http_response_code(422); echo json_encode(['error'=>'Invalid target']); break;
        }
        if (!in_array($reason, ['spam','harassment','hate_speech','misinformation','other'])) {
            http_response_code(422); echo json_encode(['error'=>'Invalid reason']); break;
        }

        $db->prepare('INSERT INTO reports (reporter_id, target_type, target_id, reason, description) VALUES (?,?,?,?,?)')->execute([$auth['sub'], $targetType, $targetId, $reason, $desc]);
        http_response_code(201);
        echo json_encode(['reported' => true]);
        break;
    // Récupérer les rapports (filtrés par statut)
    case 'GET':
        requireRole('moderator','admin');
        $status = $_GET['status'] ?? 'pending';
        $stmt = $db->prepare("SELECT r.*, u.username AS reporter_username FROM reports r JOIN users u ON u.id=r.reporter_id WHERE r.status=? ORDER BY r.created_at DESC");
        $stmt->execute([$status]);
        echo json_encode(['reports' => $stmt->fetchAll()]);
        break;

    case 'PUT':
        $auth = requireRole('moderator','admin');
        if (!$id) { http_response_code(400); echo json_encode(['error'=>'ID required']); break; }
        $status = $body['status'] ?? '';
        if (!in_array($status, ['pending','reviewed','resolved','dismissed'])) {
            http_response_code(422); echo json_encode(['error'=>'Invalid status']); break;
        }

        // si le rapport est résolu, appliquer les sanctions
        if ($status === 'resolved') {
            $stmt = $db->prepare('SELECT target_type, target_id FROM reports WHERE id=?');
            $stmt->execute([(int)$id]);
            $report = $stmt->fetch();
            if ($report) {
                if ($report['target_type'] === 'post') {
                    $db->prepare('UPDATE posts SET is_deleted=1 WHERE id=?')->execute([$report['target_id']]);
                } elseif ($report['target_type'] === 'comment') {
                    $db->prepare('UPDATE comments SET is_deleted=1 WHERE id=?')->execute([$report['target_id']]);
                } elseif ($report['target_type'] === 'user') {
                    $db->prepare('UPDATE users SET is_banned=1 WHERE id=?')->execute([$report['target_id']]);
                }
            }
        }

        $db->prepare('UPDATE reports SET status=?, reviewed_by=?, reviewed_at=NOW() WHERE id=?')->execute([$status, $auth['sub'], (int)$id]);
        echo json_encode(['updated' => true]);
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}
