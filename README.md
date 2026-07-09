<p align="center">
  <img src="public/logo.svg" alt="CourtVision AI Logo" width="120" height="120" />
</p>

<h1 align="center">CourtVision AI</h1>

<p align="center">
  <strong>Plateforme d'entraînement basketball propulsée par l'IA</strong><br/>
  PWA · Vision par ordinateur · Coaching intelligent · Gamification
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?logo=tailwindcss" alt="Tailwind CSS 4" />
  <img src="https://img.shields.io/badge/Prisma-6-2d3748?logo=prisma" alt="Prisma 6" />
  <img src="https://img.shields.io/badge/Lines-60k%2B-orange" alt="60k+ LOC" />
  <img src="https://img.shields.io/badge/API_Routes-114-green" alt="114 API Routes" />
  <img src="https://img.shields.io/badge/Screens-40-purple" alt="40 Screens" />
</p>

---

## Table des matières

- [Aperçu](#aperçu)
- [Fonctionnalités](#fonctionnalités)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Démarrage rapide](#démarrage-rapide)
- [Configuration](#configuration)
- [Structure du projet](#structure-du-projet)
- [Déploiement](#déploiement)
- [CI/CD](#cicd)
- [Tests](#tests)
- [Scripts disponibles](#scripts-disponibles)
- [Licence](#licence)

---

## Aperçu

CourtVision AI est une application mobile-first de coaching basketball qui combine :

- **Vision par ordinateur en temps réel** (MediaPipe Pose Landmarker) pour analyser la posture et le mouvement du joueur
- **IA multimodale** (GPT-4o Vision, LLM coaching, génération d'exercices) pour un feedback personnalisé
- **Gamification avancée** (XP, niveaux, succès, défis, séries, classements) pour maintenir la motivation
- **Architecture production-ready** (config centralisée, CI/CD, Docker, monitoring Sentry, rate limiting, sécurité)

## Fonctionnalités

### Entraînement IA
| Fonctionnalité | Description |
|---|---|
| **Camera temps réel** | MediaPipe Pose Landmarker détecte 33 points du corps à 30fps |
| **Notation automatique** | Score 0-100 basé sur posture, garde, position des bras, qualité du mouvement |
| **Vérification de forme IA** | Capture vidéo → GPT-4o Vision → feedback détaillé en français |
| **Coaching vocal IA** | Synthèse vocale (TTS) pour coaching audio en temps réel |
| **Génération d'entraînement IA** | Plans personnalisés générés selon le profil et les objectifs du joueur |
| **Analyse de vidéo** | Upload de vidéos → annotations, highlights, comparaisons |
| **Prédictions IA** | Modèles de prédiction de progression et de performance |

### 9 Catégories d'exercices
Pocket ball handling · Shifty · Ball handling · Changement de vitesse · Défense · Tir · Footwork · Finition · Conditionnement

### Gamification
- **20 niveaux XP** avec titres (Débutant → CourtVision Master)
- **Système de séries** (streak) avec calendrier visuel et gels de protection
- **40+ succès/développements** débloquables
- **Défis hebdomadaires** renouvelés automatiquement
- **Quêtes journalières** avec récompenses XP
- **Classements** (leaderboard) global et entre amis
- **Récompenses journalières** (daily login rewards)

### Social
- **Système d'amis** (demande, acceptation, liste)
- **Feed social** avec posts, likes, commentaires
- **Équipes** avec gestion de membres
- **Messagerie** temps réel (Socket.io)
- **Partage de vidéos** et de statistiques
- **Scouting** de joueurs

### Monétisation (Stripe)
- **Plans d'abonnement** (Free, Pro, Elite)
- **Checkout sécurisé** Stripe
- **Portail de gestion** d'abonnement
- **Webhooks** pour la gestion des événements de paiement

### PWA & UX
- **Application installable** sur mobile et desktop
- **Mode hors-ligne** avec cache des données
- **Thème clair/sombre** automatique
- **Animations fluides** (Framer Motion)
- **Notifications push** (Web Push API)
- **Accessibilité** (ARIA, navigation clavier, sémantique HTML)

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Client (PWA)                               │
│  React 19 · TypeScript · Tailwind 4 · shadcn/ui · Zustand      │
│  Framer Motion · TanStack Query · MediaPipe (WebAssembly)       │
└──────────────────────────┬──────────────────────────────────────┘
                           │ REST API + WebSocket
┌──────────────────────────▼──────────────────────────────────────┐
│                    Next.js 16 (App Router)                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │  Guards   │ │Middleware│ │ Services │ │ AI Pipe  │           │
│  │ auth     │ │ rate-    │ │ player   │ │ vision   │           │
│  │ admin    │ │ limit    │ │ training │ │ coaching │           │
│  │ subscr.  │ │ security │ │ video    │ │ workout  │           │
│  │ owner.   │ │ headers  │ │ social   │ │ predict. │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │  Repos   │ │  Cache   │ │  Queue   │ │  Monitor │           │
│  │ base     │ │ memory/  │ │ in-proc  │ │ logger   │           │
│  │ player   │ │ redis    │ │          │ │ health   │           │
│  │ training │ │          │ │          │ │ perf     │           │
│  │ social   │ │          │ │          │ │ alerts   │           │
│  │ video    │ │          │ │          │ │ Sentry   │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
└──────────────────────────┬──────────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
   ┌─────────────┐  ┌───────────┐  ┌──────────────┐
   │  Database   │  │   Redis   │  │ S3 / Local   │
   │ SQLite/PG   │  │  (cache)  │  │  (storage)   │
   └─────────────┘  └───────────┘  └──────────────┘
```

### Modules clés

| Module | Chemin | Rôle |
|---|---|---|
| **Config** | `src/lib/config.ts` | Configuration centralisée, validation, typée et immutable |
| **Database** | `src/lib/database/` | Prisma client singleton, pooling PostgreSQL, health check |
| **Cache** | `src/lib/cache/` | Abstraction memory/Redis avec TTL et invalidation par tags |
| **Security** | `src/lib/security/` | Rate limiting (sliding window), encryption, headers, CORS, sanitization |
| **Guards** | `src/lib/guards/` | Auth, admin, subscription, ownership guards |
| **AI Pipeline** | `src/lib/ai/` | Providers (LLM, Vision, Speech), services, prompts, rate limiting |
| **Services** | `src/lib/services/` | Business logic (player, training, video, social, billing, notification) |
| **Repositories** | `src/lib/repositories/` | Data access layer (base, player, training, social, video, AI) |
| **Monitoring** | `src/lib/monitoring/` | Structured logger, performance tracking, health checks, alerts |
| **Queue** | `src/lib/queue/` | Job queue pour tâches asynchrones |

## Tech Stack

| Catégorie | Technologie | Version |
|---|---|---|
| **Framework** | Next.js (App Router, Turbopack) | 16.1 |
| **Langage** | TypeScript | 5 |
| **Runtime** | Bun | latest |
| **Styling** | Tailwind CSS | 4 |
| **UI** | shadcn/ui (New York) | latest |
| **Animations** | Framer Motion | 12 |
| **State client** | Zustand | 5 |
| **State serveur** | TanStack Query | 5 |
| **ORM** | Prisma | 6.11 |
| **Database** | SQLite (dev) / PostgreSQL (prod) | — |
| **Auth** | NextAuth.js v4 (JWT) | 4.24 |
| **Vision** | MediaPipe Pose Landmarker | latest |
| **IA** | z-ai-web-dev-sdk (GPT-4o Vision, LLM, TTS) | 0.0.18 |
| **Monitoring** | Sentry | 10.64 |
| **Paiements** | Stripe | latest |
| **Validation** | Zod | 4 |
| **Tests unitaires** | Vitest | 4 |
| **Tests E2E** | Playwright | 1.61 |
| **CI/CD** | GitHub Actions | — |
| **Containerisation** | Docker + Docker Compose | — |

## Démarrage rapide

### Prérequis

- [Bun](https://bun.sh/) (v1.0+)
- [Node.js](https://nodejs.org/) 20+ (pour les scripts Docker/CI)

### Installation

```bash
# Cloner le dépôt
git clone https://github.com/assane2007/CourtVision-AI.git
cd CourtVision-AI

# Installer les dépendances
bun install

# Configurer les variables d'environnement
cp .env.example .env
# Éditez .env — voir la section Configuration ci-dessous

# Initialiser la base de données SQLite
bun run db:push

# Lancer le serveur de développement
bun run dev
```

L'application est accessible sur [http://localhost:3000](http://localhost:3000).

### Avec Docker (PostgreSQL + Redis)

```bash
# Développement local avec PostgreSQL et Redis
docker compose up -d

# Avec pgAdmin (outil de gestion BDD)
docker compose --profile tools up -d
```

## Configuration

Toute la configuration passe par le fichier `.env` (voir `.env.example` pour la référence complète).

### Variables requises en production

```bash
# Base de données PostgreSQL
DATABASE_URL="postgresql://user:password@host:5432/courtvision"

# Authentification (générer avec: openssl rand -base64 48)
NEXTAUTH_SECRET="votre-secret-32-caracteres-minimum!!"
NEXTAUTH_URL="https://votre-domaine.com"

# Chiffrement des données sensibles
# Générer avec: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY="64-caracteres-hex-ici..."
```

### Variables optionnelles

| Variable | Défaut | Description |
|---|---|---|
| `REDIS_URL` | Memory cache | URL Redis (ex: `redis://localhost:6379`) |
| `SENTRY_DSN` | Désactivé | DSN Sentry côté serveur |
| `NEXT_PUBLIC_SENTRY_DSN` | Désactivé | DSN Sentry côté client |
| `STRIPE_SECRET_KEY` | Désactivé | Clé secrète Stripe |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Désactivé | Clé publique Stripe |
| `STRIPE_WEBHOOK_SECRET` | Désactivé | Secret webhook Stripe |
| `S3_BUCKET` | Stockage local | Bucket S3 pour vidéos/fichiers |
| `S3_REGION` | `auto` | Région S3 |
| `S3_ACCESS_KEY` | — | Clé d'accès S3 |
| `S3_SECRET_KEY` | — | Clé secrète S3 |
| `S3_ENDPOINT` | — | Endpoint S3 personnalisé (R2, Wasabi, MinIO) |
| `VAPID_PRIVATE_KEY` | Désactivé | Clé privée notifications push |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Désactivé | Clé publique notifications push |
| `RESEND_API_KEY` | Mock console | Clé API Resend pour emails |
| `LOG_LEVEL` | `debug`/`info` | Niveau de log (`debug`, `info`, `warn`, `error`, `fatal`) |
| `LOG_QUERIES` | `false` | Logger toutes les requêtes SQL |
| `ALLOWED_ORIGINS` | Dév: tout | Origines CORS autorisées (séparées par virgules) |
| `JWT_SECRET` | = NEXTAUTH_SECRET | Clé JWT séparée (recommandé en prod) |
| `NEXT_PUBLIC_SENTRY_RELEASE` | — | Tag de release Sentry (ex: `courtvision-ai@1.0.0`) |
| `SENTRY_AUTH_TOKEN` | — | Token pour upload des source maps |
| `ENCRYPTION_KEY` | Auto (dev) | Clé de chiffrement 32 octets (64 hex chars) |

### Module de configuration centralisée

Le module `src/lib/config.ts` expose un objet typé et immutable :

```typescript
import { config } from '@/lib/config'

config.database.provider  // 'sqlite' | 'postgresql' (auto-détecté)
config.redis.isEnabled    // true si REDIS_URL est défini
config.stripe.isEnabled   // true si les 2 clés Stripe sont présentes
config.storage.provider   // 'local' | 's3' (auto-détecté)
config.security.encryptionKey  // Clé de chiffrement
config.logging.level      // 'debug' | 'info' | 'warn' | 'error' | 'fatal'
```

En production, le serveur **refuse de démarrer** si les variables requises manquent, avec un message clair indiquant quoi configurer.

## Structure du projet

```
courtvision-ai/
├── .github/workflows/
│   └── ci-cd.yml              # Pipeline CI/CD GitHub Actions
├── docker-compose.yml          # Docker Compose (dev: PostgreSQL + Redis + pgAdmin)
├── docker-compose.prod.yml     # Docker Compose (prod: réseau interne, limits)
├── Dockerfile                  # Build multi-stage (deps → builder → runner)
├── prisma/
│   ├── schema.prisma           # Schema SQLite (développement)
│   ├── schema.postgres.prisma  # Schema PostgreSQL (production, UUIDs, indexes)
│   ├── seed.ts                 # Données initiales
│   └── migrations/
├── scripts/
│   ├── start-production.sh     # Script de démarrage production (validation + migration)
│   ├── docker-build.sh
│   └── docker-deploy.sh
├── sentry.server.config.ts     # Config Sentry serveur
├── sentry.edge.config.ts       # Config Sentry Edge
├── src/
│   ├── app/
│   │   ├── page.tsx            # Point d'entrée SPA
│   │   ├── layout.tsx          # Layout racine avec providers
│   │   ├── globals.css         # Styles globaux
│   │   └── api/                # 114 endpoints REST
│   │       ├── ai/             # Form check, pose, voice, insights, predictions, RAG
│   │       ├── auth/           # Signup, login, 2FA, reset password, refresh
│   │       ├── drills/         # CRUD exercices, favoris
│   │       ├── player/         # Profil, stats, onboard, chat, vidéo
│   │       ├── sessions/       # Sessions d'entraînement
│   │       ├── videos/         # Upload, annotations, highlights, export, share
│   │       ├── challenges/     # Défis, progression, join
│   │       ├── teams/          # Équipes, membres
│   │       ├── friends/        # Gestion d'amis
│   │       ├── feed/           # Posts, likes, commentaires
│   │       ├── messages/       # Messagerie temps réel
│   │       ├── live/           # Sessions live, scoring
│   │       ├── stripe/         # Checkout, webhook, portal
│   │       ├── notifications/  # Push, subscribe
│   │       └── ...
│   ├── components/
│   │   ├── screens/            # 40 écrans de l'application
│   │   ├── ui/                 # 50+ composants shadcn/ui
│   │   ├── home/               # Widgets dashboard (streak, XP, challenges)
│   │   ├── workout/            # Camera, pose canvas, scoring, timer
│   │   ├── video/              # Lecteur vidéo, annotations, export
│   │   ├── auth/               # Formulaires login/signup/reset
│   │   ├── landing/            # Page d'atterrissage
│   │   ├── settings/           # Sections de paramètres
│   │   └── shared/             # Bottom nav, animations, widgets
│   ├── hooks/                  # 11 hooks React (camera, mediapipe, workout, etc.)
│   ├── lib/
│   │   ├── config.ts           # Configuration centralisée (this file)
│   │   ├── auth.ts             # NextAuth options
│   │   ├── db.ts               # Re-export database module
│   │   ├── database/           # Prisma client, health check, pooling
│   │   ├── cache/              # Memory + Redis cache (TTL, tags)
│   │   ├── security/           # Rate limiter, encryption, headers, CORS, sanitization
│   │   ├── guards/             # Auth, admin, subscription, ownership
│   │   ├── ai/                 # Pipeline IA (providers, services, prompts)
│   │   ├── services/           # Business logic (player, training, video, social, billing)
│   │   ├── repositories/       # Data access layer
│   │   ├── monitoring/         # Logger, health, performance, alerts
│   │   ├── queue/              # Job queue
│   │   ├── storage/            # Local + S3 storage
│   │   ├── middleware/          # Error handler, request validator, pagination
│   │   ├── pose/               # MediaPipe landmarks, exercises
│   │   └── player/             # XP engine, plan generator, form analyzer, IQ engine
│   ├── stores/                 # Zustand stores (app, navigation)
│   └── types/                  # Déclarations TypeScript
├── e2e/                        # Tests Playwright
├── public/                     # Assets statiques, PWA manifest, SW
└── tests/                      # Tests unitaires (index)
```

## Déploiement

### Docker (recommandé)

```bash
# Production
docker compose -f docker-compose.prod.yml up -d

# Avec variables d'env depuis un fichier
POSTGRES_PASSWORD=secure_password docker compose -f docker-compose.prod.yml up -d
```

### Variables d'environnement pour le déploiement

Les secrets sont passés via les variables d'environnement du système ou un fichier `.env` :

```bash
# docker-compose.prod.yml lit ces variables :
DATABASE_URL=postgresql://courtvision:YOUR_PASSWORD@postgres:5432/courtvision
NEXTAUTH_SECRET=votre-secret-32-caracteres-minimum
NEXTAUTH_URL=https://courtvision.app
POSTGRES_PASSWORD=YOUR_PASSWORD
REDIS_URL=redis://redis:6379
```

### Script de production

Le script `scripts/start-production.sh` s'exécute automatiquement au démarrage du container :

1. **Validation** des variables d'environnement requises
2. **Détection** automatique SQLite vs PostgreSQL
3. **Migration** de la base de données (`prisma migrate deploy` ou `db push`)
4. **Génération** du client Prisma
5. **Health check** de la connexion BDD
6. **Démarrage** du serveur Next.js

### Déploiement manuel

```bash
# Installer les dépendances
bun install --production

# Générer le client Prisma
bun run db:generate

# Pousser le schema (SQLite) ou migrer (PostgreSQL)
bun run db:push   # SQLite
# bun run db:migrate  # PostgreSQL

# Builder
bun run build

# Lancer en production
bun run start
```

## CI/CD

Le pipeline GitHub Actions (`.github/workflows/ci-cd.yml) s'exécute automatiquement :

### CI (Push & Pull Request sur `main`)

| Job | Commande | Détails |
|---|---|---|
| Lint | `bun run lint` | ESLint |
| Type Check | `bunx tsc --noEmit` | Vérification TypeScript |
| Unit Tests | `bun run test` | Vitest (jsdom) |
| Build | `bun run build` | Next.js standalone |
| Security Audit | `npm audit --production` | Vulnerabilités |

### Deploy (Push sur `main` seulement)

| Job | Détails |
|---|---|
| Build Docker | Image multi-stage, tags SHA + latest |
| Deploy | Migration BDD → rolling update → health check → rollback automatique |
| Notify | Slack/Discord (commenté, prêt à activer) |

### Secrets GitHub à configurer

```
DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL, POSTGRES_PASSWORD,
SENTRY_AUTH_TOKEN, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
DOCKER_REGISTRY_USER, DOCKER_REGISTRY_PASS, SLACK_WEBHOOK_URL
```

## Tests

```bash
# Tests unitaires (Vitest)
bun run test

# Tests E2E (Playwright)
bun run e2e

# Linting
bun run lint
```

**Coverage** : 111+ tests couvrant l'algorithme de notation, le système XP, les validations, le cache, le rate limiting, l'i18n, le scoring, les séries, les utilitaires.

## Scripts disponibles

| Script | Commande | Description |
|---|---|---|
| `dev` | `next dev -p 3000` | Serveur de développement |
| `build` | `next build` | Build production (standalone) |
| `start` | `node .next/standalone/server.js` | Serveur production |
| `lint` | `eslint .` | Vérification lint |
| `test` | `vitest run` | Tests unitaires |
| `e2e` | `playwright test` | Tests end-to-end |
| `db:push` | `prisma db push` | Synchroniser le schema (SQLite) |
| `db:generate` | `prisma generate` | Générer le client Prisma |
| `db:migrate` | `prisma migrate dev` | Créer une migration (PostgreSQL) |

## Licence

MIT