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

## 🏗️ Architecture Technique

### Cycle de Vie d'une Analyse

Le traitement d'une vidéo suit un flux asynchrone robuste pour garantir une expérience utilisateur fluide :

1.  **Capture & Upload** : L'app mobile capture la vidéo et l'uploade directement sur **Supabase Storage**.
2.  **Ingestion** : L'API reçoit l'URL et crée un job dans la queue **BullMQ**.
3.  **Traitement IA** (Package `@courtvision/ai`) :
    *   *Preprocessing* : Extraction des frames via **FFmpeg**.
    *   *Inférence* : Tracking des joueurs et du ballon via **YOLOv8** et **MediaPipe**.
    *   *Analyse Géo-Spatiale* : Reconstruction 3D et heatmap des tirs.
    *   *Analyse Mentale* : Scoring du body language et de la fatigue.
4.  **Synthèse** : Génération d'un rapport complet par un **LLM (Groq/Llama 3)**.
5.  **Edition** : Création automatique d'un reel de highlights avec **FFmpeg**.
6.  **Notification** : Envoi d'une notification push via **Expo Notifications** dès que les résultats sont prêts.

### Flux de Données

```mermaid
graph TD
    A[Mobile App] -->|Upload Vidéo| B(Supabase Storage)
    A -->|POST /upload| C[Fastify API]
    C -->|Add Job| D[Redis/BullMQ]
    D -->|Process| E[AI Worker]
    E -->|Analyze| F[@courtvision/ai]
    F -->|Resultats JSON| G[(PostgreSQL)]
    F -->|Highlights| B
    E -->|Done| C
    C -->|Push| A
```

---

## 🛠️ Stack Technique & État du Projet

Le projet est passé en **Version 2.0.0** avec une refonte complète de la gamification et de la stabilité.

- **Frontend Mobile** : Expo Router, Zustand (persist), NativeWind.
- **Frontend Web** : Next.js 14, Tailwind, Framer Motion.
- **Backend** : Fastify 4.x, BullMQ, TypeScript.
- **Intelligence Artificielle** : **100% TypeScript** (plus de dépendance Python complexe), MediaPipe, YOLOv8.
- **Base de données** : Supabase (PostgreSQL, Auth, RLS).
- **Tests** : 81 tests unitaires et intégration (100% pass).

---

## 🔐 Configuration & Variables d'Environnement

Le projet utilise un fichier `.env` à la racine (voir `.env.example`).

### Variables Requises

| Variable | Description | Source |
| :--- | :--- | :--- |
| `SUPABASE_URL` | URL de votre projet Supabase | Project Settings > API |
| `SUPABASE_ANON_KEY` | Clé publique anonyme | Project Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé secrète admin (API uniquement) | Project Settings > API |
| `GROQ_API_KEY` | Clé pour le LLM Llama 3 | console.groq.com |
| `STRIPE_SECRET_KEY` | Clé secrète de test ou prod | dashboard.stripe.com |
| `REDIS_URL` | URL de connexion Redis | Local ou Cloud (Upstash) |

---

## 🔍 Troubleshooting (Résolution de problèmes)

**1. Le worker BullMQ ne traite pas les vidéos**
*   Vérifiez que Redis est lancé : `docker ps`.
*   Assurez-vous que `REDIS_URL` est correct dans votre `.env`.
*   Lancez le worker en mode debug : `DEBUG=bull* npm run dev:api`.

**2. Erreur d'authentification Supabase sur le mobile**
*   Vérifiez que l'URL et la clé Anon sont bien configurées dans `apps/mobile/lib/api.ts` (via les variables d'env).
*   Vérifiez que votre email est confirmé dans Supabase Auth.

**3. Lenteur du pipeline IA en local**
*   L'analyse de pose consomme du CPU. Fermez les applications gourmandes.
*   Si vous n'avez pas de clé Groq, le fallback Ollama peut être lent selon votre GPU.

---

## 🗺️ Roadmap v2.x

### ✅ Complété
- [x] Pipeline IA 7 étapes 100% TypeScript.
- [x] Gamification complète (XP, Niveaux, Badges).
- [x] Coach Live avec alertes vibrantes SSE.
- [x] Digital Twin avec radar de compétences.
- [x] Système de notification push (v2.1).

### 🔜 Prochainement
- [ ] **Challenge Multi-joueurs** : Défiez vos amis sur le même terrain.
- [ ] **Mode Horse IA** : Jouez contre un avatar IA en temps réel.
- [ ] **Export PDF** : Rapports de recrutement professionnels.

---

## 🤝 Contribuer

Les contributions sont les bienvenues ! Voir [CONTRIBUTING.md](CONTRIBUTING.md) pour les guidelines de style et de workflow.

---

## 📄 Licence

Ce projet est sous licence MIT. Voir [LICENSE](LICENSE) pour plus de détails.

<div align="center">
<br/>
**CourtVision AI — Built for the NEXT generation of hoopers. 🏀**
</div>

