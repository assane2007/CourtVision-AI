# 🏀 CourtVision AI — Monorepo

Ce dossier contient le monorepo principal du projet CourtVision AI. C'est ici que se trouve tout le code source, organisé par applications et packages partagés utilisant les **npm workspaces**.

## 🏗️ Structure du Monorepo

Le projet est divisé en deux catégories principales : `apps/` (les points d'entrée utilisateur) et `packages/` (les modules de logique métier réutilisables).

### Applications (`apps/`)

- **[mobile](apps/mobile/) (@courtvision/mobile)** : Application React Native (Expo) v2.0. Gère l'onboarding, l'enregistrement live, l'upload de vidéos, l'affichage des rapports d'analyse et la gamification (XP, badges).
- **[web](apps/web/) (@courtvision/web)** : Landing page Next.js 14 optimisée SEO avec Framer Motion. Présente le produit et propose les liens de téléchargement.

### Packages (`packages/`)

- **[ai](packages/ai/) (@courtvision/ai)** : 100% TypeScript. Pipeline de vision par ordinateur en 7 étapes (tracking, analyse de tirs, score mental, reconstruction 3D, génération de rapports, montage highlights). **81 tests unitaires et d'intégration.**
- **[api](packages/api/) (@courtvision/api)** : Backend Fastify. Gère l'authentification (Supabase), les sessions, la queue de traitement (BullMQ), le billing (Stripe) et les notifications push.
- **[database](packages/database/)** : Schéma SQL PostgreSQL, politiques RLS Supabase et seeds de données (badges initiaux).
- **[shared](packages/shared/)** : Types TypeScript, constantes et utilitaires partagés entre le mobile, le web et l'API.

---

## 🚀 Quick Start (Développement Local)

### 1. Prérequis

- **Node.js** ≥ 20.0.0
- **npm** ≥ 10.x
- **Docker** (pour Redis)
- **FFmpeg** (nécessaire pour le package `@courtvision/ai`)

### 2. Installation

```bash
# Installer toutes les dépendances du monorepo
npm install

# Configurer l'environnement
cp .env.example .env
# Remplir les variables (Supabase, Stripe, Groq)
```

### 3. Services d'Infrastructure

Lancez Redis via Docker pour activer la queue de traitement BullMQ :

```bash
docker-compose up -d
```

### 4. Lancer les serveurs de dev

```bash
# Lancer l'API (Fastify) → http://localhost:3001
npm run dev:api

# Lancer la Landing Page (Next.js) → http://localhost:3000
npm run dev:web

# Lancer l'App Mobile (Expo)
cd apps/mobile && npx expo start
```

---

## 🧪 Tests & Qualité

Nous maintenons une suite de tests rigoureuse avec **Jest**. Actuellement, **81/81 tests passent** (35 pour l'IA et 46 pour l'API).

```bash
# Lancer tous les tests du monorepo
npm test

# Lancer les tests par package
npm run test:api
npm run test:ai

# Vérification des types TypeScript
npm run typecheck

# Linting
npm run lint
```

---

## 🔄 Request Lifecycle (Cycle de vie d'une analyse)

1.  **Mobile** : L'utilisateur filme ou uploade une vidéo vers **Supabase Storage**.
2.  **API** : L'app envoie une requête `POST /api/sessions/upload` avec l'URL.
3.  **Queue** : L'API ajoute un job à **BullMQ** (Redis).
4.  **Worker** : Le worker `videoProcessor.ts` récupère le job et appelle le package `@courtvision/ai`.
5.  **AI Pipeline** : Analyse frame par frame (tracking, tirs, mental, 3D).
6.  **Storage** : Le rapport final JSON et la vidéo highlight sont sauvegardés dans Supabase.
7.  **Notification** : L'API envoie une **notification push** (Expo Notifications) à l'utilisateur : *"Ton analyse est prête ! 🏀"*

---

## 🚢 Déploiement

- **API** : Déployée sur **Railway** via le [Dockerfile](Dockerfile) et [railway.toml](railway.toml).
- **Web** : Déployé sur **Vercel**.
- **Mobile** : Build via **EAS Build** (config dans `eas.json`).
- **Database** : Hébergée sur **Supabase**.

---

## 🛠️ Scripts Utiles

| Commande | Action |
| :--- | :--- |
| `npm run build` | Build complet de tous les packages et apps |
| `npm run clean` | Nettoyage profond (suppression des `node_modules`) |
| `npm run build:shared` | Build spécifique du package partagé |
| `npm run build:ai` | Build du pipeline IA |

---

Voir le [README complet](../README.md) à la racine du repo pour les détails sur les fonctionnalités et le concept du produit.
