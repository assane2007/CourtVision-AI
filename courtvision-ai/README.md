# 🏀 CourtVision AI — Monorepo

Ce dossier contient le monorepo principal du projet CourtVision AI.

Voir le [README complet](../README.md) à la racine du repo pour la documentation complète.

## Quick Start

```bash
# Installer les dépendances (npm workspaces)
npm install

# Copier le fichier d'environnement
cp .env.example .env

# Lancer le dev
npm run dev:api   # API Fastify → http://localhost:3001
npm run dev:web   # Landing Next.js → http://localhost:3000

# Tests
npm test          # Tous les tests
npm run test:api  # Tests API uniquement
npm run test:ai   # Tests AI uniquement
```

## Structure

| Dossier | Description |
|---------|-------------|
| `apps/mobile` | App React Native (Expo Router) |
| `apps/web` | Landing page Next.js 14 |
| `packages/api` | Backend Fastify + BullMQ |
| `packages/ai` | Pipeline IA 7 étapes |
| `packages/database` | Schema SQL + RLS Supabase |
| `packages/shared` | Types & constantes partagés |

## Scripts disponibles

| Commande | Description |
|----------|-------------|
| `npm run dev:api` | Lance l'API en mode dev |
| `npm run dev:web` | Lance le web en mode dev |
| `npm run build:api` | Build l'API |
| `npm run build:web` | Build le web |
| `npm run build:ai` | Build le package AI |
| `npm test` | Lance tous les tests |
| `npm run lint` | Lint du code |
| `npm run typecheck` | Vérification des types |
| `npm run clean` | Supprime les node_modules |
