<div align="center">

# 🏀 CourtVision AI

### *Le coach IA qui te transforme. Pas juste qui te compte.*

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org)
[![React Native](https://img.shields.io/badge/React_Native-Expo-blue?logo=expo)](https://expo.dev)
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
| ⚡ **Coach Live** | Analyse temps réel, alertes vibrantes | 🚧 |
| 🤖 **Digital Twin** | Avatar IA évolutif, comparaison pros | 🚧 |
| 🏆 **Communauté** | Classements, défis, profils publics | 🚧 |
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

## 🧠 Pipeline IA (7 étapes)

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
- [ ] Coach Live (temps réel)
- [ ] Digital Twin complet
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

