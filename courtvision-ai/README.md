# 🏀 CourtVision AI — The Ultimate Elite Basketball AI Ecosystem

> **Version 5.3.0** · Codename: **Skill-Hardened** · Mise à jour : Mars 2026

CourtVision AI est un écosystème complet d'intelligence artificielle pour le basketball.
Analyse vidéo, reconstruction 3D, coach IA conversationnel, Digital Twin, Shot DNA™, et bien plus.

---

## 🏗️ Architecture Monorepo

```
courtvision-ai/
├── apps/
│   ├── mobile/         → React Native (Expo 54) — App iOS/Android
│   ├── web/            → Next.js 14 — Landing + Dashboard
│   └── cv-engine/      → Python FastAPI — Moteur Computer Vision (YOLO, MediaPipe)
├── packages/
│   ├── ai/             → Pipeline IA TypeScript (Shot DNA, Coach Chat, Predictive, etc.)
│   ├── api/            → Fastify 4.x Backend (30+ routes, BullMQ, WebSocket)
│   ├── shared/         → Types, constantes, erreurs partagés
│   ├── database/       → Schémas SQL, migrations, fonctions PostgreSQL
│   └── python/         → Scripts ML complémentaires (tracker.py)
├── docs/               → Documentation API, Architecture, Skills Explorer
├── infra/              → Terraform (Cloudflare, Railway, Supabase, Sentry)
└── scripts/            → Scripts utilitaires (validate_skills, build_index)
```

---

## ✨ Features Principales

| Module | Description | Package |
|--------|-------------|---------|
| 🎯 Analyse de Tirs | Détection auto, zone, posture, stats avancées | `@courtvision/ai` |
| 🧬 Shot DNA™ | Empreinte biomécanique unique, comparaison NBA | `@courtvision/ai` |
| 🧠 Mental Score | Score de fragilité mentale, langage corporel | `@courtvision/ai` |
| 🔮 Predictive Engine | Prédictions de performance, momentum | `@courtvision/ai` |
| 👁️ Reconstruction 3D | Vue aérienne, heatmap, court zones | `@courtvision/ai` |
| 🎬 Highlights auto | Montage cinématique avec musique | `@courtvision/ai` |
| ⚡ Coach Live | Analyse temps réel via SSE, alertes vibrantes | `@courtvision/ai` |
| 🤖 Coach Chat IA | Chat conversationnel avec mémoire RAG | `@courtvision/ai` |
| 🏋️ Smart Training | Plans d'entraînement adaptatifs IA | `@courtvision/ai` |
| 💊 Recovery Engine | Score récupération, corrélation performance | `@courtvision/ai` |
| 🤖 Digital Twin | Avatar IA évolutif, simulation de matchups | `@courtvision/ai` |
| 📊 Advanced Analytics | Shot Quality Score, Clutch Rating, xShots | `@courtvision/ai` |
| 📱 Realtime Pipeline | Pose estimation + AR overlay natif (60fps) | `@courtvision/ai` |
| 🎮 Gamification | XP, Niveaux, Badges, Quêtes, Crews | `@courtvision/api` |
| 💳 Billing Stripe | Plans Joueur/Coach/Académie | `@courtvision/api` |
| 🏆 Communauté | Leaderboard, défis, profils publics | `@courtvision/api` |
| 📤 Partage Viral | TikTok export, Twin Cards, highlights | `@courtvision/api` |
| 🎙️ Voice Coach | Coaching vocal temps réel via WebSocket | `@courtvision/api` |
| 🔭 Precog | Prédiction pre-game avancée | `@courtvision/api` |
| 👥 Shadow League | Simulation multi-agents nocturne | `@courtvision/api` |

---

## 🚀 Quick Start

### Prérequis
- **Node.js** ≥ 20.0.0
- **Docker** (pour Redis et les services)
- **Python** 3.11+ (pour cv-engine)

### Installation

```bash
# Clone et install
cd courtvision-ai
npm install --legacy-peer-deps

# Variables d'environnement
cp .env.example .env
# Remplir SUPABASE_URL, SUPABASE_ANON_KEY, GEMINI_API_KEY, REDIS_URL, etc.

# Lancer l'infra
docker compose up -d

# Build
npm run build

# Dev
npm run dev:api    # API Fastify → http://localhost:8080
npm run dev:web    # Next.js     → http://localhost:3000
```

---

## 🧪 Tests

```bash
# Tous les tests
npm test

# Tests API uniquement (126 tests)
npm run test:api

# Tests AI uniquement (185 tests)
npm run test:ai
```

> **311 tests**, 23 suites, **100% pass** ✅

---

## 📡 API Endpoints (30+ routes)

| Prefix | Module | Routes |
|--------|--------|--------|
| `/api/auth` | Authentification | signup, login, logout, refresh, me |
| `/api/sessions` | Sessions vidéo | upload, list, detail, delete, status SSE |
| `/api/analyses` | Analyses IA | rapport, heatmap, highlights, programme |
| `/api/twin` | Digital Twin | profil, simulation, comparaison, drills dynamiques |
| `/api/shot-dna` | Shot DNA™ | empreinte, évolution, comparaison NBA |
| `/api/predict` | Prédictions | performance, zones, momentum |
| `/api/training` | Plans entraînement | génération, progression, adaptation |
| `/api/coach` | Coach Chat IA | conversation, contexte, suggestions |
| `/api/recovery` | Récupération | score, recommandations, corrélation |
| `/api/quests` | Quêtes/Gamification | quotidiennes, hebdomadaires, saisonnières |
| `/api/crews` | Équipes | création, classement, défis d'équipe |
| `/api/analytics` | Analytics avancées | SQS, clutch rating, xShots |
| `/api/community` | Communauté | leaderboard, défis, amis |
| `/api/billing` | Billing Stripe | plans, checkout, portail, webhook |
| `/api/sessions` | Coach Live | activation live, envoi de frames |
| `/api/share` | Partage | Twin Cards, highlights partageables |
| `/api/tiktok` | TikTok Export | génération clips viraux |
| `/api/highlights` | Highlights | édition, rendu, musique |
| `/api/shadow` | Shadow League | simulations nocturnes |
| `/api/spatial` | Spatial Analysis | reconstruction 3D |
| `/api/precog` | Precog | prédictions pre-game |
| `/api/players` | Joueurs | profils publics, recherche |
| `/api/investor` | Investisseurs | métriques, KPI |
| `/api/reports` | Rapports | PDF, exports |
| `/api/dashboard` | Dashboard | métriques consolidées |
| `/api/shooting-sessions` | Sessions tir | stats détaillées |
| `/ws` | WebSocket | voice coach, live updates |
| `/health` | Health Check | status API + DB + CV Engine |

---

## 🐳 Docker

```bash
docker compose up --build -d
```

| Service | Port | Description |
|---------|------|-------------|
| `web` | 3000 | Next.js Dashboard |
| `api` | 8080 | Fastify API |
| `cv-engine` | 8000 | Python ML (YOLO, MediaPipe) |
| `redis` | 6379 | Queue BullMQ |

---

## 📄 Documentation

- [API Reference](docs/API.md)
- [Architecture V5](docs/ARCHITECTURE_V5.md)
- [Skills Explorer](docs/index.html)
- [Privacy Policy](PRIVACY_POLICY.md)
- [Terms of Service](TERMS_OF_SERVICE.md)

---

## 📄 Licence

MIT — Voir [LICENSE](../LICENSE)

