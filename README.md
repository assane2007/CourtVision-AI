# CourtVision AI

> Application PWA d'entraînement basketball avec IA de vision par ordinateur, notation en temps réel et système de progression XP.

## Fonctionnalités

- **Camera IA en temps réel** — MediaPipe Pose Landmarker pour détecter la posture et le mouvement
- **Notation automatique** — Score 0-100 basé sur posture, largeur de garde, position des bras et qualité de mouvement
- **9 catégories d'exercices** — dribble de poche, shifty, ball handling, changement de vitesse, défense, tir, footwork, finition, conditionnement
- **Vérification de forme IA** — Analyse par GPT-4o Vision avec feedback en français
- **Système XP & Niveaux** — 20 niveaux avec titres (Débutant → CourtVision Master), récompenses pour séries, succès, défis
- **Plans d'entraînement** — Créez des plans personnalisés avec exercices personnalisés
- **Calendrier de séries** — Suivi de la régularité d'entraînement
- **Défis hebdomadaires** — Objectifs renouvelés chaque semaine
- **Succès/Développements** — Badges pour les étapes clés
- **PWA installable** — Fonctionne hors ligne, installable sur mobile
- **Paramètres complets** — Objectifs hebdomadaires, préférences d'entraînement, notifications push
- **Mode sombre** — Thème clair/sombre automatique

## Tech Stack

| Technologie | Usage |
|---|---|
| Next.js 16 (App Router) | Framework React avec SSR/SSG |
| TypeScript 5 | Typage statique |
| Tailwind CSS 4 | Styling utilitaire |
| shadcn/ui | Composants UI |
| Framer Motion | Animations |
| TanStack Query | Gestion de données serveur |
| Zustand | État client |
| Prisma + SQLite | Base de données ORM |
| NextAuth.js v4 | Authentification JWT |
| MediaPipe | Vision par ordinateur |
| z-ai-web-dev-sdk | IA (Vision + LLM) |

## Démarrage rapide

```bash
# Installer les dépendances
bun install

# Configurer les variables d'environnement
cp .env.example .env
# Éditez .env avec vos valeurs

# Initialiser la base de données
bun run db:push

# Lancer le serveur de développement
bun run dev
```

L'application est accessible sur [http://localhost:3000](http://localhost:3000).

## Structure du projet

```
src/
├── app/                    # Routes API et pages Next.js
│   ├── api/                # Endpoints REST
│   │   ├── ai/             # Vérification de forme IA
│   │   ├── auth/           # Authentification
│   │   ├── drills/         # CRUD exercices
│   │   ├── notifications/  # Push subscriptions
│   │   ├── plans/          # Plans d'entraînement
│   │   ├── player/         # Profil joueur
│   │   ├── sessions/       # Sessions d'entraînement
│   │   ├── settings/       # Préférences
│   │   ├── stats/          # Statistiques
│   │   └── xp/             # Système d'expérience
│   └── page.tsx            # Point d'entrée SPA
├── components/
│   ├── screens/            # Écrans principaux
│   ├── shared/             # Composants réutilisables
│   ├── home/               # Widgets écran d'accueil
│   ├── workout/            # Modules camera/entraînement
│   └── ui/                 # Composants shadcn/ui
├── hooks/                  # Hooks React personnalisés
├── lib/                    # Utilitaires, XP, audio, validations
├── stores/                 # Store Zustand
└── types/                  # Déclarations TypeScript
```

## Tests

```bash
bun run test
```

111 tests couvrant :
- Algorithme de notation (scoring)
- Système XP et niveaux
- Fonctions utilitaires

## Licence

MIT