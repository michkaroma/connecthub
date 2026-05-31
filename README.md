# ConnectHub

Réseau social et plateforme communautaire — ECE Paris ING2 2026.

Site : **https://connecthub.michkaroma.duckdns.org:49443**

---

## Prérequis

- PHP 8.1+
- MySQL 8.0+
- Node.js 18+
- Apache avec `mod_rewrite` et `AllowOverride All`
- Caddy (reverse proxy)
- Python 3 (pour `webhook_server.py`)

---

## Installation (serveur)

Le dépôt est cloné dans `/var/www/html/connecthub` sur le serveur.

### 1. Base de données

```bash
mysql -u root -p < database/schema.sql
```

Les identifiants de connexion sont dans `backend/config/database.php`.

### 2. Frontend

```bash
cd /var/www/html/connecthub/frontend
npm install
npm run build
```

Les fichiers compilés sont générés dans `frontend/build/` (dossier gitignore, non versionné).

L'URL de l'API utilisée lors du build est définie dans `frontend/.env.production` :
```
REACT_APP_API_URL=https://connecthub.michkaroma.duckdns.org:49443/api
```

---

## Déploiement automatique

Chaque push sur la branche `main` déclenche un déploiement automatique via un webhook GitHub.

### Fonctionnement

1. GitHub envoie une requête POST signée (HMAC-SHA256) vers `https://connecthub.michkaroma.duckdns.org:49443/api/webhook`
2. Caddy reçoit la requête et la forward vers `localhost:9000`
3. `webhook_server.py` vérifie la signature et exécute `deploy.sh`
4. `deploy.sh` effectue :
   - `git pull origin main`
   - `npm run build` dans `frontend/`
   - `systemctl reload apache2`

### webhook_server.py

Le serveur webhook tourne en tant que service systemd (démarrage automatique).

Pour vérifier son état :
```bash
sudo systemctl status connecthub-webhook
```

Les logs de déploiement sont dans `/tmp/deploy.log`.

### Configuration du webhook GitHub

Dans les settings du dépôt GitHub → **Webhooks** :
- **Payload URL** : `https://connecthub.michkaroma.duckdns.org:49443/api/webhook`
- **Content type** : `application/json`
- **Secret** : la valeur de `SECRET` dans `webhook_server.py`
- **Event** : `Just the push event`

---

## Structure du projet

```
connecthub/
├── backend/
│   ├── index.php             # Router principal
│   ├── .htaccess             # Réécriture d'URL Apache
│   ├── config/
│   │   └── database.php      # Connexion PDO MySQL
│   ├── middleware/
│   │   ├── auth.php          # JWT
│   │   └── cors.php          # CORS
│   └── api/
│       ├── auth.php          # Inscription / connexion
│       ├── posts.php         # Publications CRUD + partage
│       ├── comments.php      # Commentaires
│       ├── reactions.php     # Likes / réactions
│       ├── users.php         # Profils + follow
│       ├── communities.php   # Communautés
│       ├── conversations.php # Messagerie
│       ├── notifications.php # Notifications
│       ├── reports.php       # Modération
│       ├── search.php        # Recherche globale
│       └── webhook.php       # Vérification de signature webhook (test)
├── frontend/
│   ├── src/
│   │   ├── App.jsx           # Routing React
│   │   ├── context/          # AuthContext
│   │   ├── pages/            # Feed, Profile, Communities…
│   │   ├── components/       # Layout, PostCard, Avatar…
│   │   ├── utils/            # api.js — client HTTP
│   │   └── styles/           # CSS global
│   ├── .env.production       # URL de l'API en production
│   └── package.json
├── database/
│   └── schema.sql            # Création des tables
├── deploy.sh                 # Script de déploiement
└── webhook_server.py         # Serveur webhook GitHub
```

---

## Comptes

| Utilisateur | Email               | Mot de passe | Rôle       |
|-------------|---------------------|--------------|------------|
| admin       | admin@connecthub.io | Password123! | Admin      |
| moderator1  | mod@connecthub.io   | Password123! | Modérateur |
| alice       | alice@exemple.com   | Password123! | Membre     |

---

## Fonctionnalités

### Utilisateurs
- Inscription / connexion / déconnexion (JWT 7 jours)
- Profil : bio, avatar, bannière
- Système de suivi (follow / unfollow)

### Publications
- Création, modification, suppression
- Support image et lien
- Partage de publication
- Hashtags automatiques

### Interactions
- Réactions multi-emoji (👍 ❤️ 😂 😮 😢 🎉)
- Commentaires (CRUD)
- Fil d'actualité : récent / abonnements / tendances

### Communautés
- Création, rejoindre / quitter
- Gestion des rôles (membre, modérateur, admin)
- Publications dans une communauté

### Messagerie
- Conversations privées (DM) et groupes
- Polling automatique toutes les 5 secondes

### Notifications
- Déclenchement automatique (like, commentaire, follow, message, community_join)
- Marquer comme lu / tout marquer
- Badge en temps réel

### Modération
- Signalement de publication / commentaire / utilisateur
- Interface de modération réservée aux modérateurs et admins
- Résolution = suppression automatique du contenu signalé

### Sécurité
- JWT + bcrypt
- Validation côté client et serveur
- Requêtes SQL préparées
- CORS configuré
- Permissions vérifiées côté serveur à chaque requête
