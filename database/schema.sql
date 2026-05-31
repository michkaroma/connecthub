-- ConnectHub Database Schema
-- Réseau social et plateforme communautaire
-- ECE Paris - ING2 - 2026

SET FOREIGN_KEY_CHECKS = 0;
DROP DATABASE IF EXISTS connecthub;
CREATE DATABASE connecthub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE connecthub;

-- table definitions utilisateur

CREATE TABLE users (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    username    VARCHAR(50)  NOT NULL UNIQUE,
    email       VARCHAR(100) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,          -- bcrypt hash
    display_name VARCHAR(100) NOT NULL,
    bio         TEXT,
    avatar_url  VARCHAR(255) DEFAULT NULL,
    cover_url   VARCHAR(255) DEFAULT NULL,
    role        ENUM('user','moderator','admin') DEFAULT 'user',
    is_verified TINYINT(1) DEFAULT 0,
    is_banned   TINYINT(1) DEFAULT 0,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- FOLLOWS  (user → user)
-- ============================================================
CREATE TABLE follows (
    follower_id INT NOT NULL,
    following_id INT NOT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (follower_id, following_id),
    FOREIGN KEY (follower_id)  REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- COMMUNITIES
-- ============================================================
CREATE TABLE communities (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    slug        VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    avatar_url  VARCHAR(255),
    cover_url   VARCHAR(255),
    is_private  TINYINT(1) DEFAULT 0,
    creator_id  INT NOT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- COMMUNITY MEMBERS
-- ============================================================
CREATE TABLE community_members (
    community_id INT NOT NULL,
    user_id      INT NOT NULL,
    role         ENUM('member','moderator','admin') DEFAULT 'member',
    joined_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (community_id, user_id),
    FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)      REFERENCES users(id)       ON DELETE CASCADE
);

-- ============================================================
-- POSTS
-- ============================================================
CREATE TABLE posts (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    author_id    INT NOT NULL,
    community_id INT DEFAULT NULL,           -- NULL = personal feed
    content      TEXT NOT NULL,
    media_url    VARCHAR(255) DEFAULT NULL,
    media_type   ENUM('image','video','link') DEFAULT NULL,
    link_url     VARCHAR(500) DEFAULT NULL,
    is_pinned    TINYINT(1) DEFAULT 0,
    is_deleted   TINYINT(1) DEFAULT 0,
    share_count  INT DEFAULT 0,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id)    REFERENCES users(id)        ON DELETE CASCADE,
    FOREIGN KEY (community_id) REFERENCES communities(id)  ON DELETE SET NULL
);

-- ============================================================
-- HASHTAGS
-- ============================================================
CREATE TABLE hashtags (
    id   INT AUTO_INCREMENT PRIMARY KEY,
    tag  VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE post_hashtags (
    post_id    INT NOT NULL,
    hashtag_id INT NOT NULL,
    PRIMARY KEY (post_id, hashtag_id),
    FOREIGN KEY (post_id)    REFERENCES posts(id)    ON DELETE CASCADE,
    FOREIGN KEY (hashtag_id) REFERENCES hashtags(id) ON DELETE CASCADE
);

-- ============================================================
-- SHARES  (repost)
-- ============================================================
CREATE TABLE shares (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    user_id    INT NOT NULL,
    post_id    INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_share (user_id, post_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

-- ============================================================
-- COMMENTS
-- ============================================================
CREATE TABLE comments (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    post_id    INT NOT NULL,
    author_id  INT NOT NULL,
    parent_id  INT DEFAULT NULL,             -- thread support
    content    TEXT NOT NULL,
    is_deleted TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id)   REFERENCES posts(id)    ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users(id)    ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE SET NULL
);

-- ============================================================
-- REACTIONS  (likes + custom emoji)
-- ============================================================
CREATE TABLE reactions (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    user_id    INT NOT NULL,
    target_type ENUM('post','comment') NOT NULL,
    target_id  INT NOT NULL,
    emoji      VARCHAR(10) DEFAULT '👍',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_reaction (user_id, target_type, target_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- MESSAGES  (private + group)
-- ============================================================
CREATE TABLE conversations (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(100) DEFAULT NULL,    -- group name
    is_group   TINYINT(1) DEFAULT 0,
    created_by INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE conversation_participants (
    conversation_id INT NOT NULL,
    user_id         INT NOT NULL,
    role            ENUM('member','admin') DEFAULT 'member',
    last_read_at    DATETIME DEFAULT NULL,
    joined_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (conversation_id, user_id),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)         REFERENCES users(id)         ON DELETE CASCADE
);

CREATE TABLE messages (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT NOT NULL,
    sender_id       INT NOT NULL,
    content         TEXT NOT NULL,
    is_deleted      TINYINT(1) DEFAULT 0,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id)       REFERENCES users(id)         ON DELETE CASCADE
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL,                -- recipient
    actor_id    INT DEFAULT NULL,            -- who triggered it
    type        ENUM(
        'like','comment','follow','mention',
        'share','message','community_invite',
        'community_join','moderation','system'
    ) NOT NULL,
    entity_type VARCHAR(50) DEFAULT NULL,
    entity_id   INT DEFAULT NULL,
    content     VARCHAR(255) DEFAULT NULL,
    is_read     TINYINT(1) DEFAULT 0,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)  REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================
-- REPORTS  (moderation)
-- ============================================================
CREATE TABLE reports (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    reporter_id  INT NOT NULL,
    target_type  ENUM('post','comment','user') NOT NULL,
    target_id    INT NOT NULL,
    reason       ENUM('spam','harassment','hate_speech','misinformation','other') NOT NULL,
    description  TEXT DEFAULT NULL,
    status       ENUM('pending','reviewed','resolved','dismissed') DEFAULT 'pending',
    reviewed_by  INT DEFAULT NULL,
    reviewed_at  DATETIME DEFAULT NULL,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX idx_posts_author    ON posts(author_id);
CREATE INDEX idx_posts_community ON posts(community_id);
CREATE INDEX idx_posts_created   ON posts(created_at DESC);
CREATE INDEX idx_comments_post   ON comments(post_id);
CREATE INDEX idx_reactions_target ON reactions(target_type, target_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_messages_conv   ON messages(conversation_id, created_at);
CREATE INDEX idx_reports_status  ON reports(status);
