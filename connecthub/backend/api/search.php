<?php
// GET /api/search?q=...&type=all|posts|users|communities

$db = getDB();
$q    = trim($_GET['q'] ?? '');
$type = $_GET['type'] ?? 'all';

if (strlen($q) < 2) {
    http_response_code(422);
    echo json_encode(['error' => 'Query too short']);
    return;
}

$like    = "%$q%";
$results = [];

if (in_array($type, ['all','users'])) {
    $stmt = $db->prepare("SELECT id, username, display_name, avatar_url, bio FROM users WHERE (username LIKE ? OR display_name LIKE ?) AND is_banned=0 LIMIT 10");
    $stmt->execute([$like, $like]);
    $results['users'] = $stmt->fetchAll();
}

if (in_array($type, ['all','posts'])) {
    $stmt = $db->prepare("SELECT p.id, p.content, p.created_at, u.username, u.display_name, u.avatar_url
        FROM posts p JOIN users u ON u.id=p.author_id
        WHERE p.content LIKE ? AND p.is_deleted=0
        ORDER BY p.created_at DESC LIMIT 20");
    $stmt->execute([$like]);
    $results['posts'] = $stmt->fetchAll();
}

if (in_array($type, ['all','communities'])) {
    $stmt = $db->prepare("SELECT id, name, slug, description, avatar_url,
        (SELECT COUNT(*) FROM community_members cm WHERE cm.community_id=c.id) AS member_count
        FROM communities c WHERE name LIKE ? OR description LIKE ? LIMIT 10");
    $stmt->execute([$like, $like]);
    $results['communities'] = $stmt->fetchAll();
}

// Hashtag search
if (in_array($type, ['all','hashtags'])) {
    $stmt = $db->prepare("SELECT h.tag, COUNT(ph.post_id) AS post_count
        FROM hashtags h LEFT JOIN post_hashtags ph ON ph.hashtag_id=h.id
        WHERE h.tag LIKE ? GROUP BY h.id ORDER BY post_count DESC LIMIT 10");
    $stmt->execute(["%$q%"]);
    $results['hashtags'] = $stmt->fetchAll();
}

echo json_encode($results);
