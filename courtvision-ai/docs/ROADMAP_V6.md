# 🚀 CourtVision AI — Roadmap v6.0 "Arena"

> **Codename** : Arena  
> **Version** : 6.0.0  
> **Date de rédaction** : Juin 2025  
> **Auteur** : CourtVision AI Engineering  
> **Statut** : En développement

---

## 📋 Résumé Exécutif

La version 6.0 "Arena" transforme CourtVision AI d'un outil d'analyse individuel en une **plateforme sociale compétitive** en temps réel. Cinq features majeures viennent enrichir l'écosystème :

| # | Feature | Impact | Complexité | Priorité |
|---|---------|--------|------------|----------|
| 1 | ⚔️ Challenge Multi-joueurs Temps Réel | Retention +40% | 🔴 Haute | P0 |
| 2 | 🐴 Mode HORSE IA | Engagement +30% | 🟡 Moyenne | P1 |
| 3 | 📄 Export PDF Scout Report | Conversion +25% | 🟢 Basse | P1 |
| 4 | ⌚ Apple Watch HRV Integration | Differentiation | 🟡 Moyenne | P2 |
| 5 | 🏪 Marketplace de Drills | Revenue +20% | 🔴 Haute | P2 |

---

## ⚔️ Feature 1 : Challenge Multi-joueurs Temps Réel

### Vision
Permettre à 2-8 joueurs de s'affronter simultanément dans des défis de tir en temps réel. Chaque joueur filme sa session via le mobile, et un tableau de scores live est synchronisé via WebSocket.

### Analyse de Faisabilité
- **Infrastructure existante** : WebSocket déjà implémenté (`@fastify/websocket`, routes `/ws`), BullMQ pour les jobs asynchrones, Supabase Realtime pour les subscriptions.
- **Pattern réutilisable** : Le système de Crews (`crews.ts`) fournit déjà la gestion de groupes ; les Challenges (`community.ts`) fournissent la logique de soumission/classement.
- **Risque** : La synchronisation temps réel de 8 flux simultanés requiert un serveur WebSocket dédié en production. Redis Pub/Sub recommandé pour le scaling horizontal.
- **Complexité estimée** : ~3-4 semaines (2 devs)

### Architecture Technique

```
┌──────────────┐     WebSocket      ┌──────────────────┐     Redis PubSub     ┌──────────────┐
│  Mobile App  │ ◄─────────────────► │  Fastify WS Hub  │ ◄──────────────────► │  Redis Rooms │
│  (Expo)      │   shots/scores      │  /ws/arena       │   room:{arenaId}     │              │
└──────────────┘                     └────────┬─────────┘                      └──────────────┘
                                              │
                                    ┌─────────▼──────────┐
                                    │   Supabase DB      │
                                    │   arena_matches    │
                                    │   arena_scores     │
                                    └────────────────────┘
```

### Endpoints API

| Méthode | Route | Description |
|---------|-------|-------------|
| `POST` | `/api/arena/create` | Créer un match arena (host) |
| `GET` | `/api/arena/available` | Lister les matchs ouverts |
| `POST` | `/api/arena/:id/join` | Rejoindre un match |
| `POST` | `/api/arena/:id/ready` | Signaler prêt |
| `POST` | `/api/arena/:id/shot` | Enregistrer un tir (temps réel) |
| `GET` | `/api/arena/:id/scoreboard` | Scoreboard temps réel |
| `POST` | `/api/arena/:id/end` | Terminer le match |
| `GET` | `/api/arena/history` | Historique des matchs |
| `GET` | `/api/arena/leaderboard` | Classement Arena global |
| `WS` | `/ws/arena/:id` | WebSocket temps réel du match |

### Types Partagés (shared)

```typescript
ArenaMatch, ArenaPlayer, ArenaScoreboard, 
ArenaShotEvent, ArenaConfig, ArenaLeaderboardEntry
```

### Tables SQL

```sql
arena_matches    — Matchs créés (id, host_id, mode, status, config, started_at, ended_at)
arena_players    — Joueurs dans un match (match_id, user_id, score, shots_made, shots_total)
arena_shot_log   — Log de chaque tir en temps réel (match_id, user_id, timestamp, result, zone)
arena_leaderboard — Classement agrégé (user_id, wins, losses, avg_accuracy, elo_rating)
```

---

## 🐴 Feature 2 : Mode HORSE IA

### Vision
Recréer le jeu classique de HORSE en version numérique. L'IA génère des défis de tirs impossibles (inspirés de NBA stars), et les joueurs doivent les reproduire. L'IA évalue la similarité du tir via la biomécanique (Shot DNA).

### Analyse de Faisabilité
- **Infrastructure existante** : Shot DNA™ (`shotDna.ts`) fournit l'analyse biomécanique, le `SimulationService` gère les matchups, le `SmartTrainingEngine` connaît les drills.
- **Pattern réutilisable** : Le système de quêtes (`quests.ts`) avec progression par étapes est directement applicable aux lettres H-O-R-S-E.
- **Innovation** : L'IA peut générer des défis basés sur les faiblesses du joueur (zones froides détectées par le heatmap), créant un entraînement déguisé en jeu.
- **Complexité estimée** : ~2-3 semaines (1-2 devs)

### Architecture Technique

```
┌──────────────┐                  ┌──────────────────┐
│  Mobile App  │ ──── shot ────►  │  HORSE Engine    │
│  Camera      │                  │  (AI Service)    │
└──────┬───────┘                  └────────┬─────────┘
       │                                   │
       │ video frame                       │ compare biomechanics
       ▼                                   ▼
┌──────────────┐                  ┌──────────────────┐
│  CV Engine   │ ── pose data ──► │  Shot DNA        │
│  (Python)    │                  │  Similarity      │
└──────────────┘                  └──────────────────┘
```

### Endpoints API

| Méthode | Route | Description |
|---------|-------|-------------|
| `POST` | `/api/horse/start` | Démarrer une partie HORSE |
| `GET` | `/api/horse/:id` | État de la partie en cours |
| `POST` | `/api/horse/:id/challenge` | IA génère un défi de tir |
| `POST` | `/api/horse/:id/attempt` | Soumettre une tentative |
| `POST` | `/api/horse/:id/skip` | Passer (prend une lettre) |
| `GET` | `/api/horse/:id/result` | Résultat final |
| `GET` | `/api/horse/history` | Historique des parties |
| `GET` | `/api/horse/challenges` | Bibliothèque de défis |
| `GET` | `/api/horse/leaderboard` | Classement HORSE |

### Types Partagés

```typescript
HorseGame, HorseChallenge, HorseAttempt,
HorseGameState, HorseChallengeType, HorseLeaderboardEntry
```

### Tables SQL

```sql
horse_games       — Parties (id, user_id, difficulty, status, letters, score, started_at)
horse_challenges  — Défis générés par l'IA (id, game_id, round, challenge_type, target_zone, 
                    target_technique, nba_inspiration, description, difficulty)
horse_attempts    — Tentatives des joueurs (id, challenge_id, user_id, success, 
                    similarity_score, shot_data, timestamp)
```

---

## 📄 Feature 3 : Export PDF Scout Report

### Vision
Générer un rapport PDF professionnel de niveau scout NBA à partir des données d'une session ou d'un profil complet. Export client-side (react-pdf) ou server-side (pdfkit). Partageable avec coaches, recruteurs, agents.

### Analyse de Faisabilité
- **Infrastructure existante** : `PdfReportService` existe déjà dans `services/pdfReportService.ts` avec la génération de `SessionReport` JSON. La route `GET /api/reports/:sessionId` est fonctionnelle.
- **Évolution nécessaire** : Ajouter un vrai rendu PDF server-side avec `pdfkit` ou `@react-pdf/renderer`, ajouter les templates "Scout Report", "Player Card", "Season Summary".
- **Impact business** : Feature premium différenciante. Les coaches payants peuvent exporter et partager des rapports PDF brandés.
- **Complexité estimée** : ~1-2 semaines (1 dev)

### Architecture Technique

```
┌──────────────┐     GET /api/reports/scout/:userId
│  Client      │ ◄──────────────────────────────────┐
│  (Mobile/Web)│                                     │
└──────────────┘                                     │
                                           ┌─────────┴──────────┐
                                           │  ScoutReportService │
                                           │  - Player Profile    │
                                           │  - Shot DNA          │
                                           │  - Apex Score        │
                                           │  - Season Stats      │
                                           │  - Heatmaps          │
                                           │  - AI Evaluation     │
                                           └─────────┬──────────┘
                                                     │
                                           ┌─────────▼──────────┐
                                           │  PDFKit / React-PDF │
                                           │  Binary PDF Stream  │
                                           └────────────────────┘
```

### Endpoints API

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/reports/scout/:userId` | Scout report complet (PDF) |
| `GET` | `/api/reports/session/:sessionId` | Session report (PDF amélioré) |
| `GET` | `/api/reports/season/:userId` | Season summary report |
| `GET` | `/api/reports/player-card/:userId` | Player card exportable |
| `POST` | `/api/reports/custom` | Rapport personnalisé |
| `GET` | `/api/reports/templates` | Templates disponibles |

### Types Partagés

```typescript
ScoutReport, ScoutReportSection, ScoutReportConfig,
ReportTemplate, ReportExportFormat, PlayerCardData
```

---

## ⌚ Feature 4 : Apple Watch HRV Integration

### Vision
Connecter l'Apple Watch (via HealthKit) pour capturer la variabilité de la fréquence cardiaque (HRV), la fréquence cardiaque au repos, les calories brûlées et le VO2max. Ces données enrichissent le Recovery Score et le Readiness Score existants.

### Analyse de Faisabilité
- **Infrastructure existante** : Le système de Recovery (`recovery.ts`, `RecoveryLogPayload`) accepte déjà `hrv` et `restingHR` en optionnel. Le `RecoveryScoreResponse` calcule déjà un score de readiness.
- **Côté mobile** : `expo-health-connect` (Android) et `react-native-health` (iOS) permettent de lire HealthKit/Health Connect.
- **Évolution nécessaire** : API endpoint pour sync batch des données wearable, algorithme HRV → Readiness amélioré, dashboard wearable data.
- **Complexité estimée** : ~2-3 semaines (1 dev mobile + 1 dev API)

### Architecture Technique

```
┌──────────────┐    HealthKit     ┌──────────────────┐     REST API     ┌──────────────┐
│  Apple Watch │ ──────────────►  │  iPhone App      │ ──────────────►  │  Fastify API │
│  HRV Sensor  │   background     │  (Expo + Health) │   /api/wearable  │  + Recovery  │
└──────────────┘                  └──────────────────┘                  └──────┬───────┘
                                                                               │
                                                                     ┌─────────▼──────────┐
                                                                     │  Recovery Engine    │
                                                                     │  HRV Analysis       │
                                                                     │  Readiness Score    │
                                                                     │  Training Adjust    │
                                                                     └────────────────────┘
```

### Endpoints API

| Méthode | Route | Description |
|---------|-------|-------------|
| `POST` | `/api/wearable/sync` | Sync batch des données wearable |
| `GET` | `/api/wearable/latest` | Dernières données wearable |
| `GET` | `/api/wearable/hrv/trend` | Tendance HRV sur 30 jours |
| `GET` | `/api/wearable/readiness` | Score de readiness enrichi |
| `GET` | `/api/wearable/training-load` | Charge d'entraînement |
| `GET` | `/api/wearable/dashboard` | Dashboard wearable complet |
| `POST` | `/api/wearable/connect` | Connecter un device |
| `DELETE` | `/api/wearable/disconnect` | Déconnecter un device |

### Types Partagés

```typescript
WearableDevice, WearableSyncPayload, HRVReading,
WearableDashboard, TrainingLoadPayload, ReadinessEnhanced
```

### Tables SQL

```sql
wearable_devices  — Devices connectés (id, user_id, platform, device_name, last_sync)
wearable_data     — Données brutes (id, user_id, device_id, type, value, unit, recorded_at)
hrv_readings      — Lectures HRV (id, user_id, rmssd, sdnn, lnrmssd, resting_hr, recorded_at)
training_load     — Charge calculée (id, user_id, acute_load, chronic_load, ratio, risk, date)
```

---

## 🏪 Feature 5 : Marketplace de Drills

### Vision
Créer un marketplace où les coaches et créateurs peuvent publier, vendre et partager des programmes de drills personnalisés. Les joueurs achètent des packs de drills premium, les intègrent dans leur plan d'entraînement, et les coaches gagnent des revenus.

### Analyse de Faisabilité
- **Infrastructure existante** : Le système de training (`training.ts`) gère déjà une bibliothèque de drills et des plans adaptatifs. Le billing Stripe (`billing.ts`) est en place.
- **Pattern réutilisable** : Les Crews permettent déjà la gestion de communautés ; le système de badges/XP peut récompenser les créateurs.
- **Monétisation** : Revenue share 70/30 (créateur/plateforme). Paiement via Stripe Connect.
- **Complexité estimée** : ~4-5 semaines (2-3 devs)

### Architecture Technique

```
┌──────────────┐                  ┌──────────────────┐
│  Coach App   │ ── publish ────► │  Marketplace API │
│  (Creator)   │                  │  /api/marketplace │
└──────────────┘                  └────────┬─────────┘
                                           │
┌──────────────┐                  ┌────────▼─────────┐
│  Player App  │ ── purchase ───► │  Stripe Connect  │
│  (Consumer)  │                  │  Revenue Share    │
└──────┬───────┘                  └────────┬─────────┘
       │                                   │
       │ integrate                         │ royalty
       ▼                                   ▼
┌──────────────┐                  ┌──────────────────┐
│  Training    │                  │  Creator Wallet  │
│  Plan Engine │                  │  Dashboard       │
└──────────────┘                  └──────────────────┘
```

### Endpoints API

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/marketplace/drills` | Catalogue de drills |
| `GET` | `/api/marketplace/drills/:id` | Détail d'un drill pack |
| `GET` | `/api/marketplace/featured` | Drills en vedette |
| `GET` | `/api/marketplace/categories` | Catégories de drills |
| `POST` | `/api/marketplace/drills/:id/purchase` | Acheter un drill pack |
| `GET` | `/api/marketplace/my-purchases` | Mes achats |
| `POST` | `/api/marketplace/publish` | Publier un drill pack (coach) |
| `PUT` | `/api/marketplace/drills/:id` | Modifier un drill publié |
| `GET` | `/api/marketplace/my-published` | Mes drills publiés |
| `GET` | `/api/marketplace/earnings` | Revenus créateur |
| `POST` | `/api/marketplace/drills/:id/review` | Laisser un avis |
| `GET` | `/api/marketplace/drills/:id/reviews` | Avis d'un drill |
| `GET` | `/api/marketplace/creators/:id` | Profil créateur |
| `GET` | `/api/marketplace/trending` | Tendances |

### Types Partagés

```typescript
DrillPack, DrillPackItem, DrillCategory, DrillReview,
CreatorProfile, PurchaseRecord, MarketplaceStats,
DrillPackCreatePayload, DrillDifficulty, DrillEquipment
```

### Tables SQL

```sql
drill_packs        — Packs publiés (id, creator_id, title, description, price_cents, 
                     category, difficulty, equipment, rating, sales_count, status)
drill_pack_items   — Items dans un pack (id, pack_id, title, description, duration_min,
                     video_url, instructions, position, difficulty)
drill_purchases    — Achats (id, user_id, pack_id, price_paid, stripe_payment_id, purchased_at)
drill_reviews      — Avis (id, user_id, pack_id, rating, comment, created_at)
creator_profiles   — Profils créateurs (id, user_id, display_name, bio, stripe_connect_id,
                     total_earnings, total_sales, verified, created_at)
```

---

## 📊 Planning de Développement

### Sprint 1 (Semaines 1-2) — Fondations
- [ ] Types partagés v6 dans `@courtvision/shared`
- [ ] Migration SQL pour toutes les nouvelles tables
- [ ] Export PDF Scout Report (feature la plus rapide)
- [ ] Scaffolding Arena WebSocket

### Sprint 2 (Semaines 3-4) — Core Features
- [ ] Challenge Multi-joueurs MVP (2 joueurs)
- [ ] Mode HORSE IA (vs IA)
- [ ] Apple Watch sync endpoint

### Sprint 3 (Semaines 5-6) — Scale & Polish
- [ ] Arena 2-8 joueurs + leaderboard
- [ ] HORSE multiplayer
- [ ] Wearable dashboard

### Sprint 4 (Semaines 7-8) — Marketplace
- [ ] Marketplace backend complet
- [ ] Stripe Connect integration
- [ ] Creator tools

### Sprint 5 (Semaines 9-10) — Mobile & Launch
- [ ] UI mobile pour toutes les features
- [ ] Tests E2E
- [ ] Performance optimization
- [ ] Launch v6.0 🚀

---

## 🔧 Prérequis Techniques

### Nouvelles Dépendances
```json
{
  "pdfkit": "^0.14.0",
  "stripe": "^14.0.0 (upgrade pour Connect)",
  "ioredis": "^5.3.0 (PubSub pour Arena)"
}
```

### Variables d'Environnement
```env
STRIPE_CONNECT_CLIENT_ID=
STRIPE_CONNECT_SECRET=
ARENA_MAX_PLAYERS=8
ARENA_ROUND_TIMEOUT_SEC=120
MARKETPLACE_COMMISSION_PCT=30
```

---

## 📈 Métriques de Succès

| Métrique | Objectif v6.0 | Mesure |
|----------|---------------|--------|
| DAU (Daily Active Users) | +40% | Analytics |
| Retention D7 | >50% | Cohort analysis |
| Session Duration | +25% | Mixpanel |
| Revenue (Marketplace) | $10k MRR M3 | Stripe |
| NPS Score | >60 | Survey |
| Arena Matches/Day | >1000 | DB query |

---

*Ce document est vivant et sera mis à jour au fil du développement de la v6.0.*
