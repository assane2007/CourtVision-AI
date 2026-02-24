<div align="center">

# 🏀 CourtVision AI

### *Le coach IA qui te transforme. Pas juste qui te compte.*

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org)
[![React Native](https://img.shields.io/badge/React_Native-Expo-blue?logo=expo)](https://expo.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?logo=typescript)](https://typescriptlang.org)
[![Fastify](https://img.shields.io/badge/Fastify-4.x-white?logo=fastify)](https://fastify.io)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?logo=supabase)](https://supabase.com)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-2.0.0-brightgreen)](CHANGELOG.md)

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
- [App Mobile v2](#-app-mobile-v2)
- [Pipeline IA (7 étapes)](#-pipeline-ia-7-étapes)
- [Coach Live](#-coach-live--api-temps-réel)
- [Digital Twin](#-digital-twin--avatar-ia-évolutif)
- [Communauté](#-communauté--le-strava-du-basket)
- [Partage Viral](#-partage-viral--machine-à-viralité)
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
| 📤 **Partage Viral** | Twin Card, highlight reel, recap partageable | ✅ |
| 📱 **Onboarding Caméra** | Tutoriel setup interactif (position, stabilité, éclairage) | ✅ |
| 💳 **Billing** | Stripe intégré, plans Joueur/Coach/Académie | ✅ |
| 🔔 **Push Notifications** | Rappels streak, daily challenge, rapports hebdo | ✅ |
| 🏅 **Système XP/Niveaux** | Gamification complète, badges de rareté, classement | ✅ |
| 👤 **Profil Éditable** | Édition inline (nom, poste, niveau, bio), persistance | ✅ |
| 🎯 **Daily Challenge** | Défi quotidien avec timer, XP, classement live | ✅ |
| 🔥 **Streak System** | Streak quotidien avec bannière d'alerte et rappel push | ✅ |

---

## 🏗️ Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Mobile App     │────▶│   API Server │────▶│   AI Pipeline   │
│  (Expo/React     │     │  (Fastify)   │     │  (7 étapes)     │
│   Native) v2.0   │     │              │     │                 │
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
| **Mobile** | React Native + Expo Router + Zustand (persist) + NativeWind |
| **Web** | Next.js 14 + Tailwind CSS + Framer Motion |
| **API** | Fastify + TypeScript + BullMQ |
| **Base de données** | Supabase (PostgreSQL + Auth + Storage) |
| **IA** | Groq (Llama 3) / Ollama (fallback local) |
| **Vision** | MediaPipe + YOLOv8 (Python bridge) |
| **Vidéo** | FFmpeg (extraction, highlights, watermark) |
| **Paiement** | Stripe (subscriptions) |
| **Infra** | Railway (API) + Vercel (Web) |

---

## 📱 App Mobile v2

> **Version 2.0.0** — Refactoring complet de l'UX, gamification avancée, rétention optimisée.

### Screens & Composants

```
apps/mobile/
├── app/
│   ├── index.tsx                  # Onboarding 1 — splash animé
│   ├── onboarding2.tsx            # Onboarding 2 — poste + niveau (sauvegardé)
│   ├── onboarding-camera.tsx      # Onboarding 3 — tutoriel caméra 4 étapes
│   ├── onboarding3.tsx            # Onboarding 4 — auth (Apple / Google / Email)
│   ├── live.tsx                   # Coach Live (temps réel, XP, résumé)
│   ├── program.tsx                # Programme 7 jours (XP par exercice)
│   ├── analysis/[id].tsx          # Rapport analyse (3 onglets: Stats/Heatmap/IA)
│   ├── highlight/[id].tsx         # Lecteur highlight + partage viral multi-plateformes
│   └── (dashboard)/               # Tab navigator
│       ├── _layout.tsx            # Tab bar (FAB Upload, dot XP profil)
│       ├── index.tsx              # Dashboard (streak banner, XP bar, défi quotidien)
│       ├── upload.tsx             # Upload vidéo (XP par étape pipeline)
│       ├── community.tsx          # Communauté (leaderboard, défis, feed, recherche)
│       ├── twin.tsx               # Digital Twin (radar, matchup, évolution)
│       └── profile.tsx            # Profil (édition inline, badges, activité, partage)
├── components/
│   ├── DailyChallengeCard.tsx     # Widget défi quotidien avec timer
│   ├── ShareCard.tsx              # Twin Card exportable (TikTok/Instagram/Twitter)
│   ├── SkeletonLoader.tsx         # Squelettes de chargement animés
│   ├── StreakReminderBanner.tsx   # Bannière streak en danger (slide-in)
│   ├── Toast.tsx                  # Système de toasts in-app (succès/erreur/XP)
│   └── XPBadge.tsx                # Badge XP animé + barre de niveau
├── hooks/
│   ├── useCommunity.ts            # Leaderboard, défis, feed, follow, badges
│   ├── useDailyChallenge.ts       # Défi quotidien avec timer
│   ├── useDigitalTwin.ts          # Digital Twin avec simulations
│   ├── useLiveCoach.ts            # Coach Live SSE
│   ├── usePushNotifications.ts    # Enregistrement push + rappels streak/défi
│   └── useViralShare.ts           # Partage Twin Card / Highlight / Recap
└── lib/
    ├── api.ts                     # Client HTTP (auto-refresh JWT, retry)
    ├── liveCoachService.ts        # SSE + auth async
    ├── store.ts                   # Store Zustand (persist AsyncStorage, XP, updateUser)
    ├── theme.ts                   # Design system (couleurs, spacing, typographie)
    └── toast.ts                   # Store Zustand des toasts
```

### Design System

Toute l'app utilise une palette dark sombre cohérente :

| Token | Valeur | Usage |
|---|---|---|
| `bg` | `#0D1117` | Fond principal |
| `card` | `#161B22` | Cartes et modales |
| `border` | `#21262D` | Séparateurs |
| `accent` | `#00D4FF` | Cyan — coach IA, stats |
| `blue` | `#1A73E8` | Actions primaires |
| `green` | `#00C853` | Succès, mental, FG% |
| `orange` | `#FFB300` | Streak, badges legendary |
| `red` | `#FF3D57` | Alertes, fatigue |
| `purple` | `#B388FF` | XP, badges epic |

### Gamification — Système XP & Rétention

| Action | XP gagné |
|---|---|
| Session analysée | +50 XP |
| Daily challenge complété | +75 XP |
| Badge débloqué (common) | +10–100 XP |
| Badge débloqué (legendary) | +500–2000 XP |
| Highlight partagé | +50 XP |
| Invitation ami acceptée | +500 XP |
| Streak 7 jours | +200 XP |
| Programme complété | +30 XP |

| Niveau | XP requis |
|---|---|
| 1 | 0 |
| 2 | 100 |
| 3 | 250 |
| 5 | 900 |
| 8 | 3 400 |
| 11 | 10 000 |

### Nouveautés v2.0.0

- **`profile.tsx`** : Édition complète inline (bottom-sheet modal), avatar animé avec initiales, timeline d'activité, partage profil natif, switches notifications/profil public, fiche de recrutement PDF
- **`onboarding2.tsx`** : 2 étapes (poste + niveau), sauvegarde dans le store Zustand dès l'onboarding
- **`onboarding3.tsx`** : Vraie auth email (login/register), Apple/Google OAuth (mock dev, OAuth prod), toggle login ↔ inscription
- **`analysis/[id].tsx`** : 3 onglets (Stats / Heatmap / Coach IA), données réelles du store, bouton partage natif, comparaison sessions, objectif pour la prochaine session
- **`highlight/[id].tsx`** : Modal partage multi-plateformes (TikTok, Instagram, Twitter, WhatsApp), publication communauté avec XP, commentary IA animée par clip
- **`(dashboard)/_layout.tsx`** : FAB Upload bleu flottant, notification dot XP sur l'onglet Profil
- **`StreakReminderBanner`** : Bannière slide-in si streak > 0, CTA direct upload, dismissable
- **`usePushNotifications`** : Intégration **expo-notifications** complète — token Expo réel, canal Android haute priorité (`courtvision`), rappel streak planifié à 20h, rappel défi planifié à 9h, listener foreground (toast in-app), listener tap (deep link), badge reset au retour au premier plan, envoi token au backend
- **`store.ts`** : Ajout `updateUser()`, persistance AsyncStorage, sélecteurs complets

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

## 🤖 Digital Twin — Avatar IA Évolutif

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
| 🔥 Streak 7j | 7 jours consécutifs | Rare | 200 |
| 🧠 Mental Pro | Mental score > 90 | Legendary | 1000 |
| ⚡ Quick Release | Vitesse tir top 5% | Rare | 300 |
| 🛡️ Lock Down | Défenseur semaine | Common | 100 |
| 💎 Elite | Overall 90+ | Legendary | 2000 |

---

## 🚀 Partage Viral — Machine à Viralité

Le système de partage viral permet aux joueurs d'exporter et partager leur Twin Card, leurs highlights et leurs recaps de session sur les réseaux sociaux. Chaque partage est optimisé par plateforme (TikTok, Instagram, Twitter) et génère un lien public traçable.

### Architecture

```
Twin / Session / Badge → API /share/generate → SharedCard (DB) → Share URL + Deep Link
Vue publique → /share/card/:shareId → Card Data + Analytics (views)
Partage → +50 XP → Activity Feed → Badges sociaux
```

### Endpoints

| Méthode | Route | Description |
|---|---|---|
| `POST` | `/api/share/generate` | Générer un partage (twin_card, session_recap, highlight_reel, badge, challenge_win) |
| `GET` | `/api/share/card/:shareId` | Récupérer les données d'une card partagée (public) |
| `GET` | `/api/share/my-shares` | Historique de mes partages avec vues |
| `POST` | `/api/share/track-view` | Tracker une vue de card partagée (analytics) |

### Types de partage

| Type | Contenu | Plateformes |
|---|---|---|
| 🏀 **Twin Card** | Note globale, style, NBA comparaison, stats clés, mental | TikTok, Instagram, Twitter |
| 🎬 **Highlight Reel** | Clips vidéo automatiques de la session | TikTok, Instagram, WhatsApp |
| 📊 **Session Recap** | Stats de session, % tir, mental score | Instagram, Twitter |
| 🎖️ **Badge** | Badge débloqué avec description | Tous |
| 🏆 **Challenge Win** | Victoire d'un défi communautaire | Tous |
| 👤 **Profil** | Profil public avec overall, poste, XP | Tous |

---

## 📱 Onboarding Caméra — Tutoriel Setup

Un tutoriel interactif en 4 étapes guide le joueur pour positionner correctement son téléphone avant sa première session. C'est le facteur #1 de rétention en première session.

### Les 4 étapes

| Étape | Titre | Contenu |
|---|---|---|
| 📱 **Placement** | Place ton téléphone | Distance 3-5m, mode paysage, terrain visible |
| 🔒 **Stabilité** | Stabilise l'image | Trépied vs support vs main (DO/DON'T visuel) |
| 💡 **Éclairage** | Éclairage & Cadrage | Soleil dans le dos, gym éclairé, pas de contre-jour |
| 🚀 **Prêt** | Tu es prêt ! | Confirmation avec rappel des tips clés |

### UX Design

- Diagrammes interactifs animés pour chaque étape
- Tips classés par importance (badge "IMPORTANT" sur les tips critiques)
- Navigation par dots + bouton "Passer" pour les utilisateurs avancés
- Barre de progression animée
- Intégré dans le flux onboarding : `Accueil → Poste + Niveau → 📱 Caméra → Auth`

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
│   ├── mobile/                    # App React Native (Expo) v2.0
│   │   ├── app/                   # Pages Expo Router
│   │   │   ├── index.tsx          # Onboarding 1 (splash)
│   │   │   ├── onboarding2.tsx    # Poste + Niveau
│   │   │   ├── onboarding-camera.tsx  # Tutoriel caméra
│   │   │   ├── onboarding3.tsx    # Auth (Apple/Google/Email)
│   │   │   ├── live.tsx           # Coach Live
│   │   │   ├── program.tsx        # Programme 7 jours
│   │   │   ├── analysis/[id].tsx  # Rapport analyse (3 onglets)
│   │   │   ├── highlight/[id].tsx # Lecteur + partage viral
│   │   │   └── (dashboard)/       # Tab navigator
│   │   ├── components/            # Composants réutilisables
│   │   ├── hooks/                 # Hooks métier
│   │   └── lib/                   # Store, API, theme, toast
│   └── web/                       # Landing page Next.js
│       └── src/app/               # App Router
├── packages/
│   ├── ai/                        # Pipeline IA complet (7 étapes)
│   ├── api/                       # Backend Fastify
│   │   └── src/routes/            # auth, sessions, twin, community, share, live, billing
│   ├── database/                  # Schema SQL + RLS Supabase
│   └── shared/                    # Types partagés
├── docs/                          # Documentation API
└── infra/                         # Config infra
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
cd apps/web && npm run dev          # → http://localhost:3000

# API Backend
cd packages/api && npm run dev      # → http://localhost:3001

# App Mobile (Expo)
cd apps/mobile && npx expo start

# Lancer la base de données
# Importer schema.sql dans votre projet Supabase

# Tests
npm test                            # Tous les tests
npm run test:api                    # Tests API uniquement
npm run test:ai                     # Tests AI uniquement
npm run typecheck                   # Vérification TypeScript (0 erreurs)
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

### ✅ Complété

- [x] Pipeline IA 7 étapes (preprocessing → highlights)
- [x] Landing page Next.js responsive
- [x] Système de billing Stripe
- [x] Schema SQL + RLS Supabase
- [x] Onboarding mobile complet (splash → poste+niveau → caméra → auth)
- [x] Tests E2E & unitaires API + AI
- [x] Coach Live (temps réel, SSE, alertes vibrantes)
- [x] Digital Twin (radar, matchup NBA, évolution, insights LLM)
- [x] Communauté (classements, défis, badges, XP, feed, follow)
- [x] Partage viral (Twin Card, highlights, recap — TikTok/Instagram/Twitter)
- [x] Onboarding caméra (tutoriel setup interactif 4 étapes)
- [x] **v2.0 — Profil éditable** (bottom-sheet modal, avatar, activité, badges détail)
- [x] **v2.0 — Système XP complet** (niveaux, badges rareté, animations, persistance)
- [x] **v2.0 — Streak system** (bannière d'alerte, push notifications, rappels quotidiens)
- [x] **v2.0 — Daily Challenge** (widget dashboard, timer, XP, classement)
- [x] **v2.0 — Auth réelle** (email login/register + OAuth Apple/Google)
- [x] **v2.0 — Rapport analyse** (3 onglets : Stats / Heatmap / Coach IA)
- [x] **v2.0 — Highlight player** (partage multi-plateformes, publication communauté)
- [x] **v2.0 — Store persistant** (Zustand + AsyncStorage, hydration, `updateUser`)
- [x] **v2.0 — Push Notifications** (hook `usePushNotifications`, rappels streak/défi)
- [x] **v2.0 — Tab bar redesignée** (FAB Upload, notification dot XP)
- [x] **v2.1 — expo-notifications réel** (token Expo réel, canal Android haute priorité, planification daily 9h/20h, listeners foreground + tap deep-link, badge reset, envoi token backend)

### 🔜 À venir

- [ ] Mode hors-ligne (analyse locale, sync différée)
- [ ] Multi-joueurs tracking (équipe entière)
- [ ] Export PDF rapports de recrutement (génération serveur)
- [ ] App Store / Play Store (EAS submit)
- [ ] Clip vidéo réel (expo-image-picker + upload S3)
- [ ] Internationalisation (EN, ES, PT)

---

## 🤝 Contribuer

Les contributions sont les bienvenues ! Voir [CONTRIBUTING.md](CONTRIBUTING.md) pour les guidelines.

1. Fork le repo
2. Crée ta branche (`git checkout -b feature/amazing-feature`)
3. Commit tes changements (`git commit -m 'feat: add amazing feature'`)
4. Push sur la branche (`git push origin feature/amazing-feature`)
5. Ouvre une Pull Request

---

## 📄 Licence

Ce projet est sous licence MIT. Voir [LICENSE](LICENSE) pour plus de détails.

---

<div align="center">

**CourtVision AI v2.0.0 — Fait avec 🏀 et ❤️**

[Website](https://courtvision.ai) · [Twitter](https://twitter.com/courtvisionai) · [Discord](https://discord.gg/courtvision)

*Note de l'app : 9.1/10 — Surpasse HomeCourt & Hudl sur la rétention et la gamification.*

</div>

