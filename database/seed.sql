-- ConnectHub - Seed Data
USE connecthub;

-- Users (passwords = "Password123!" hashed with bcrypt cost=12)
INSERT INTO users (username, email, password, display_name, bio, role) VALUES
('admin',     'admin@connecthub.io',   '$2y$12$XzORGRI1FlZUxaZpL0qWiOiqffmyEMTif0QWHRmDJjpYSQ/hvfuLS', 'Admin ConnectHub', 'Administrateur de la plateforme', 'admin'),
('moderator1','mod@connecthub.io',     '$2y$12$XzORGRI1FlZUxaZpL0qWiOiqffmyEMTif0QWHRmDJjpYSQ/hvfuLS', 'Marie Mod', 'Modératrice passionnée', 'moderator'),
('alice',     'alice@example.com',     '$2y$12$XzORGRI1FlZUxaZpL0qWiOiqffmyEMTif0QWHRmDJjpYSQ/hvfuLS', 'Alice Martin', 'Développeuse web & UI lover 🎨', 'user'),
('bob',       'bob@example.com',       '$2y$12$XzORGRI1FlZUxaZpL0qWiOiqffmyEMTif0QWHRmDJjpYSQ/hvfuLS', 'Bob Dupont', 'Passionné de tech et de café ☕', 'user'),
('charlie',   'charlie@example.com',   '$2y$12$XzORGRI1FlZUxaZpL0qWiOiqffmyEMTif0QWHRmDJjpYSQ/hvfuLS', 'Charlie Leclerc', 'Étudiant ECE Paris 🎓', 'user'),
('diana',     'diana@example.com',     '$2y$12$XzORGRI1FlZUxaZpL0qWiOiqffmyEMTif0QWHRmDJjpYSQ/hvfuLS', 'Diana Prince', 'Designer & creative coder', 'user');

-- Follows
INSERT INTO follows (follower_id, following_id) VALUES
(3,4),(3,5),(4,3),(4,5),(5,3),(5,6),(6,3),(6,4),(2,3),(1,3);

-- Communities
INSERT INTO communities (name, slug, description, creator_id) VALUES
('Dev ECE Paris', 'dev-ece-paris', 'Communauté des développeurs de l\'ECE Paris', 1),
('Design & UI/UX', 'design-uiux', 'Partagez vos créations et inspirations design', 3),
('Open Source', 'open-source', 'Projets open source et contributions', 4);

-- Community members
INSERT INTO community_members (community_id, user_id, role) VALUES
(1,1,'admin'),(1,2,'moderator'),(1,3,'member'),(1,4,'member'),(1,5,'member'),
(2,3,'admin'),(2,6,'member'),(2,4,'member'),
(3,4,'admin'),(3,5,'member'),(3,3,'member');

-- Posts
INSERT INTO posts (author_id, community_id, content) VALUES
(3, NULL,  'Bonjour tout le monde ! Contente d\'être sur ConnectHub 🎉 #connecthub #bienvenue'),
(4, NULL,  'Vous avez vu les dernières annonces de Google I/O ? Impressionnant ce qui se fait avec Gemini. #tech #ai'),
(3, 1,     'Quelqu\'un a de l\'expérience avec React Query v5 ? J\'aimerais vos retours sur la migration depuis v4. #react #frontend'),
(5, 1,     'Petit partage : j\'ai fini mon projet de Web dynamique à l\'ECE 🚀 Architecture REST en PHP, frontend React. Très bonne expérience !'),
(6, 2,     'Mon dernier projet de logo pour un client startup. Feedback bienvenu ! #design #branding'),
(4, 3,     'Je cherche des contributeurs pour mon projet open source d\'analyse de données en Python. #python #opensource'),
(3, NULL,  'Rappel : la deadline du projet Web ECE c\'est ce weekend... courage à tous ! 💪 #ece #coding'),
(5, NULL,  'Premier post ! Heureux de rejoindre cette communauté.');

-- Hashtags
INSERT INTO hashtags (tag) VALUES
('connecthub'),('bienvenue'),('tech'),('ai'),('react'),('frontend'),
('design'),('branding'),('python'),('opensource'),('ece'),('coding');

-- Post hashtags
INSERT INTO post_hashtags (post_id, hashtag_id) VALUES
(1,1),(1,2),(2,3),(2,4),(3,5),(3,6),(5,7),(5,8),(6,9),(6,10),(7,11),(7,12);

-- Reactions
INSERT INTO reactions (user_id, target_type, target_id, emoji) VALUES
(4,'post',1,'👍'),(5,'post',1,'❤️'),(6,'post',1,'👍'),
(3,'post',2,'👍'),(5,'post',2,'👍'),
(4,'post',4,'🎉'),(3,'post',4,'👍'),(6,'post',4,'❤️'),
(3,'post',5,'❤️'),(4,'post',5,'👍'),
(3,'post',6,'👍'),(5,'post',6,'👍'),
(4,'post',7,'😂'),(5,'post',7,'👍'),(6,'post',7,'😂');

-- Comments
INSERT INTO comments (post_id, author_id, content) VALUES
(3, 4, 'Oui ! La migration est simple, les breaking changes sont surtout sur les options de cache. Je t\'envoie un lien.'),
(3, 5, 'J\'ai fait la migration la semaine dernière, pas eu de souci majeur 👍'),
(4, 3, 'Bravo Charlie ! Tu as utilisé quoi comme ORM côté PHP ?'),
(4, 6, 'Super projet ! T\'as pensé à Docker pour le déploiement ?'),
(6, 3, 'Intéressant ! Quel domaine de data analysis ?');

-- Conversations
INSERT INTO conversations (name, is_group, created_by) VALUES
(NULL, 0, 3),
('Équipe Dev ECE', 1, 3);

INSERT INTO conversation_participants (conversation_id, user_id) VALUES
(1, 3),(1, 4),
(2, 3),(2, 4),(2, 5);

-- Messages
INSERT INTO messages (conversation_id, sender_id, content) VALUES
(1, 3, 'Salut Bob ! Tu peux m\'aider sur React Query ?'),
(1, 4, 'Bien sûr ! Qu\'est-ce qui coince ?'),
(1, 3, 'La gestion du cache avec les mutations, ça m\'échappe un peu'),
(1, 4, 'Je t\'explique : après une mutation, tu dois appeler invalidateQueries()'),
(2, 3, 'Hey l\'équipe ! On commence quand la démo ?'),
(2, 5, 'Demain à 14h ça vous va ?'),
(2, 4, 'Parfait pour moi !');

-- Notifications
INSERT INTO notifications (user_id, actor_id, type, entity_type, entity_id, content) VALUES
(3, 4, 'like',    'post',    1, 'Bob a aimé votre publication'),
(3, 5, 'like',    'post',    1, 'Charlie a aimé votre publication'),
(3, 4, 'comment', 'post',    3, 'Bob a commenté votre publication'),
(3, 4, 'follow',  'user',    4, 'Bob vous suit maintenant'),
(4, 3, 'comment', 'post',    4, 'Alice a commenté la publication de Charlie'),
(5, 3, 'message', 'conversation', 2, 'Alice vous a envoyé un message');

-- Reports (test moderation)
INSERT INTO reports (reporter_id, target_type, target_id, reason, description) VALUES
(5, 'post', 2, 'spam', 'Possible contenu promotionnel non déclaré');
