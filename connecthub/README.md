# ConnectHub — Installation

## Prérequis
- PHP 8.1+
- MySQL 8.0+
- Node.js 18+
- Apache (avec mod_rewrite) ou XAMPP/WAMP

---

## 1. Base de données

```bash
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
```

Modifier les identifiants dans `backend/config/database.php` si nécessaire.

---

## 2. Backend PHP

Placer le dossier `backend/` dans votre racine web, par exemple :
```
/var/www/html/connecthub/api/
```

Ou avec XAMPP :
```
C:\xampp\htdocs\connecthub\api\
```

Activer `mod_rewrite` dans Apache.

Vérifier que `AllowOverride All` est activé pour le dossier.

L'API sera accessible sur : `http://localhost/connecthub/api/`

---

## 3. Frontend React

```bash
cd frontend
npm install
```

Créer un fichier `.env` :
```
REACT_APP_API_URL=http://localhost/connecthub/api
```

Lancer :
```bash
npm start
```

L'application sera accessible sur : `http://localhost:3000`

---

## Comptes de test

| Utilisateur  | Email                 | Mot de passe   | Rôle        |
|--------------|-----------------------|----------------|-------------|
| admin        | admin@connecthub.io   | Password123!   | Admin       |
| moderator1   | mod@connecthub.io     | Password123!   | Modérateur  |
| alice        | alice@example.com     | Password123!   | Utilisateur |
| bob          | bob@example.com       | Password123!   | Utilisateur |
| charlie      | charlie@example.com   | Password123!   | Utilisateur |

---

## Structure du projet

```
connecthub/
├── backend/
│   ├── index.php          # Router principal
│   ├── .htaccess          # Réécriture d'URL Apache
│   ├── config/
│   │   └── database.php   # Connexion PDO
│   ├── middleware/
│   │   ├── auth.php       # JWT
│   │   └── cors.php       # CORS
│   └── api/
│       ├── auth.php       # Inscription / connexion
│       ├── posts.php      # Publications CRUD + partage
│       ├── comments.php   # Commentaires
│       ├── reactions.php  # Likes / réactions
│       ├── users.php      # Profils + follow
│       ├── communities.php# Communautés
│       ├── conversations.php # Messagerie
│       ├── notifications.php # Notifications
│       ├── reports.php    # Modération
│       └── search.php     # Recherche globale
├── frontend/
│   ├── src/
│   │   ├── App.jsx        # Routing React
│   │   ├── context/       # AuthContext
│   │   ├── pages/         # Feed, Profile, Communities…
│   │   ├── components/    # Layout, PostCard, Avatar…
│   │   ├── utils/         # api.js client HTTP
│   │   └── styles/        # CSS global
│   └── package.json
└── database/
    ├── schema.sql         # Création des tables
    └── seed.sql           # Données de test
```

## Fonctionnalités implémentées

### Utilisateurs
- Inscription / connexion / déconnexion (JWT)
- Profil : modification, bio, avatar, bannière
- Système de suivi (follow / unfollow)

### Publications
- Création, modification, suppression
- Support image, lien
- Partage de publication
- Hashtags automatiques

### Interactions
- Réactions multi-emoji (👍 ❤️ 😂 😮 😢 🎉)
- Commentaires (CRUD)
- Fil d'actualité : récent / abonnements / tendances
- Filtrage et tri

### Communautés
- Création, rejoindre/quitter
- Gestion des rôles (membre, modérateur, admin)
- Publications dans une communauté
- Suppression (admin)

### Messagerie
- Conversations privées (DM)
- Groupes de discussion
- Polling automatique (5s)
- Historique des messages

### Notifications
- Déclenchement automatique (like, commentaire, follow, message, community_join)
- Marquer comme lu / tout marquer
- Compteur badge en temps réel

### Modération
- Signalement de publication / commentaire / utilisateur
- Interface de modération (résoudre = suppression automatique du contenu)
- Accès réservé aux modérateurs et admins
- Blocage des publications vides et dupliquées

### Sécurité
- Authentification JWT (7 jours)
- Hashage bcrypt des mots de passe
- Validation côté client ET serveur
- Protection CSRF via CORS
- Préparation des requêtes SQL (injection prevention)
- Permissions vérifiées côté serveur à chaque requête
