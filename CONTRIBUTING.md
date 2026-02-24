# 🤝 Contribuer à CourtVision AI

Merci de ton intérêt pour CourtVision AI ! Voici comment contribuer.

## 🚀 Quick Start

```bash
# Fork et clone
git clone https://github.com/ton-user/CourtVision-AI.git
cd CourtVision-AI/courtvision-ai

# Install
npm install

# Setup env
cp .env.example .env
# Remplis les variables

# Lance le dev
cd apps/web && npm run dev
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
├── apps/          # Applications (mobile, web)
├── packages/      # Packages partagés (ai, api, database, shared)
├── docs/          # Documentation
└── infra/         # Infrastructure
```

## 🧪 Tests

```bash
# Tests unitaires
cd packages/api && npm test

# Lint
npm run lint
```

## 📝 Pull Request

1. Crée une branche depuis `develop`
2. Fais tes changements
3. Écris / met à jour les tests
4. Vérifie que le build passe
5. Ouvre une PR avec une description claire
6. Attends la review

## 💡 Idées de contribution

- 🐛 Corriger des bugs
- 📖 Améliorer la documentation
- 🧪 Ajouter des tests
- 🌍 Traductions (i18n)
- 🎨 Améliorer l'UI/UX
- ⚡ Optimiser les performances
- 🤖 Améliorer le pipeline IA

## 📞 Contact

- Issues GitHub pour les bugs
- Discussions GitHub pour les questions
- Discord pour le chat

Merci ! 🏀
