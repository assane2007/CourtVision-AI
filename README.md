<div align="center">

# 🏀 CourtVision AI

### *Le coach IA qui te transforme. Pas juste qui te compte.*

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org)
[![React Native](https://img.shields.io/badge/React_Native-Expo_54-blue?logo=expo)](https://expo.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://typescriptlang.org)
[![Fastify](https://img.shields.io/badge/Fastify-4.x-white?logo=fastify)](https://fastify.io)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?logo=supabase)](https://supabase.com)
[![Python](https://img.shields.io/badge/Python-FastAPI-yellow?logo=python)](https://fastapi.tiangolo.com)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-5.3.0-brightgreen)](courtvision-ai/LAUNCH_LOG.md)
[![Tests](https://img.shields.io/badge/tests-311_passing-success)](courtvision-ai/)

<br/>

**L'IA qui analyse ton jeu de basket en vidéo.** Pose ton téléphone, joue, et reçois en 2 minutes :
détection de tirs, analyse mentale, reconstruction 3D, highlights automatiques, programme d'entraînement personnalisé.

[🚀 Démo Live](https://courtvision.ai) · [📖 Documentation](courtvision-ai/docs/) · [🐛 Signaler un bug](https://github.com/CourtVision-AI/issues)

</div>

---

## 📋 Table des matières

- [Fonctionnalités](#-fonctionnalités)
- [Architecture](#-architecture-technique)
- [Stack Technique](#-stack-technique--état-du-projet)
- [Structure du Projet](#-structure-du-projet)
- [Installation](#-installation)
- [Tests](#-tests)
- [API (30+ routes)](#-api-30-routes)
- [Docker](#-docker)
- [Configuration](#-configuration--variables-denvironnement)
- [Troubleshooting](#-troubleshooting)
- [Roadmap](#-roadmap-v6x)
- [Contribuer](#-contribuer)

---

## ✨ Fonctionnalités

| Fonctionnalité | Description | Status |
|---|---|---|
| 🎯 **Analyse de tirs** | Détection auto, zone, posture, comparaison NBA | ✅ |
| 🧬 **Shot DNA™** | Empreinte biomécanique unique, signature 3D de tir | ✅ |
| 🧠 **Mental Score** | Score de fragilité mentale, langage corporel | ✅ |
| 🔮 **Predictive Engine** | Prédiction performance, momentum, zones chaudes | ✅ |
| 👁️ **Reconstruction 3D** | Vue aérienne, heatmap, distances parcourues | ✅ |
| 🎬 **Highlights auto** | Montage cinématique, TTS, watermark, musique | ✅ |
| 📊 **Advanced Analytics** | Shot Quality Score, Clutch Rating™, xShots | ✅ |
| ⚡ **Coach Live** | Analyse temps réel SSE, alertes vibrantes | ✅ |
| 🤖 **Coach Chat IA** | Conversationnel avec mémoire RAG (Groq/Llama 3) | ✅ |
| 🏋️ **Smart Training** | Plans adaptatifs, periodization auto, drills IA | ✅ |
| 💊 **Recovery Engine** | Score récupération, corrélation performance | ✅ |
| 🤖 **Digital Twin** | Avatar IA évolutif, simulation matchups, radar | ✅ |
| 📱 **Realtime Pipeline** | Pose estimation + AR overlay natif (60fps) | ✅ |
| 🎮 **Gamification** | XP, Niveaux, Badges, Quêtes, Crews, Saisons | ✅ |
| 🏆 **Communauté** | Classements, défis, profils publics, amis | ✅ |
| 📤 **Partage Viral** | TikTok export, Twin Cards, highlights partageables | ✅ |
| 💳 **Billing** | Stripe intégré, plans Joueur/Coach/Académie | ✅ |
| 🔔 **Push Notifications** | Rappels streak, daily challenge, rapports hebdo | ✅ |
| 🎙️ **Voice Coach** | Coaching vocal temps réel via WebSocket | ✅ |
| 👥 **Shadow League** | Simulation multi-agents nocturne (1000 matchs) | ✅ |
| 🔭 **Precog** | Prédiction pre-game avancée | ✅ |

---

## 🏗️ Architecture Technique

### Cycle de Vie d'une Analyse

1.  **Capture & Upload** : L'app mobile capture la vidéo et l'uploade sur **Supabase Storage**.
2.  **Ingestion** : L'API reçoit l'URL et crée un job dans la queue **BullMQ**.
3.  **Traitement IA** (Package `@courtvision/ai`) :
    *   *Preprocessing* : Extraction des frames via **FFmpeg**.
    *   *Inférence* : Tracking via **YOLOv8** et **MediaPipe** (cv-engine Python).
    *   *Analyse Géo-Spatiale* : Reconstruction 3D et heatmap des tirs.
    *   *Analyse Mentale* : Scoring du body language et de la fatigue.
    *   *Shot DNA™* : Empreinte biomécanique unique.
4.  **Synthèse** : Génération d'un rapport complet par un **LLM (Groq/Llama 3)**.
5.  **Édition** : Création automatique d'un reel de highlights avec **FFmpeg**.
6.  **Notification** : Push via **Expo Notifications** dès que les résultats sont prêts.

### Flux de Données

```mermaid
graph TD
    A[Mobile App] -->|Upload Vidéo| B(Supabase Storage)
    A -->|POST /upload| C[Fastify API]
    C -->|Add Job| D[Redis/BullMQ]
    D -->|Process| E[AI Worker]
    E -->|HTTP| F[CV Engine Python]
    F -->|YOLO+MediaPipe| E
    E -->|Analyze| G[@courtvision/ai]
    G -->|Resultats JSON| H[(PostgreSQL)]
    G -->|Highlights| B
    E -->|Done| C
    C -->|Push| A
    C -->|WebSocket| A
```

---

## 🛠️ Stack Technique & État du Projet

Le projet est en **Version 5.3.0** (Codename: Skill-Hardened) — Mars 2026.

| Couche | Technologies |
|--------|-------------|
| **Frontend Mobile** | Expo 54, React Native 0.81, Expo Router, Zustand, NativeWind, Reanimated |
| **Frontend Web** | Next.js 14, Tailwind CSS, Framer Motion, Three.js/React Three Fiber |
| **Backend API** | Fastify 4.x, BullMQ, Zod, WebSocket, Stripe, Sentry |
| **Intelligence Artificielle** | TypeScript (pipeline), Groq/Llama 3, MediaPipe, ONNX Runtime |
| **Computer Vision** | Python FastAPI, YOLOv8, OpenCV, MediaPipe, ByteTrack |
| **Base de données** | Supabase (PostgreSQL, Auth, RLS, Storage, pgvector) |
| **Infrastructure** | Docker, Terraform, Railway, Vercel, Cloudflare |
| **Tests** | Jest (311 tests, 23 suites, 100% pass), Playwright E2E |

---

## 📁 Structure du Projet

```
CourtVision-AI/
├── courtvision-ai/                 # Monorepo principal
│   ├── apps/
│   │   ├── mobile/                 # React Native (Expo 54)
│   │   │   ├── app/                # Screens (Expo Router)
│   │   │   ├── components/         # Composants UI (Glassmorphism)
│   │   │   ├── lib/                # API client, stores Zustand
│   │   │   └── hooks/              # Custom hooks
│   │   ├── web/                    # Next.js 14 (Dashboard + Landing)
│   │   │   └── src/app/            # App Router (dashboard, login, etc.)
│   │   └── cv-engine/              # Python FastAPI (YOLO, MediaPipe)
│   ├── packages/
│   │   ├── ai/                     # Pipeline IA (20+ modules)
│   │   │   └── src/                # shotDNA, coachChat, predictive, etc.
│   │   ├── api/                    # Fastify Backend (30+ routes)
│   │   │   └── src/routes/         # auth, sessions, twin, billing, etc.
│   │   ├── shared/                 # Types, erreurs, logger, feature flags
│   │   ├── database/               # Schémas SQL, migrations, pgvector
│   │   └── python/                 # Scripts ML (tracker)
│   ├── docs/                       # API.md, Architecture, Skills Explorer
│   ├── infra/                      # Terraform (staging + production)
│   └── scripts/                    # validate_skills, build_index
├── CONTRIBUTING.md
├── SECURITY.md
├── LICENSE
└── README.md                       # ← Ce fichier
```

---

## 🚀 Installation

### Prérequis
- **Node.js** ≥ 20.0.0
- **Docker** + **Docker Compose**
- **Python** 3.11+ (pour cv-engine, optionnel en local)

### Setup

```bash
# Clone
git clone https://github.com/your-org/CourtVision-AI.git
cd CourtVision-AI/courtvision-ai

# Install des dépendances (monorepo)
npm install --legacy-peer-deps

# Variables d'environnement
cp .env.example .env
# Remplir les variables (voir section Configuration)

# Infrastructure locale
docker compose up -d

# Build complet
npm run build

# Développement
npm run dev:api    # → http://localhost:8080
npm run dev:web    # → http://localhost:3000
```

---

## 🧪 Tests

```bash
# Tous les tests (API + AI)
npm test

# Uniquement API (126 tests, 9 suites)
npm run test:api

# Uniquement AI (185 tests, 14 suites)
npm run test:ai
```

> **Résultat actuel : 311 tests, 23 suites, 100% pass** ✅

---

## 📡 API (30+ routes)

Base URL : `http://localhost:8080` (dev) · `https://api.courtvision.ai` (prod)

| Prefix | Module | Description |
|--------|--------|-------------|
| `/api/auth` | Auth | Inscription, connexion, refresh, profil |
| `/api/sessions` | Sessions | Upload vidéo, liste, détail, suppression, status SSE |
| `/api/analyses` | Analyses | Rapport IA, heatmap, highlights, programme 7j |
| `/api/twin` | Digital Twin | Profil IA, simulation matchups, comparaison |
| `/api/shot-dna` | Shot DNA™ | Empreinte biomécanique, évolution, NBA compare |
| `/api/predict` | Prédictions | Performance, zones, momentum |
| `/api/training` | Smart Training | Plans adaptatifs, progression, drills |
| `/api/coach` | Coach Chat | Conversation IA, mémoire RAG, suggestions |
| `/api/recovery` | Récupération | Score, recommandations, corrélation |
| `/api/analytics` | Advanced Analytics | SQS, Clutch Rating, xShots |
| `/api/quests` | Gamification | Quêtes quotidiennes/hebdo/saisonnières |
| `/api/crews` | Équipes | Création, classement, défis d'équipe |
| `/api/community` | Communauté | Leaderboard, défis, amis |
| `/api/billing` | Billing | Plans Stripe, checkout, portail, webhook |
| `/api/live` | Coach Live | Mode live, envoi de frames |
| `/api/share` | Partage | Twin Cards, highlights partageables |
| `/api/tiktok` | TikTok Export | Clips viraux automatiques |
| `/api/highlights` | Highlights | Édition, rendu, musique |
| `/api/shadow` | Shadow League | Simulations nocturnes |
| `/api/spatial` | Spatial | Reconstruction 3D |
| `/api/precog` | Precog | Prédictions pre-game |
| `/api/players` | Joueurs | Profils publics, recherche |
| `/api/investor` | Investisseurs | Métriques, KPI dashboard |
| `/api/reports` | Rapports | PDF, exports pro |
| `/api/dashboard` | Dashboard | Métriques consolidées |
| `/api/shooting-sessions` | Sessions tir | Stats détaillées par session |
| `/ws` | WebSocket | Voice coach, live updates |
| `/health` | Health Check | Status API + DB + CV Engine |

> Voir [API Reference complète](courtvision-ai/docs/API.md) pour les détails de chaque endpoint.

---

## 🐳 Docker

```bash
docker compose up --build -d
```

| Service | Port | Description |
|---------|------|-------------|
| `web` | 3000 | Next.js Landing + Dashboard |
| `api` | 8080 | Fastify API + Workers BullMQ |
| `cv-engine` | 8000 | Python FastAPI (YOLO, MediaPipe, GPU) |
| `redis` | 6379 | Queue BullMQ |

---

## 🔐 Configuration & Variables d'Environnement

| Variable | Description | Source |
|----------|-------------|--------|
| `SUPABASE_URL` | URL du projet Supabase | Project Settings > API |
| `SUPABASE_ANON_KEY` | Clé publique anonyme | Project Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé admin (API only) | Project Settings > API |
| `GROQ_API_KEY` | Clé LLM Llama 3 | console.groq.com |
| `STRIPE_SECRET_KEY` | Clé secrète Stripe | dashboard.stripe.com |
| `REDIS_URL` | URL Redis | Local ou Upstash |
| `CV_ENGINE_URL` | URL du moteur Python | `http://cv-engine:8000` |
| `SENTRY_DSN` | DSN Sentry (prod) | sentry.io |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL (web) | Idem SUPABASE_URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key (web) | Idem SUPABASE_ANON_KEY |

---

## 🔍 Troubleshooting

**1. Conflit de dépendances à l'install**
→ Utiliser `npm install --legacy-peer-deps` (conflit `@types/react@18` vs `@types/react@19` entre web et mobile).

**2. Le worker BullMQ ne traite pas les vidéos**
→ Vérifier Redis : `docker ps` → Vérifier `REDIS_URL` dans `.env`.

**3. Build web échoue**
→ Vérifier que `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` sont définis.

**4. Erreur d'auth Supabase**
→ Vérifier URL + Anon Key dans le `.env` → Confirmer l'email dans Supabase Auth.

**5. Lenteur du pipeline IA en local**
→ L'analyse de pose est CPU-intensive. Si pas de clé Groq, le fallback Ollama est plus lent.

---

## 🗺️ Roadmap v6.0 (Plan Complet)

### ✅ Base déjà livrée (v5.3.0)
- [x] Pipeline IA 20+ modules TypeScript
- [x] 30+ endpoints API avec validation Zod
- [x] Shot DNA™ + Advanced Analytics NBA-grade
- [x] Coach Chat IA conversationnel avec mémoire RAG
- [x] Smart Training Plans adaptatifs
- [x] Recovery Engine + Predictive Engine
- [x] Gamification complète (XP, Niveaux, Badges, Quêtes, Crews)
- [x] Shadow League (simulation multi-agents)
- [x] Realtime Pipeline (Pose + AR overlay 60fps)
- [x] Voice Coach WebSocket
- [x] TikTok Export viral
- [x] 311 tests (100% pass)
- [x] Dockerisation complète + Terraform infrastructure

### 🎯 Objectif produit v6.0
Passer de la plateforme d'analyse individuelle à une expérience compétitive, monétisable et partageable à l'échelle club/coach.

### 📦 Scope fonctionnel v6.0
| Epic | Livrables Front/Mobile | Livrables API/Data | Critères d'acceptation | Status |
|---|---|---|---|---|
| **Challenge Multi-joueurs** temps réel | Création de lobby, invitation, ready check, scoreboard live | Matchmaking, rooms WebSocket, anti-duplication events, persistance des matchs | Latence perçue < 200 ms, reconnexion automatique, aucun désync critique en test multi-clients | 🟡 En cours |
| **Mode Horse IA** | UI de duel H-O-R-S-E, feedback tir par tir, progression de difficulté | Moteur de règles Horse, sélection d'avatar IA, balancing par niveau | 100% des règles Horse validées en e2e, difficulté adaptative cohérente sur 10 matchs de test | 🟡 En cours |
| **Export PDF** (Scout Report) | Génération on-demand depuis dashboard session/profil | Endpoint export, template PDF versionné, stockage sécurisé | PDF complet en < 10 s, sections stats + Twin + mental + recommandations, rendu stable sur 20 cas | 🟡 En cours |
| **Marketplace de Drills** | Catalogue, recherche, filtres, achat/ajout, notation | CRUD drills, versioning contenu, permissions coach/joueur, suivi d'usage | Upload/édition robustes, contrôle d'accès validé, tracking adoption actif | 🟡 En cours |

### 🧱 Chantiers techniques obligatoires
- Stabilisation WebSocket (acknowledgements, retry idempotent, backoff exponentiel).
- Hardening auth (session refresh, expiration gérée sans perte de contexte match).
- Observabilité v6 (traces API, dashboards latence, alertes erreurs critiques).
- Migration DB minimale pour rooms, rounds Horse, exports PDF, catalogue drills.
- Sécurisation upload/asset pour Marketplace (validation MIME, quota, antivirus pipeline).

### 🧪 Qualité requise avant release
- Typecheck monorepo web/mobile/api/ai à 100% sans erreurs bloquantes.
- Suites API et AI vertes, sans régression sur routes existantes.
- E2E authentifié sur les 4 epics v6.0 (happy path + erreurs + reprise réseau).
- Tests charge WebSocket sur sessions multi-joueurs concurrentes.
- Vérification sécurité: RLS, tokens, permissions coach/joueur, exports sécurisés.

### 🗓️ Plan de livraison (8 semaines)
1. **S1-S2**: socle temps réel (rooms, events, scoreboard, monitoring basique).
2. **S3-S4**: Mode Horse IA complet + équilibrage difficulté.
3. **S5-S6**: Export PDF production-ready + versioning templates.
4. **S7**: Marketplace drills (catalogue, publication, permissions, analytics usage).
5. **S8**: hardening final, campagne e2e complète, release candidate et go-live.

### 🚦 Go / No-Go v6.0
- [ ] 0 bug critique ouvert sur les parcours principaux.
- [ ] Tous les endpoints v6 documentés dans docs API.
- [ ] Monitoring + alerting en place sur prod.
- [ ] Runbook incident et rollback validés.
- [ ] Validation finale multi-plateforme (web + mobile).

### 📈 KPI cibles (30 jours post-release)
- +25% de rétention hebdomadaire sur utilisateurs actifs.
- >40% d'utilisateurs actifs ayant lancé au moins 1 challenge multi-joueurs.
- >20% d'adoption du Mode Horse IA chez les utilisateurs actifs.
- >15% de sessions exportées en PDF côté coach.
- >10% d'utilisateurs ayant consommé un drill Marketplace.

### 🔮 Suite prévue (v6.1)
- Apple Watch (HRV + recovery en temps réel).
- Recommandations de drills générées dynamiquement par profil Twin.
- Ladders compétitives saisonnières avec reset et rewards.

---

## 🤝 Contribuer

Les contributions sont les bienvenues ! Voir [CONTRIBUTING.md](CONTRIBUTING.md) pour les guidelines.

---

## 📄 Licence

Ce projet est sous licence MIT. Voir [LICENSE](LICENSE) pour plus de détails.

<div align="center">
<br/>

**CourtVision AI v5.3.0 — Built for the NEXT generation of hoopers. 🏀**

</div>

