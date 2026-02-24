# 📡 CourtVision AI — Documentation API

Base URL : `https://api.courtvision.ai` (production) ou `http://localhost:3001` (dev)

## Authentication

Toutes les routes protégées nécessitent un header `Authorization: Bearer <token>`.
Le token est obtenu via `/api/auth/login` ou `/api/auth/signup`.

---

## Endpoints

### 🔐 Auth

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/api/auth/signup` | ❌ | Inscription |
| POST | `/api/auth/login` | ❌ | Connexion |
| POST | `/api/auth/logout` | ✅ | Déconnexion |
| POST | `/api/auth/refresh` | ❌ | Rafraîchir le token |
| GET | `/api/auth/me` | ✅ | Profil utilisateur |

#### POST /api/auth/signup
```json
{
  "email": "joueur@email.com",
  "password": "monmotdepasse",
  "username": "joueur42",
  "full_name": "Lucas Martin"
}
```

#### POST /api/auth/login
```json
{
  "email": "joueur@email.com",
  "password": "monmotdepasse"
}
```

#### POST /api/auth/refresh
```json
{
  "refresh_token": "eyJ..."
}
```

---

### 📹 Sessions

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/api/sessions/upload` | ✅ | Upload une vidéo |
| GET | `/api/sessions` | ✅ | Liste des sessions |
| GET | `/api/sessions/:id` | ✅ | Détail d'une session |
| DELETE | `/api/sessions/:id` | ✅ | Supprimer une session |
| GET | `/api/sessions/:id/status` | ✅ | SSE — suivi du statut en temps réel |

#### POST /api/sessions/upload
```json
{
  "type": "match",        // "match" | "training" | "shootaround"
  "video_url": "https://storage.supabase.co/videos/..."
}
```

---

### 📊 Analyses

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/api/analyses/:sessionId` | ✅ | Analyse complète |
| GET | `/api/analyses/:sessionId/heatmap` | ✅ | Données heatmap |
| GET | `/api/analyses/:sessionId/report` | ✅ | Rapport IA texte |
| GET | `/api/analyses/:sessionId/highlights` | ✅ | Données highlights |
| GET | `/api/analyses/:sessionId/program` | ✅ | Programme 7 jours |

---

### ⚡ Coach Live

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/api/sessions/:id/live` | ✅ | Activer le mode live |
| POST | `/api/sessions/:id/live/frame` | ✅ | Envoyer une frame |

#### POST /api/sessions/:id/live/frame
```json
{
  "timestamp": 120,
  "quarter": 2,
  "frameBase64": "data:image/jpeg;base64,..."
}
```

**Réponse :**
```json
{
  "sessionId": "uuid",
  "timestamp": 120,
  "quarter": 2,
  "mentalScore": 65,
  "shootingPct": 42,
  "alerts": ["Mental Score bas : joue simple, cherche le layup"],
  "vibrate": true
}
```

---

### 🤖 Digital Twin

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/api/twin/me` | ✅ | Mon twin numérique |
| POST | `/api/twin/simulate` | ✅ | Simuler un scénario |
| GET | `/api/twin/compare/:userId` | ✅ | Comparer avec un joueur |

#### POST /api/twin/simulate
```json
{
  "situationId": "pick-and-roll",
  "intensity": 80
}
```

---

### 💳 Billing (Stripe)

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/api/billing/plans` | ❌ | Liste des plans |
| POST | `/api/billing/create-checkout` | ✅ | Créer une session Stripe |
| GET | `/api/billing/portal` | ✅ | Portail de gestion Stripe |
| POST | `/api/billing/webhook` | ❌ | Webhook Stripe |

#### POST /api/billing/create-checkout
```json
{
  "planName": "player"   // "player" | "coach" | "academy"
}
```

---

### 🏆 Communauté

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/api/community/leaderboard` | ❌ | Classement |
| GET | `/api/community/challenges` | ❌ | Défis actifs |
| POST | `/api/community/challenges/:id/submit` | ✅ | Soumettre un résultat |
| GET | `/api/community/friends` | ✅ | Stats des amis |

#### Query params leaderboard
- `metric` : `mental_score`, `shot_made`, etc.
- `scope` : `global`, `friends`

#### POST /api/community/challenges/:id/submit
```json
{
  "value": 85,
  "metric": "mental_score"
}
```

---

### 📋 Waitlist

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/api/waitlist` | ❌ | S'inscrire à la waitlist |
| GET | `/api/waitlist/count` | ❌ | Nombre d'inscrits |

#### POST /api/waitlist
```json
{
  "email": "joueur@email.com",
  "source": "landing"
}
```

---

### ❤️ Health Check

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/health` | ❌ | Statut de l'API |

**Réponse :**
```json
{
  "status": "ok",
  "service": "courtvision-api",
  "version": "1.0.0",
  "time": "2025-01-01T00:00:00.000Z",
  "uptime": 12345.678
}
```

---

## Codes d'erreur

| Code | Signification |
|------|--------------|
| 200 | Succès |
| 400 | Erreur de validation / requête invalide |
| 401 | Non authentifié |
| 404 | Ressource non trouvée |
| 429 | Rate limit dépassé (100 req/min) |
| 500 | Erreur serveur |

## Rate Limiting

L'API est limitée à **100 requêtes par minute** par IP.
Les headers suivants sont retournés :
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`
