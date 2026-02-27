# 🏀 CourtVision AI — Architecture Backend V5 "Apex"

## Vision
Surpasser HomeCourt, s'inspirer d'Apple Health/Fitness+, NBA App, et Whoop.
CourtVision AI devient une **plateforme d'intelligence basketball complète** —
pas juste un tracker de tirs, mais un **écosystème IA** qui comprend,
prédit, et transforme chaque joueur.

---

## 🆕 Nouvelles Fonctionnalités Révolutionnaires

### 1. 🧬 Shot DNA™ — Empreinte de Tir Unique
Chaque joueur a une "empreinte de tir" unique basée sur sa biomécanique.
- Signature 3D de la mécanique de tir (angle coude, hauteur release, follow-through)
- Comparaison avec 50+ joueurs NBA en temps réel
- Détection de dérives mécaniques session après session
- "Shot DNA Score" → note de pureté mécanique

### 2. 🔮 Predictive Engine — Prédictions IA
- Prédiction de performance avant un match (basée sur sommeil, stress, historique)
- Prédiction du % de réussite par zone avant la session
- "Momentum Predictor" → quand le joueur va entrer en zone chaude/froide
- Système d'alertes prédictives ("Tu risques un creux au Q3")

### 3. 📊 Advanced Analytics (NBA-Grade)
- Possession-level analytics (points per possession)
- Shot Quality Score (SQS) — comme la NBA
- Expected Goals (xShots) — probabilité de réussite par tir
- Clutch Rating™ — performance dans les moments clés
- Court Balance Index — équilibre de jeu sur le terrain

### 4. 🏋️ Smart Training Plans (AI-Generated)
- Plans adaptatifs qui évoluent avec les performances
- Micro-ajustements quotidiens basés sur la fatigue/récupération
- Intégration données biométriques (Apple Health, Whoop)
- Periodization automatique (macro/méso/micro cycles)
- Drill difficulty auto-scaling

### 5. 🎮 Gamification Avancée (Beyond Badges)
- Skill Trees visuels (comme un RPG)
- Quêtes quotidiennes/hebdomadaires/mensuelles
- Saisons compétitives (3 mois, avec récompenses)
- "Player Cards" collectionnables (style NBA 2K MyTeam)
- "Court Battles" — défis 1v1 asynchrones

### 6. 🤖 AI Coach Conversationnel
- Chat IA en langage naturel ("Pourquoi je rate mes 3pts ?")
- Réponses basées sur les données réelles du joueur
- Suggestions de drill en temps réel
- Mode "Film Room" — l'IA commente tes highlights
- "Pre-Game Prep" — briefing personnalisé avant un match

### 7. 📱 Recovery & Wellness
- Score de récupération (basé sur HRV, sommeil, données Apple Health)
- Recommandations hydratation/nutrition pre/post session
- Streak de bien-être (comme Whoop)
- Corrélation récupération ↔ performance

### 8. 🌐 Social Features Avancées
- "Crew" — équipes/groupes de 5 avec classement
- Clips highlights partageables avec AR overlays
- "Scout Report" — profil public riche pour recruteurs
- "Film Exchange" — partage de vidéos avec annotation IA

---

## Architecture Technique

```
Mobile App (React Native)
    │
    ├── REST API (Fastify) ──────────────────────────┐
    │     ├── Auth (Supabase JWT)                     │
    │     ├── Routes V5                               │
    │     │   ├── /api/sessions (upload, list, etc.)  │
    │     │   ├── /api/analyses (reports, heatmaps)   │
    │     │   ├── /api/twin (Digital Twin)            │
    │     │   ├── /api/shot-dna (Shot DNA™)           │
    │     │   ├── /api/predict (Predictive Engine)    │
    │     │   ├── /api/training (Smart Plans)         │
    │     │   ├── /api/coach-chat (AI Chat)           │
    │     │   ├── /api/recovery (Wellness)            │
    │     │   ├── /api/community (Social)             │
    │     │   ├── /api/quests (Gamification)          │
    │     │   ├── /api/crews (Teams)                  │
    │     │   └── /api/advanced-analytics             │
    │     │                                           │
    │     ├── Plugins                                 │
    │     │   ├── Supabase                            │
    │     │   ├── Auth                                │
    │     │   ├── WebSocket (live)                    │
    │     │   └── Rate Limiter                        │
    │     │                                           │
    │     └── Queue (BullMQ + Redis)                  │
    │           ├── video-processing                  │
    │           ├── twin-rebuild                      │
    │           ├── training-plan-gen                  │
    │           └── highlight-render                  │
    │                                                 │
    ├── AI Engine (@courtvision/ai)                   │
    │     ├── Shot Analysis                           │
    │     ├── Shot DNA Engine (NEW)                   │
    │     ├── Predictive Engine (NEW)                 │
    │     ├── Smart Training AI (NEW)                 │
    │     ├── Coach Chat AI (NEW)                     │
    │     ├── Advanced Analytics (NEW)                │
    │     ├── Mental Analysis                         │
    │     ├── Digital Twin                            │
    │     ├── Live Coach                              │
    │     └── LLM (Groq + Ollama)                    │
    │                                                 │
    ├── Python ML (@courtvision/python)               │
    │     ├── MediaPipe Pose                          │
    │     ├── YOLOv8 Ball Detection                   │
    │     └── ByteTrack Multi-Object                  │
    │                                                 │
    └── Database (Supabase/Postgres)                  │
          ├── Core Tables                             │
          ├── Shot DNA Tables (NEW)                   │
          ├── Predictions Tables (NEW)                │
          ├── Training Plans Tables (NEW)             │
          ├── Recovery Tables (NEW)                   │
          ├── Quests Tables (NEW)                     │
          ├── Crews Tables (NEW)                      │
          └── Coach Chat Tables (NEW)                 │
```

---

## Packages Modifiés/Créés

| Package | Changement |
|---------|-----------|
| `@courtvision/ai` | +5 nouveaux modules (shotDNA, predictive, smartTraining, coachChat, advancedAnalytics) |
| `@courtvision/api` | +8 nouvelles routes, WebSocket plugin |
| `@courtvision/database` | +12 nouvelles tables, fonctions PostgreSQL |
| `@courtvision/shared` | +Types partagés pour les nouvelles features |

---

## Priorité d'Implémentation

1. **Shot DNA™ + Advanced Analytics** (le cœur différenciateur)
2. **AI Coach Chat** (l'expérience "Apple-like")
3. **Smart Training Plans** (valeur utilisateur maximale)
4. **Predictive Engine** (le "wow" factor)
5. **Recovery & Wellness** (fidélisation)
6. **Quests + Crews** (engagement social)
