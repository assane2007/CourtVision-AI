<div align="center">

# 🏀 CourtVision AI

### *Le coach IA qui te transforme. Pas juste qui te compte.*

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org)
[```

---

## 🏆 Communauté — Le Strava du Basket

La communauté CourtVision permet aux joueurs de se comparer, se défier, et progresser ensemble.
Classements multi-métriques, défis hebdomadaires, profils publics, badges, XP, feed d'activité et système de follow.

### Architecture

```
Session terminée → refresh-stats → public_profiles → leaderboard + badges check
Défi rejoint → challenge_submissions → ranking → XP + activité + badges
Follow → user_follows → notifications → activity_feed
```

### Endpoints

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/api/community/leaderboard` | Classement (metric: overall/shooting/mental/sessions, scope: global/friends) |
| `GET` | `/api/community/challenges` | Défis actifs avec classement |
| `POST` | `/api/community/challenges/:id/submit` | Soumettre un score à un défi |
| `GET` | `/api/community/feed` | Fil d'activité (amis + soi) avec pagination cursor |
| `GET` | `/api/community/profile/:userId` | Profil public d'un joueur + badges |
| `PUT` | `/api/community/profile` | Mettre à jour son profil (bio, team, location) |
| `POST` | `/api/community/follow/:userId` | Suivre un joueur |
| `DELETE` | `/api/community/follow/:userId` | Ne plus suivre un joueur |
| `GET` | `/api/community/friends` | Liste des amis avec stats |
| `GET` | `/api/community/search?q=...` | Rechercher un joueur |
| `GET` | `/api/community/badges` | Liste de tous les badges |
| `GET` | `/api/community/badges/me` | Mes badges débloqués |
| `GET` | `/api/community/notifications` | Notifications (badges, follows, défis...) |
| `POST` | `/api/community/notifications/read` | Marquer notifications comme lues |
| `POST` | `/api/community/refresh-stats` | Recalculer stats publiques depuis les analyses |

### Système de Badges

| Badge | Condition | Rareté | XP |
|---|---|---|---|
| 🏀 Premier Pas | 1 session | Common | 10 |
| 🔥 Régulier | 10 sessions | Common | 25 |
| 💪 Grindeur | 50 sessions | Rare | 100 |
| 🎯 Sniper | 60% au tir | Rare | 50 |
| 🔫 Sharpshooter | 70% au tir | Epic | 100 |
| 💦 Splash | 80% au tir | Legendary | 250 |
| 🧊 Ice Cold | Mental > 90 | Epic | 75 |
| 🧘 Zen Master | Mental > 95 | Legendary | 200 |
| 🦋 Papillon Social | 10 follows | Common | 25 |
| ⭐ Influenceur | 50 followers | Rare | 100 |
| 👑 Légende | 200 followers | Legendary | 500 |
| 🏆 Challenger | 1 défi gagné | Common | 50 |
| 🥇 Champion | 10 défis gagnés | Epic | 200 |

### Système XP & Niveaux

- **100 XP = 1 niveau**
- Session complétée : +15 XP
- Défi rejoint : +5 XP
- Défi gagné : +50 XP
- Follow : +2 XP
- Highlight partagé : +10 XP
- Badges : XP bonus selon rareté

### Exemple de réponse (leaderboard)

```json
{
  "entries": [
    {
      "rank": 1,
      "username": "Kylian B.",
      "score": 1250,
      "level": 13,
      "position": "PG",
      "trend": "up",
      "is_me": false
    }
  ],
  "metric": "overall",
  "scope": "global",
  "myRank": 4,
  "totalPlayers": 127
}
```

---

## 🧠 Pipeline IA (7 étapes)

Chaque vidéo uploadée passe par un pipeline complet en **< 2 minutes** : Native](https://img.shields.io/badge/React_Native-Expo-blue?logo=expo)](https://expo.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?logo=typescript)](https://typescriptlang.org)
[![Fastify](https://img.shields.io/badge/Fastify-4.x-white?logo=fastify)](https://fastify.io)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?logo=supabase)](https://supabase.com)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

<br/>

**L'IA qui analyse ton jeu de basket en vidéo.** Pose ton téléphone, joue, et reçois en 2 minutes :
détection de tirs, analyse mentale, reconstruction 3D, highlights automatiques, programme d'entraînement personnalisé.

[🚀 Démo Live](https://courtvision.ai) · [📖 Documentation](docs/) · [🐛 Signaler un bug](https://github.com/CourtVision-AI/issues)

</div>

---

## 📋 Table des matières

- [Fonctionnalités](#-fonctionnalités)
- [Architecture](#-architecture)
- [Stack Technique](#-stack-technique)
- [Pipeline IA (7 étapes)](#-pipeline-ia-7-étapes)
- [Structure du Projet](#-structure-du-projet)
- [Installation](#-installation)
- [Développement](#-développement)
- [Déploiement](#-déploiement)
- [Roadmap](#-roadmap)
- [Contribuer](#-contribuer)

---

## ✨ Fonctionnalités

| Fonctionnalité | Description | Status |
|---|---|---|
| 🎯 **Analyse de tirs** | Détection auto, zone, posture, comparaison NBA | ✅ |
| 🧠 **Mental Score** | Score de fragilité mentale, langage corporel | ✅ |
| 👁️ **Reconstruction 3D** | Vue aérienne, heatmap, distances parcourues | ✅ |
| 🎬 **Highlights auto** | Montage ESPN, TTS, watermark, templates | ✅ |
| 📊 **Rapport IA** | Rapport complet + programme 7 jours personnalisé | ✅ |
| ⚡ **Coach Live** | Analyse temps réel, alertes vibrantes | ✅ |
| 🤖 **Digital Twin** | Avatar IA évolutif, comparaison pros | ✅ |
| 🏆 **Communauté** | Classements, défis, profils publics, badges, XP, feed | ✅ |
| 💳 **Billing** | Stripe intégré, plans Joueur/Coach/Académie | ✅ |

---

## 🏗️ Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Mobile App     │────▶│   API Server │────▶│   AI Pipeline   │
│  (Expo/React     │     │  (Fastify)   │     │  (7 étapes)     │
│   Native)        │     │              │     │                 │
└─────────────────┘     └──────┬───────┘     └─────────────────┘
                               │
┌─────────────────┐     ┌──────┴───────┐     ┌─────────────────┐
│   Landing Page   │     │  Supabase    │     │  Redis/BullMQ   │
│   (Next.js)      │     │  (Postgres   │     │  (Job Queue)    │
│                  │     │   + Storage) │     │                 │
└─────────────────┘     └──────────────┘     └─────────────────┘
```

---

## 🛠️ Stack Technique

| Couche | Technologie |
|---|---|
| **Mobile** | React Native + Expo Router + NativeWind |
| **Web** | Next.js 14 + Tailwind CSS + Framer Motion |
| **API** | Fastify + TypeScript + BullMQ |
| **Base de données** | Supabase (PostgreSQL + Auth + Storage) |
| **IA** | Groq (Llama 3) / Ollama (fallback local) |
| **Vision** | MediaPipe + YOLOv8 (Python bridge) |
| **Vidéo** | FFmpeg (extraction, highlights, watermark) |
| **Paiement** | Stripe (subscriptions) |
| **Infra** | Railway (API) + Vercel (Web) |

---

## ⚡ Coach Live — API Temps Réel

Le Coach Live analyse ton match en direct via des frames envoyées depuis l'app mobile.
Il fournit un score mental, un index de fatigue, des alertes vibrantes contextuelles et un résumé post-match.

### Flow complet

```
Mobile (caméra) → capture frame toutes les 3s → API → LiveCoachEngine → alertes + vibration
```

### Endpoints

| Méthode | Route | Description |
|---|---|---|
| `POST` | `/api/sessions/:id/live` | Démarrer le mode Coach Live |
| `POST` | `/api/sessions/:id/live/frame` | Envoyer une frame (landmarks) → alertes |
| `POST` | `/api/sessions/:id/live/shot` | Enregistrer un tir (made/missed) |
| `POST` | `/api/sessions/:id/live/quarter` | Terminer un quart-temps → résumé |
| `POST` | `/api/sessions/:id/live/end` | Terminer le match → rapport final |
| `GET` | `/api/sessions/:id/live/status` | État courant de la session |
| `GET` | `/api/sessions/:id/live/stream` | SSE (Server-Sent Events) push alertes |

### Alertes disponibles

| Type | Déclencheur |
|---|---|
| `fatigue` | Vitesse en baisse vs baseline |
| `posture` | Épaules tombantes (body language) |
| `mental_drop` | Score mental < 40 |
| `mental_recovery` | Remontée après un creux |
| `shooting_hot` | FG% > 60% sur 5+ tirs |
| `shooting_cold` | FG% < 25% sur 5+ tirs |
| `hydration` | Rappel toutes les 12 min |
| `momentum` | Amélioration vs quart précédent |

### Exemple de réponse (frame)

```json
{
  "mentalScore": 72,
  "fatigueIndex": 25,
  "postureScore": 0.78,
  "alerts": [{
    "type": "shooting_hot",
    "severity": "info",
    "message": "Tu es chaud ! 4/6 (67%) — continue de shooter",
    "emoji": "🔥",
    "vibrate": true,
    "vibrationPattern": [100, 50, 100]
  }],
  "stats": {
    "shotsMade": 4,
    "shotsDetected": 6,
    "shootingPct": 67,
    "avgMentalScore": 68,
    "distanceCovered": 342
  }
}
```

---

## � Digital Twin — Avatar IA Évolutif

Le Digital Twin est un profil IA du joueur qui évolue à chaque session analysée.
Il agrège toutes les données d'analyse pour construire un modèle complet du joueur, avec comparaison NBA, simulation de match-ups et insights IA personnalisés.

### Architecture

```
Sessions analysées → TwinBuilder.aggregate() → TwinProfile → LLM Insights
TwinProfile + Adversaire → TwinSimulator.simulate() → MatchupResult
```

### Endpoints

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/api/twin/me` | Profil Twin complet du joueur |
| `POST` | `/api/twin/rebuild` | Reconstruire le Twin à partir de toutes les sessions |
| `POST` | `/api/twin/simulate` | Simuler un match-up (vs NBA ou vs joueur) |
| `GET` | `/api/twin/compare/:userId` | Comparer son Twin avec un autre joueur |
| `GET` | `/api/twin/evolution` | Historique d'évolution du Twin |
| `GET` | `/api/twin/insights` | Insights IA personnalisés (LLM) |

### Profil du Twin

Le Twin contient :
- **Note globale (0-100)** pondérée : Tir 35%, Mental 25%, Physique 20%, Tactique 20%
- **Style de jeu** détecté automatiquement (Sharpshooter, Slasher, Playmaker, etc.)
- **Comparaisons NBA** (top 3 joueurs les plus similaires)
- **Forces & Faiblesses** avec recommandations de drills
- **Zones de confort** (efficiency par zone de tir)
- **Profil mental** (résilience, clutch factor, régularité, réponse sous pression)
- **Signature de pose** (angle coude, hauteur release, main dominante)
- **Courbe d'évolution** sur les 30 dernières sessions

### Simulation de Match-Up

```json
{
  "opponent": "Stephen Curry",
  "winProbability": 32,
  "predictedScore": { "player": 18, "opponent": 24 },
  "advantages": ["Avantage physique"],
  "vulnerabilities": ["Désavantage au tir"],
  "gameplan": [
    "Défends fort sur le tir adverse, attaque le cercle",
    "Impose le rythme physiquement, en transition"
  ],
  "keyMatchups": [
    { "area": "Tir", "edge": "opponent" },
    { "area": "Mental", "edge": "even" },
    { "area": "Physique", "edge": "player" },
    { "area": "Tactique", "edge": "opponent" }
  ]
}
```

---

## �🧠 Pipeline IA (7 étapes)

Chaque vidéo uploadée passe par un pipeline complet en **< 2 minutes** :

```
Vidéo ──▶ 1. Prétraitement ──▶ 2. Tracking ──▶ 3. Reconstruction 3D
          (FFmpeg, frames,     (MediaPipe,     (Homographie,
           homographie,         YOLOv8,          heatmap,
           segments actifs)     ByteTrack)       distances)
                                    │
        4. Analyse Tirs ◀───────────┘
        (zones, posture,    ──▶ 5. Analyse Mentale
         angle coude,           (fragilité, patterns,
         comparaison NBA)        fatigue, body language)
              │                       │
              ▼                       ▼
        6. Rapport IA ◀──────────────┘
        (LLM Groq/Ollama,  ──▶ 7. Highlight Reel
         programme 7 jours)     (clips, FFmpeg,
                                 templates, TTS)
```

**Points forts :**
- 🔄 Fallback automatique Groq → Ollama → heuristiques
- 📐 33 landmarks corporels trackés par joueur
- 🏀 Calibration terrain FIBA (homographie DLT)
- 🧪 Scoring mental basé sur recherches académiques
- 🎬 3 templates de montage (ESPN, cinematic, raw)

---

## 📁 Structure du Projet

```
courtvision-ai/
├── apps/
│   ├── mobile/          # App React Native (Expo)
│   │   ├── app/         # Pages Expo Router
│   │   └── ...
│   └── web/             # Landing page Next.js
│       └── src/app/     # App Router
├── packages/
│   ├── ai/              # Pipeline IA complet
│   │   └── src/
│   │       ├── preprocessing.ts      # Étape 1
│   │       ├── tracking.ts           # Étape 2
│   │       ├── reconstruction3d.ts   # Étape 3
│   │       ├── shotAnalysis.ts       # Étape 4
│   │       ├── mentalAnalysis.ts     # Étape 5
│   │       ├── reportGenerator.ts    # Étape 6
│   │       ├── highlightEditor.ts    # Étape 7
│   │       ├── liveCoach.ts          # ⚡ Coach Live (temps réel)
│   │       ├── digitalTwin.ts       # 🤖 Digital Twin (avatar IA)
│   │       └── llm/                  # Groq + Ollama
│   ├── api/             # Backend Fastify
│   │   └── src/
│   │       ├── routes/  # Endpoints REST
│   │       ├── queue/   # BullMQ video processor
│   │       └── plugins/ # Auth, Supabase
│   ├── database/        # Schema SQL + RLS
│   └── shared/          # Types partagés
├── docs/                # Documentation
└── infra/               # Config infra
```

---

## 🚀 Installation

### Prérequis

- **Node.js** ≥ 18
- **npm** ≥ 9 (workspaces)
- **FFmpeg** installé et dans le PATH
- **Redis** (pour BullMQ)
- Compte [Supabase](https://supabase.com) (base + auth + storage)
- Clé API [Groq](https://console.groq.com) (gratuit)
- *(Optionnel)* [Ollama](https://ollama.com) pour le fallback LLM local

### Setup

```bash
# 1. Cloner le repo
git clone https://github.com/votre-user/CourtVision-AI.git
cd CourtVision-AI/courtvision-ai

# 2. Installer les dépendances (workspaces)
npm install

# 3. Copier le fichier d'environnement
cp .env.example .env

# 4. Configurer les variables d'environnement
# Voir .env.example pour la liste complète
```

### Variables d'environnement

```env
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Groq (IA)
GROQ_API_KEY=gsk_...

# Stripe (Paiement)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Redis (Queue)
REDIS_URL=redis://localhost:6379

# Optionnel
OLLAMA_BASE_URL=http://localhost:11434
```

---

## 💻 Développement

```bash
# Landing page (Next.js)
cd apps/web && npm run dev      # → http://localhost:3000

# API Backend
cd packages/api && npm run dev  # → http://localhost:3001

# App Mobile (Expo)
cd apps/mobile && npx expo start

# Lancer la base de données
# Importer schema.sql dans votre projet Supabase
```

---

## 🚢 Déploiement

| Service | Plateforme | Config |
|---|---|---|
| Landing Page | **Vercel** | `apps/web/vercel.json` |
| API | **Railway** | `railway.toml` |
| Database | **Supabase** | `packages/database/schema.sql` |
| Mobile | **EAS Build** | `apps/mobile/eas.json` |

---

## 🗺️ Roadmap

- [x] Pipeline IA 7 étapes (preprocessing → highlights)
- [x] Landing page Next.js responsive
- [x] Système de billing Stripe
- [x] Schema SQL + RLS Supabase
- [x] Onboarding mobile (3 écrans)
- [x] Tests E2E & unitaires API
- [x] Tests unitaires package AI
- [x] Coach Live (temps réel)
- [x] Digital Twin complet
- [x] Communauté (classements, défis, badges, XP, feed, profils publics)
- [ ] Mode hors-ligne (analyse locale)
- [ ] Multi-joueurs tracking
- [ ] Export PDF rapports
- [ ] App Store / Play Store

---

## 🤝 Contribuer

Les contributions sont les bienvenues ! Voir [CONTRIBUTING.md](CONTRIBUTING.md) pour les guidelines.

1. Fork le repo
2. Crée ta branche (`git checkout -b feature/amazing-feature`)
3. Commit tes changements (`git commit -m 'Add amazing feature'`)
4. Push sur la branche (`git push origin feature/amazing-feature`)
5. Ouvre une Pull Request

---

## 📄 Licence

Ce projet est sous licence MIT. Voir [LICENSE](LICENSE) pour plus de détails.

---

<div align="center">

**Fait avec 🏀 et ❤️ par l'équipe CourtVision AI**

[Website](https://courtvision.ai) · [Twitter](https://twitter.com/courtvisionai) · [Discord](https://discord.gg/courtvision)

</div>

