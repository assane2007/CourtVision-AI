# 📡 CourtVision AI — Documentation API v5.3.0

> **Codename**: Skill-Hardened · **Mise à jour** : Mars 2026

Base URL : `https://api.courtvision.ai` (production) ou `http://localhost:8080` (dev)

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

### 🧬 Shot DNA™ *(NEW v5)*

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/api/shot-dna/me` | ✅ | Mon empreinte Shot DNA |
| GET | `/api/shot-dna/evolution` | ✅ | Évolution temporelle |
| GET | `/api/shot-dna/compare/:playerId` | ✅ | Comparer avec un joueur/NBA |
| GET | `/api/shot-dna/leaderboard` | ✅ | Classement par pureté mécanique |

---

### 🔮 Predictive Engine *(NEW v5)*

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/api/predict/performance` | ✅ | Prédiction de performance |
| GET | `/api/predict/zones` | ✅ | Prédiction % par zone |
| GET | `/api/predict/momentum` | ✅ | Prédicteur de momentum |

#### POST /api/predict/performance
```json
{
  "sleep_hours": 7.5,
  "stress_level": 3,
  "last_session_fatigue": 40
}
```

---

### 🏋️ Smart Training *(NEW v5)*

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/api/training/generate` | ✅ | Générer un plan adaptatif |
| GET | `/api/training/current` | ✅ | Plan en cours |
| PUT | `/api/training/progress` | ✅ | Mettre à jour la progression |
| GET | `/api/training/history` | ✅ | Historique des plans |

---

### 🤖 Coach Chat IA *(NEW v5)*

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/api/coach/chat` | ✅ | Envoyer un message au coach |
| GET | `/api/coach/history` | ✅ | Historique des conversations |
| DELETE | `/api/coach/history` | ✅ | Effacer l'historique |

#### POST /api/coach/chat
```json
{
  "message": "Pourquoi je rate mes 3pts à droite ?",
  "context": "session_review",
  "sessionId": "uuid"
}
```

**Réponse :**
```json
{
  "reply": "J'ai analysé tes 3 dernières sessions...",
  "suggestedActions": [
    { "label": "Drill correctif", "emoji": "🎯", "action": "start_drill" },
    { "label": "Comparer avec NBA", "emoji": "🏀", "action": "compare_nba" }
  ],
  "attachments": [
    { "type": "chart", "data": { "...": "..." } }
  ]
}
```

---

### 💊 Recovery Engine *(NEW v5)*

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/api/recovery/score` | ✅ | Score de récupération |
| POST | `/api/recovery/log` | ✅ | Logger données de récupération |
| GET | `/api/recovery/correlation` | ✅ | Corrélation récup ↔ performance |
| GET | `/api/recovery/recommendations` | ✅ | Recommandations personnalisées |

---

### 📈 Advanced Analytics *(NEW v5)*

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/api/analytics/overview` | ✅ | Vue d'ensemble avancée |
| GET | `/api/analytics/shot-quality` | ✅ | Shot Quality Score (SQS) |
| GET | `/api/analytics/clutch-rating` | ✅ | Clutch Rating™ |
| GET | `/api/analytics/xshots` | ✅ | Expected Goals (xShots) |

---

### ⚡ Coach Live

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/api/live/:id/start` | ✅ | Activer le mode live |
| POST | `/api/live/:id/frame` | ✅ | Envoyer une frame |

#### POST /api/live/:id/frame
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
| GET | `/api/twin/drills?limit=5` | ✅ | Recommandations de drills dynamiques basées Twin |

#### POST /api/twin/simulate
```json
{
  "situationId": "pick-and-roll",
  "intensity": 80
}
```

#### GET /api/twin/drills?limit=5

**Réponse :**
```json
{
  "data": {
    "recommendations": [
      {
        "id": "weakness-trait_1",
        "rank": 1,
        "title": "Réparer l’efficacité dans les corners à 3 points",
        "objective": "Monter la réussite dans les corners à 3 points sur les prochaines sessions",
        "rationale": "Difficulté en corner3 est identifié comme point faible (sévérité 5/5). Observé sur 8 session(s), tendance declining.",
        "category": "shooting",
        "priority": 93,
        "linkedWeakness": "Difficulté en corner3",
        "zoneFocus": "corner3",
        "sessionsPerWeek": 4,
        "minutesPerSession": 30,
        "drill": {
          "name": "Spot-Up Corner 3s",
          "sets": 5,
          "reps": "10 tirs par corner",
          "intensity": "moderate",
          "tips": ["Pied intérieur orienté panier", "Shot pocket prêt", "Release en rythme sans dérive latérale"]
        },
        "targetMetric": "corner3_pct"
      }
    ],
    "source": "stored",
    "generatedAt": "2026-04-05T09:20:00.000Z",
    "profileVersion": "v2.0",
    "profileUpdatedAt": "2026-04-05T09:18:00.000Z",
    "sessionCount": 14,
    "overallRating": 78,
    "playStyle": "sharpshooter"
  }
}
```

---

### 🎮 Gamification — Quêtes *(NEW v5)*

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/api/quests/daily` | ✅ | Quêtes quotidiennes |
| GET | `/api/quests/weekly` | ✅ | Quêtes hebdomadaires |
| GET | `/api/quests/season` | ✅ | Quêtes saisonnières |
| POST | `/api/quests/:id/complete` | ✅ | Compléter une quête |

---

### 👥 Crews (Équipes) *(NEW v5)*

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/api/crews` | ✅ | Créer un crew |
| GET | `/api/crews/mine` | ✅ | Mes crews |
| GET | `/api/crews/:id` | ✅ | Détail d'un crew |
| POST | `/api/crews/:id/join` | ✅ | Rejoindre un crew |
| GET | `/api/crews/leaderboard` | ✅ | Classement des crews |

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

---

### 📤 Partage & Viral

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/api/share/twin-card` | ✅ | Générer une Twin Card |
| POST | `/api/share/highlight` | ✅ | Partager un highlight |
| GET | `/api/share/:shareId` | ❌ | Voir un partage public |

---

### 🎵 TikTok Export *(NEW v5)*

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/api/tiktok/generate` | ✅ | Générer un clip TikTok |
| GET | `/api/tiktok/:id/status` | ✅ | Status de génération |

---

### 🎬 Highlights *(NEW v5)*

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/api/highlights/render` | ✅ | Lancer le rendu highlights |
| GET | `/api/highlights/:id` | ✅ | Récupérer les highlights |

---

### 👥 Shadow League *(NEW v5)*

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/api/shadow/report` | ✅ | Morning Report |
| GET | `/api/shadow/rivals` | ✅ | Mes rivaux simulés |
| POST | `/api/shadow/challenge` | ✅ | Lancer un défi |

---

### 🔭 Precog *(NEW v5)*

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/api/precog/pregame` | ✅ | Briefing pre-game |
| GET | `/api/precog/matchup/:opponentId` | ✅ | Analyse matchup |

---

### 🎙️ Voice Coach (WebSocket) *(NEW v5)*

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| WS | `/ws/voice-coach` | ✅ | Coaching vocal temps réel |

---

### 👤 Joueurs

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/api/players` | ✅ | Liste des joueurs |
| GET | `/api/players/:id` | ✅ | Profil d'un joueur |
| GET | `/api/players/search` | ✅ | Recherche de joueurs |

---

### 🗺️ Spatial

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/api/spatial/:sessionId` | ✅ | Reconstruction 3D |
| GET | `/api/spatial/:sessionId/heatmap` | ✅ | Heatmap spatial |

---

### 📊 Dashboard

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/api/dashboard/overview` | ✅ | Métriques consolidées |
| GET | `/api/dashboard/trends` | ✅ | Tendances temporelles |

---

### 🏀 Shooting Sessions

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/api/shooting-sessions` | ✅ | Liste sessions de tir |
| GET | `/api/shooting-sessions/:id` | ✅ | Détail session de tir |

---

### 📋 Rapports

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/api/reports/:sessionId/pdf` | ✅ | Télécharger rapport PDF |
| GET | `/api/reports/:sessionId/scout` | ✅ | Scout Report |

---

### 📈 Investor

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/api/investor/metrics` | ✅ | Métriques business |
| GET | `/api/investor/kpi` | ✅ | KPIs dashboard |

---

### 🏟️ Arena (V6)

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/api/arena/create` | ✅ | Créer un match Arena |
| GET | `/api/arena/available` | ✅ | Lister les matchs ouverts |
| POST | `/api/arena/:id/join` | ✅ | Rejoindre un match |
| POST | `/api/arena/:id/join-invite` | ✅ | Rejoindre via code d'invitation |
| POST | `/api/arena/:id/ready` | ✅ | Signaler prêt |
| POST | `/api/arena/:id/shot` | ✅ | Enregistrer un tir |
| GET | `/api/arena/:id/scoreboard` | ✅ | Scoreboard temps réel |
| GET | `/api/arena/:id/stats` | ✅ | Statistiques détaillées |
| POST | `/api/arena/:id/end` | ✅ | Terminer le match (host) |
| POST | `/api/arena/:id/cancel` | ✅ | Annuler le match (host) |
| POST | `/api/arena/:id/kick/:playerId` | ✅ | Expulser un joueur (host) |
| GET | `/api/arena/:id/invite-link` | ✅ | Générer un lien d'invitation |
| GET | `/api/arena/history` | ✅ | Historique des matchs |
| GET | `/api/arena/leaderboard` | ✅ | Classement Arena global |
| GET | `/api/arena/my-stats` | ✅ | Statistiques personnelles |

---

### 🐴 Horse IA (V6)

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/api/horse/start` | ✅ | Démarrer une partie HORSE |
| GET | `/api/horse/active` | ✅ | Partie active de l'utilisateur |
| GET | `/api/horse/:id` | ✅ | État de la partie |
| POST | `/api/horse/:id/challenge` | ✅ | Générer un défi IA |
| POST | `/api/horse/:id/attempt` | ✅ | Soumettre une tentative |
| POST | `/api/horse/:id/skip` | ✅ | Passer (prend une lettre) |
| GET | `/api/horse/:id/result` | ✅ | Résultat final |
| GET | `/api/horse/:id/replay` | ✅ | Replay complet |
| GET | `/api/horse/history` | ✅ | Historique des parties |
| GET | `/api/horse/challenges` | ✅ | Bibliothèque de défis |
| GET | `/api/horse/leaderboard` | ✅ | Classement HORSE |
| GET | `/api/horse/my-stats` | ✅ | Statistiques personnelles |

---

### ⌚ Wearable (V6)

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/api/wearable/connect` | ✅ | Connecter un device |
| DELETE | `/api/wearable/disconnect` | ✅ | Déconnecter un device |
| GET | `/api/wearable/devices` | ✅ | Lister les devices connectés |
| POST | `/api/wearable/sync` | ✅ | Synchroniser les données |
| GET | `/api/wearable/latest` | ✅ | Dernières mesures |
| GET | `/api/wearable/hrv/trend` | ✅ | Tendance HRV |
| GET | `/api/wearable/hrv/analysis` | ✅ | Analyse HRV approfondie |
| GET | `/api/wearable/readiness` | ✅ | Score de readiness |
| GET | `/api/wearable/training-load` | ✅ | Charge d'entraînement |
| GET | `/api/wearable/training-load/history` | ✅ | Historique de charge |
| GET | `/api/wearable/dashboard` | ✅ | Dashboard complet |
| GET | `/api/wearable/export` | ✅ | Export des données |
| GET | `/api/wearable/alerts` | ✅ | Alertes fatigue/surcharge |

---

### 🛒 Marketplace (V6)

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/api/marketplace/drills` | ✅ | Catalogue de drills |
| GET | `/api/marketplace/drills/:id` | ✅ | Détail d'un drill pack |
| GET | `/api/marketplace/featured` | ✅ | Drills en vedette |
| GET | `/api/marketplace/trending` | ✅ | Tendances |
| GET | `/api/marketplace/categories` | ✅ | Catégories |
| POST | `/api/marketplace/drills/:id/purchase` | ✅ | Acheter un drill pack |
| GET | `/api/marketplace/my-purchases` | ✅ | Mes achats |
| POST | `/api/marketplace/publish` | ✅ | Publier un drill pack |
| PUT | `/api/marketplace/drills/:id` | ✅ | Modifier un drill pack |
| GET | `/api/marketplace/my-published` | ✅ | Mes publications |
| GET | `/api/marketplace/earnings` | ✅ | Revenus créateur |
| POST | `/api/marketplace/drills/:id/review` | ✅ | Laisser un avis |
| GET | `/api/marketplace/drills/:id/reviews` | ✅ | Avis d'un drill |
| GET | `/api/marketplace/creators/:id` | ✅ | Profil créateur |
| GET | `/api/marketplace/stats` | ✅ | Statistiques marketplace |
| POST | `/api/marketplace/drills/:id/wishlist` | ✅ | Ajouter/retirer wishlist |
| GET | `/api/marketplace/wishlist` | ✅ | Ma wishlist |
| POST | `/api/marketplace/drills/:id/reviews/:reviewId/helpful` | ✅ | Voter utile |

---

### 🏀 NBA Data (V6)

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/api/nba/players/search` | ❌ | Recherche de joueurs NBA |
| GET | `/api/nba/players/:id` | ❌ | Détail joueur NBA |
| GET | `/api/nba/teams` | ❌ | Liste des équipes NBA |
| GET | `/api/nba/inspirations` | ❌ | Inspirations de challenge |
| GET | `/api/nba/fg-pct` | ❌ | Pourcentages FG |
| GET | `/api/nba/health` | ❌ | Statut provider NBA |

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

### 🧾 Reports V6 (Highlights)

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/api/reports/session/:sessionId` | ✅ | Payload JSON de rapport de session |
| GET | `/api/reports/session/:sessionId/pdf` | ✅ | Export PDF binaire de session |
| GET | `/api/reports/scout/:userId` | ✅ | Payload JSON Scout Report |
| GET | `/api/reports/scout/:userId/pdf` | ✅ | Export PDF binaire Scout Report |
| GET | `/api/reports/templates` | ✅ | Liste des templates disponibles |

### 🏟️ Arena Realtime (Highlights)

| Canal | Direction | Description |
|-------|-----------|-------------|
| `ping` / `pong` | client ↔ serveur | Keep-alive |
| `ready` | client → serveur | Marquer un joueur prêt |
| `shot` | client → serveur | Soumettre un tir (avec `clientEventId` optionnel) |
| `scoreboard_sync` | client → serveur | Recharger le scoreboard |
| `state_sync` | client → serveur | Recharger état complet (match + scoreboard + présence) |
| `arena_presence` | serveur → clients | Liste des participants connectés |
| `arena_event_ignored` | serveur → client | Événement ignoré (duplication) |

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
  "version": "6.0.0",
  "codename": "Arena",
  "time": "2026-03-09T00:00:00.000Z",
  "checks": {
    "api": "ok",
    "database": "ok",
    "cvEngine": "ok"
  }
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

## WebSocket

Le serveur supporte les connexions WebSocket sur le préfixe `/ws` pour :
- **Voice Coach** : coaching vocal en temps réel (`/ws/coach`)
- **Session Pipeline** : analyse frame-by-frame (`/ws/sessions/:id`)
- **Arena Multiplayer** : événements live et scoreboard (`/ws/arena/:id`)

Protocole : `ws://localhost:8080/ws/*` (dev) · `wss://api.courtvision.ai/ws/*` (prod)
