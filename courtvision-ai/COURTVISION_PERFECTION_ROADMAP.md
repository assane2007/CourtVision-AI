# CourtVision AI : Roadmap & Architecture de Perfectionnement (2026)

Ce document archive l'ensemble des travaux de réingénierie, d'optimisation et d'ajout de fonctionnalités "killer-features" réalisés pour faire de CourtVision AI la meilleure application d'analyse de basketball sur le marché.

## 📌 Architecture Globale

Le projet repose sur un **Monorepo** moderne structuré pour la scalabilité entreprise :

- **`apps/web`** : Landing page et dashboard en **Next.js 14** (App Router). UI propulsée par Tailwind CSS et Framer Motion pour des animations 60fps constantes.
- **`apps/mobile`** : Application mobile **React Native (Expo)**. UI/UX premium de type "Apple Fitness+" utilisant le *Glassmorphism* (`expo-blur`) et `react-native-reanimated`.
- **`packages/api`** : Backend ultra-performant en **Fastify**. Validation stricte des données via **Zod**, gestion de files d'attente asynchrones pour le traitement vidéo via **BullMQ** et **Redis**.
- **`packages/database`** : Base de données **PostgreSQL** gérée via **Supabase**, avec des politiques strictes de sécurité au niveau des lignes (Row Level Security - RLS).
- **`packages/ai`** : Pipeline d'Intelligence Artificielle modulaire. Scripts Python/TypeScript (OpenCV, YOLO, SAM) pour la détection corporelle, couplés à des LLM (Llama 3 / Groq) pour l'analyse cognitive des joueurs.

---

## 🚀 Phases de Perfectionnement Complétées

### Phase 1 : Audit Profond & Planification
- Création de ce manifeste de perfectionnement.
- Cartographie des dépendances et de l'architecture du monorepo.

### Phase 2 : Qualité du Code & Architecture Backend
- **Audit de typage** : Fix global des erreurs TypeScript sur l'ensemble du monorepo pour garantir une base solide.
- **Sécurité API** : Implémentation de la validation _runtime_ Zod sur 100% des endpoints Fastify.
- **Asynchronisme** : Sécurisation et monitoring des workers BullMQ pour éviter les pertes de jobs vidéo (gestion des échecs et *retries*).
- **Base de Données** : Vérification des RLS Supabase et sécurisation des JWT dans le flux de requêtes Fastify.

### Phase 3 : Excellence UI/UX (Web & Mobile)
- **Web** : Intégration avancée de composants `framer-motion` (animations fluides au scroll) et optimisation SEO / Core Web Vitals (Next.js).
- **Mobile** : Nettoyage drastique des dépendances UI lourdes (suppression des wrappers Gluestack superflus). Mise en place d'un état global ultra-léger via **Zustand**.

### Phase 4 : Déploiement & Fiabilité (DevOps)
- **Tests End-to-End (E2E)** : Implémentation de Playwright pour tester les flux critiques depuis une interface utilisateur simulée.
- **CI/CD** : Mise en place de pipelines GitHub Actions pour valider automatiquement le linteur, les types, et les tests unitaires à chaque push.

### Phase 5 : "HomeCourt Killer" Features (Carte Blanche IA)
1. **Biomécanique Avancée (Kinetic Chain)** :
   - Ajout du calcul de la trajectoire du ballon (`arcAngle`).
   - Ajout de la détente verticale maximale (`maxVertical`) et du balancement des jambes (`legSweep`).
   - Intégration complète dans le profil `TwinProfile` (Jumeau Numérique du joueur).
2. **Coach IA à Mémoire Cognitive (RAG)** :
   - Évolution du moteur conversationnel de l'application (CoachChatEngine).
   - Intégration d'un système RAG (Retrieval-Augmented Generation) permettant à l'IA d'interroger la base de données de l'historique des sessions du joueur pour fournir des conseils ultra-personnalisés ("Je remarque que ton arc a baissé depuis la semaine dernière...").
3. **UI/UX Mobile Pro Max** : 
   - Refonte des cartes de statistiques (`StatCard.tsx`) avec un design **Glassmorphism** bluffant, combinant des dégradés (`expo-linear-gradient`) et des flous d'arrière-plan interactifs (`expo-blur`).
4. **Dockerisation d'Entreprise** :
   - Mise en conteneur exhaustive des composants via des `Dockerfile` *multi-stages* ultra-légers pour Next.js (Web) et Fastify (API).
   - Script d'orchestration `docker-compose.yml` unifiant les services applicatifs, PostgreSQL et Redis.

### Phase 6 : Audit de Production & Connectivité
- **Alignement des Endpoints** : Standardisation du port backend sur `http://localhost:8080` pour simplifier les environnements locaux de développement.
- **Connectivité E2E** : Vérification de la transmission inter-services (Web/Mobile -> API -> Supabase/Redis).
- **Optimisation Docker** : Ajout d'un fichier `.dockerignore` strict pour exclure les `node_modules` massifs du contexte de build Docker, divisant par 10 les temps d'amorçage.

### Phase 7 : Moteur Computer Vision Dédié (Python)
- **Scaffold d'Architecture** : Extraction de l'analyse vidéo Node.js vers un microservice Python pur (`apps/cv-engine`) via **FastAPI**.
- **Calculs Hautes Performances** : Utilisation de `opencv-python-headless` et `numpy` pour que le backend soit prêt à absorber de l'inférence YOLO/MediaPipe côté serveur sans bloquer l'Event Loop de Node.
- **Intégration Asynchrone** : Le worker BullMQ dans `packages/api` transmet dynamiquement la requête HTTP en interne au container Docker `cv-engine`.

### Phase 8 : Intelligence Artificielle "Edge" & Mémoire Vectorielle (RAG)
1. **Implémentation `pgvector`** :
   - Déploiement d'un script SQL de migration Supabase pour activer l'extension PostGres `vector`.
   - Création de la table `memory_embeddings` avec la fonction de recherche de similarité cosinusoïdale (`match_memories`) couplée à un encodage sémantique généré par le pipeline Groq.
2. **Vision Camera Native (Edge AI)** :
   - Bascule de la stratégie mobile : inclusion de `react-native-vision-camera` et `react-native-worklets-core`.
   - Scaffold du composant `<EdgeVisionCamera />` capable d'exécuter l'analyse de poses *Frame Processor* nativement sur le GPU de l'iPhone/Android (tournant à 60 FPS fluides au lieu d'uploader d'immenses vidéos).

---

## 🛠 Directives pour l'Avenir (Future Utils)

1. **Ajout de Nouveaux Composants UI** :
   Continuer d'utiliser `framer-motion` pour le web et `react-native-reanimated` pour le mobile. Évitez les bibliothèques UI tierces lourdes ; privilégiez des composants custom TailwindCSS + composants purs.

2. **Évolution du Modèle IA RAG** :
   Pour améliorer le Coach IA, intégrez une base vectorielle dédiée (Pinecone ou Qdrant) si la masse d'historique des joueurs dépasse les capacités de restitution classique de Supabase. Cela accélèrera la pertinence sémantique du coach.

3. **Lancement de l'Environnement Local** :
   \`\`\`bash
   # Depuis la racine du projet
   docker compose up --build -d
   \`\`\`
   - API : `http://localhost:8080`
   - Dashboard Web : `http://localhost:3000`

4. **Déploiement Cloud Recommandé** :
   Grâce à la phase de DevOps, le projet est prêt pour être déployé sur **AWS (ECS/Fargate)** ou **Vercel** (pour la partie Web Next.js) + **Render/Railway** (pour l'API Fastify et les workers Redis).
