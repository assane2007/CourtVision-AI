# 🤝 Contribuer à CourtVision AI

Merci de ton intérêt pour CourtVision AI ! Voici comment contribuer.

## 🚀 Quick Start

```bash
# Fork et clone
git clone https://github.com/ton-user/CourtVision-AI.git
cd CourtVision-AI/courtvision-ai

# Install (--legacy-peer-deps requis pour compatibilité React 18/19)
npm install --legacy-peer-deps

# Setup env
cp .env.example .env
# Remplis les variables (SUPABASE_URL, SUPABASE_ANON_KEY, etc.)

# Lance l'infra
docker compose up -d

# Build complet
npm run build

# Dev
npm run dev:api    # API    → http://localhost:8080
npm run dev:web    # Web    → http://localhost:3000
```

## 📋 Conventions

### Branches
- `main` — Production
- `develop` — Intégration
- `feature/xxx` — Nouvelles fonctionnalités
- `fix/xxx` — Corrections de bugs
- `docs/xxx` — Documentation

### Commits
On suit [Conventional Commits](https://www.conventionalcommits.org/) :

```
feat: ajout de l'analyse 3x3
fix: correction du score mental négatif
docs: mise à jour du README
style: reformatage du code
refactor: simplification du pipeline tracking
test: ajout tests unitaires shotAnalysis
chore: mise à jour dépendances
```

### Code Style
- **TypeScript** strict partout
- **ESLint** + **Prettier** (config dans le repo)
- Nommer les variables/fonctions en **camelCase**
- Nommer les types/interfaces en **PascalCase**
- Commentaires en **français** pour le code métier
- Commentaires en **anglais** pour le code technique générique

## 🏗️ Structure du Projet

```
courtvision-ai/
├── apps/
│   ├── mobile/         # React Native (Expo 54) — App iOS/Android
│   ├── web/            # Next.js 14 — Landing + Dashboard
│   └── cv-engine/      # Python FastAPI — YOLO, MediaPipe
├── packages/
│   ├── ai/             # Pipeline IA (20+ modules TS)
│   ├── api/            # Fastify Backend (30+ routes)
│   ├── shared/         # Types, erreurs, logger partagés
│   ├── database/       # Schémas SQL, migrations, pgvector
│   └── python/         # Scripts ML (tracker)
├── docs/               # Documentation API, Architecture
├── infra/              # Terraform (staging + production)
└── scripts/            # Scripts utilitaires
```

## 🧪 Tests

```bash
# Tous les tests (311 tests, 23 suites)
npm test

# Tests API uniquement (126 tests)
npm run test:api

# Tests AI uniquement (185 tests)
npm run test:ai

# Build complet (shared → ai → api → web)
npm run build

# Lint
npm run lint
```

> ⚠️ **Assurez-vous que tous les tests passent avant de soumettre une PR.**

## 🔧 Ajouter une nouvelle feature

### Nouvelle route API
1. Créer le fichier dans `packages/api/src/routes/`
2. Enregistrer la route dans `packages/api/src/app.ts`
3. Ajouter les types dans `packages/shared/src/index.ts`
4. Écrire les tests dans `packages/api/src/__tests__/`
5. Documenter dans `docs/API.md`

### Nouveau module IA
1. Créer le fichier dans `packages/ai/src/`
2. Exporter dans `packages/ai/src/index.ts`
3. Écrire les tests dans `packages/ai/__tests__/`
4. Si le module est utilisé par l'API, l'intégrer dans le worker ou les routes

### Nouveau composant mobile
1. Créer dans `apps/mobile/components/`
2. Utiliser le design system existant (Glassmorphism, NativeWind)
3. Tester avec `expo start`

## 📤 Soumettre une PR

1. Fork le repo
2. Créer une branche : `git checkout -b feature/ma-feature`
3. Committer : `git commit -m "feat: description"`
4. Pusher : `git push origin feature/ma-feature`
5. Ouvrir une Pull Request vers `develop`

## 🐛 Signaler un bug

Ouvrir une issue avec :
- Description du bug
- Étapes pour reproduire
- Comportement attendu vs observé
- Environnement (OS, Node version, etc.)

---

Merci pour ta contribution ! 🏀
