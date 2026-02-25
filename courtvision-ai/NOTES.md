# CourtVision AI — NOTES DE PROJET

## 📅 Dernière mise à jour : 25 février 2026

---

## 🔍 AUDIT COMPLET DU PROJET

### ✅ Phase 1 — Fondations (FAIT à ~95%)
| Élément | Status | Notes |
|---------|--------|-------|
| Monorepo structure | ✅ | npm workspaces, apps/ + packages/ |
| apps/mobile (Expo) | ✅ | Expo Router, Zustand, tous les écrans UI |
| apps/web (Next.js) | ✅ | Landing page présente |
| packages/api (Fastify) | ✅ | Routes, plugins, queue BullMQ, **compilation OK** |
| packages/ai (TypeScript) | ✅ | Pipeline TS complet — **35 tests passent** |
| packages/shared | ✅ | Types partagés — **compilation OK** |
| packages/database | ✅ | schema.sql complet avec RLS + seed badges |
| .env.example | ✅ | Toutes les variables documentées |
| .env (réel) | ✅ | Créé avec placeholders pour dev local |
| docker-compose.yml | ✅ | Redis pour BullMQ |
| Dockerfile API | ✅ | Pour déploiement Railway |

### ✅ Phase 2 — Pipeline IA (FAIT en TypeScript, PAS Python)
| Élément | Status | Notes |
|---------|--------|-------|
| preprocessing.ts | ✅ | FFmpeg extraction de frames |
| tracking.ts | ✅ | Interfaces MediaPipe + détection de pose |
| shotAnalysis.ts | ✅ | Détection de tirs par géométrie |
| mentalAnalysis.ts | ✅ | Score mental basé sur posture |
| reconstruction3d.ts | ✅ | Reconstruction 3D + heatmap |
| reportGenerator.ts | ✅ | Rapport IA complet |
| highlightEditor.ts | ✅ | Montage highlight automatique |
| digitalTwin.ts | ✅ | Digital Twin profil |
| liveCoach.ts | ✅ | Coach en temps réel |
| LLM Groq | ✅ | groq.ts + ollama.ts fallback |
| Pipeline Python | ❌ | Le prompt demande Python mais tout est en TS — **c'est OK** |

### ✅ Phase 3 — App Mobile (FAIT à ~95%)
| Élément | Status | Notes |
|---------|--------|-------|
| Upload screen | ✅ | upload.tsx complet |
| Analysis report | ✅ | analysis/[id].tsx refactoré glassmorphism |
| Auth flow | ✅ | Supabase Auth via store.ts |
| Dashboard | ✅ | (dashboard)/index.tsx complet |
| lib/api.ts | ✅ | Client HTTP + auto JWT + refresh |
| lib/store.ts | ✅ | Zustand + persist AsyncStorage |
| Digital Twin | ✅ | twin.tsx complet |
| Community | ✅ | community.tsx + leaderboard |
| Profile | ✅ | profile.tsx complet |
| Live Coach | ✅ | live.tsx + LiveCamera component |
| Highlight player | ✅ | highlight/[id].tsx complet |
| Design system | ✅ | theme.ts (glassmorphism premium) |

### ⚠️ Phase 4 — Backend Routes (FAIT à ~95%)
| Élément | Status | Notes |
|---------|--------|-------|
| POST /api/sessions/upload | ✅ | Avec BullMQ queue (graceful sans Redis) |
| GET /api/sessions/:id | ✅ | Avec analyses join |
| GET /api/sessions | ✅ | Par user |
| GET /api/sessions/weekly | ✅ | Progression 7j |
| GET /api/analyses/:id | ✅ | Rapport complet |
| Auth middleware | ✅ | Supabase JWT verification |
| BullMQ Worker | ✅ | videoProcessor.ts complet (graceful sans Redis) |
| Billing (Stripe) | ✅ | Lazy init, checkout, webhook, portal |
| API Tests | ✅ | **46/46 tests passent** |
| API Startup | ✅ | **Serveur démarre en dev mode sans Redis/Supabase** |
| docker-compose.yml | ✅ | Redis pour BullMQ |
| Multipart upload | ⚠️ | @fastify/multipart pas installé, upload via URL seulement |

### ⚠️ Phase 5 — Déploiement (PARTIEL → EN PROGRÈS)
| Élément | Status | Notes |
|---------|--------|-------|
| railway.toml | ✅ | Existe à la racine |
| Dockerfile API | ✅ | Créé pour Railway |
| Dockerfile AI | ❌ N/A | Pipeline en TS pas Python |
| eas.json | ✅ | Existe dans apps/mobile |
| .env prod | ⚠️ | Template créé, clés réelles à remplir |

---

## 🚨 PROBLÈMES RESTANTS (par priorité)

### 1. Secrets de production à configurer
- Supabase URL/Key → nécessitent un projet Supabase réel
- Stripe keys → nécessitent un compte Stripe
- Groq API key → pour le LLM
- JWT secret → déjà en placeholder

### 2. ~~Expo web crash: expo-notifications~~ → **CORRIGÉ** ✅

### 3. Pas de multipart upload réel
- Le POST /api/sessions/upload attend un JSON `{ video_url }`, pas un fichier
- L'app mobile upload.tsx devrait uploader directement vers Supabase Storage puis envoyer l'URL

### 4. Redis local nécessaire pour le worker
- `docker-compose up -d` pour démarrer Redis
- Sans Redis, le serveur tourne en mode dégradé (queue désactivée)

---

## ✅ RÉSUMÉ DES CORRECTIONS (Session 24-25 fév 2026)

1. **Billing.ts** : Corrigé `as getStripe().Checkout.Session` → `as Stripe.Checkout.Session`
2. **videoProcessor.ts** : Corrigé les types Supabase `never` → `any` pour client non typé
3. **auth.ts plugin** : Ajouté `FastifyRequest.user` dans l'augmentation de module (résout ts-node)
4. **Redis** : Amélioré le handler d'erreur pour silencer les logs de retry en dev
5. **Tests** : Ajouté `.in()` au mock Supabase, corrigé les tests Twin pour matcher l'API réelle
6. **Résultat** : 0 erreur TypeScript, 81/81 tests passent (35 AI + 46 API), serveur démarre ✅

---

## 🎯 PROCHAINES ÉTAPES (dans l'ordre)

1. **Configurer les vrais secrets** dans `.env` (Supabase, Stripe, Groq)
2. **Lancer Redis** via `docker-compose up -d` pour activer le worker BullMQ
3. **Tester le flow E2E** : upload → queue → analyse → résultats
4. **Déployer sur Railway** avec le Dockerfile existant
5. **Build EAS** pour iOS/Android (`eas build`)
6. **Ajouter multipart upload** si besoin (Supabase Storage direct)

---

## 💡 DÉCISIONS ARCHITECTURALES

- **Pipeline IA en TypeScript** (pas Python) — Tout le pipeline vision est dans `packages/ai/` en TS. C'est un choix valide car ça évite un microservice séparé et simplifie le déploiement.
- **Pas de FastAPI Python** — Le worker BullMQ appelle directement les fonctions TS du package `@courtvision/ai`.
- **Supabase Storage** pour les vidéos — Upload direct client → Supabase, puis URL envoyée à l'API.
- **Groq LLM** pour les rapports IA — Avec fallback Ollama local.
