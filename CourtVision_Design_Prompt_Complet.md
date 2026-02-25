# 🏀 PROMPT DESIGN MAÎTRE — CourtVision AI Redesign Total

> Ce prompt donne à l'IA une liberté créative totale pour concevoir
> la meilleure app de basket jamais faite. Inspire-toi des meilleurs :
> Apple Fitness+, Whoop, Nike Training Club, Duolingo, Spotify, Strava.

---

## 🎯 CONTEXTE COMPLET À COLLER EN DÉBUT DE SESSION

```
Tu es un designer produit senior + développeur full-stack.
Tu as travaillé chez Apple, Stripe, Linear, Vercel et Raycast.
Tu dois redesigner CourtVision AI — l'app d'analyse de basket IA — 
pour en faire le produit le plus beau et le plus désirable du marché.

Tu as une liberté créative TOTALE.
Tu peux tout changer : couleurs, navigation, noms d'écrans, icônes, 
typographie, animations, logique d'UI, architecture de l'information.
L'objectif est simple : créer quelque chose d'INOUBLIABLE.

Stack technique fixe (ne pas changer) :
- React Native + Expo Router
- NativeWind (Tailwind pour React Native)
- Zustand (state management)
- Supabase (auth + database)
- Fastify (backend)

Inspirations de design (étudie leur approche, ne les copie pas) :
- Apple Fitness+ : hiérarchie visuelle parfaite, blanc sur noir, chiffres imposants
- Whoop : data-dense mais lisible, palette monochromatique + 1 accent
- Linear : animations fluides, dark theme premium, micro-interactions soignées
- Nike Training Club : énergie, typographie bold, sentiment d'accomplissement
- Duolingo : gamification visible, célébrations, progression satisfaisante
- Strava : communauté + performance, feed vivant, badges désirables
- Raycast : interface ultra-rapide, dark élégant, recherche première

Ce que l'app DOIT dégager :
→ "Je suis un athlète sérieux qui utilise une technologie de pointe"
→ Pas cheap, pas générique, pas "encore une app de sport"
→ Quelqu'un qui voit ton écran doit demander "c'est quoi cette app ?"
```

---

## 🎨 PHASE DESIGN — Système Visuel Complet

```
CONTEXTE : [colle le contexte ci-dessus]

TÂCHE — Crée le design system complet de CourtVision AI.

Je veux que tu prennes des décisions radicales et défende-les.
Pas de compromis. Pas de "ça dépend". Choisis et exécute.

---

DÉCISION 1 — Palette de couleurs

Crée une palette qui n'existe dans AUCUNE autre app de sport.
Contraintes :
- Background principal : très sombre (pas #000000 pur, trop harsh)
- 1 couleur signature forte (pas cyan, pas bleu roi — surprends-moi)
- Couleurs sémantiques : succès, erreur, warning, neutre
- Dégradés si pertinents, mais pas "AI gradient violet-rose"

Fournis exactement :
{
  background: {
    primary: "#...",      // fond app
    secondary: "#...",    // cartes
    tertiary: "#...",     // éléments surélevés
    overlay: "#..."       // modales
  },
  signature: {
    primary: "#...",      // couleur principale de la marque
    light: "#...",        // version claire pour backgrounds
    dark: "#..."          // version sombre
  },
  semantic: {
    success: "#...",
    error: "#...",
    warning: "#...",
    info: "#..."
  },
  text: {
    primary: "#...",
    secondary: "#...",
    tertiary: "#...",
    inverse: "#..."
  },
  border: {
    subtle: "#...",
    default: "#...",
    strong: "#..."
  }
}

Justifie chaque choix en 1 phrase.

---

DÉCISION 2 — Typographie

Choisis 2 fonts Google Fonts (disponibles sur mobile via expo-google-fonts) :
- 1 display font : pour les chiffres et titres (grand, impactant)
- 1 body font : pour le texte courant (lisible, moderne)

Règles typographiques :
- Tailles : xs(11) / sm(13) / base(15) / md(17) / lg(20) / xl(24) / 2xl(32) / 3xl(42) / hero(64)
- Weights : regular(400) / medium(500) / semibold(600) / bold(700) / black(900)
- Line heights et letter spacing pour chaque taille

Justifie le choix des fonts.

---

DÉCISION 3 — Composants de base

Crée le code complet pour ces composants avec le nouveau design system :

A) StatCard — affiche une stat (ex: "73%" avec label "Précision")
   - 3 sizes : sm, md, lg
   - Animation au chargement (count-up sur le chiffre)
   - Variante avec trend (+5% vs hier)

B) ScoreRing — jauge circulaire pour le mental score
   - SVG animé (stroke-dashoffset)
   - Couleur qui change selon la valeur (rouge/orange/vert)
   - Chiffre au centre avec animation count-up

C) SessionCard — carte d'une session dans le feed
   - Date + durée
   - Stats clés (tirs, mental, distance)
   - Badge de performance (Excellent/Good/Average)
   - Tap → navigation vers le détail

D) XPBar — barre de progression du niveau
   - Animation fluide quand XP augmente
   - Affiche niveau actuel + XP restant pour le prochain
   - Célébration si niveau up (confetti ou glow)

E) PrimaryButton — bouton principal
   - États : default, loading, success, disabled
   - Animation press (scale down)
   - Haptic feedback au press

F) Tab Bar — navigation principale
   - 5 onglets (Dashboard, Upload, Community, Twin, Profile)
   - Pas les icônes classiques — trouve des icônes originales
   - Indicateur actif qui se déplace en slide fluide
   - Badge notification animé

Pour chaque composant : code React Native complet, zéro placeholder.
```

---

## 📱 PHASE ÉCRANS — Redesign Complet de l'App

### Écran 1 — Dashboard (Écran principal)

```
CONTEXTE : [colle le contexte ci-dessus + design system créé]

TÂCHE — Redesign total du Dashboard.

L'écran principal est la première impression. Il doit être WOW.

Inspire-toi de cette structure (mais améliore-la) :

SECTION 1 — Hero personnalisé (25% de l'écran)
- Greeting dynamique selon l'heure : "Good morning, Assane" / "Evening, Assane"
- Sous-titre : message motivationnel basé sur le streak actuel
  * 0 jours : "Ready to start your streak?"
  * 1-6 jours : "Day {n} — Keep the momentum"  
  * 7+ jours : "Week {n} streak — You're locked in 🔥"
- Avatar avec anneau de progression XP autour (comme les stories Instagram)
- Niveau actuel en badge

SECTION 2 — Today's Stats (card principale)
Si session aujourd'hui :
  - Grande stat headline : pourcentage de tir ou mental score
  - 3 mini-stats en row : Tirs / Mental / Durée
  - Bouton "View Details"
Si pas de session :
  - État vide ÉLÉGANT (pas juste un texte gris)
  - Illustration ou animation qui donne envie de filmer
  - CTA "Start Today's Session"

SECTION 3 — Daily Challenge
- Timer countdown jusqu'à minuit
- Description du défi (ex: "50 Free Throws Challenge")
- Barre de progression des participants
- Récompense XP visible
- CTA "Join Challenge"

SECTION 4 — Weekly Progress
- 7 jours sous forme de dots ou mini-bars
- Aujourd'hui highlighted
- Jours avec session : couleur signature
- Jours sans session : subtil

SECTION 5 — Feed rapide (2-3 items)
- Activité récente des amis
- Scroll horizontal
- CTA "See All" → Community tab

Design requirements :
- Header sticky avec gradient fade vers transparent
- Scroll fluide sans à-coups
- Chaque section doit avoir un purpose clair
- Pas de padding uniforme partout — crée de la hiérarchie
- Les chiffres importants DOIVENT être grands (min 32px)

Fournis le code complet : apps/mobile/app/(dashboard)/index.tsx
```

### Écran 2 — Upload & Analyse

```
CONTEXTE : [colle le contexte ci-dessus + design system créé]

TÂCHE — L'écran Upload doit transformer une action banale en rituel.

Filme ton entraînement ne doit pas sembler techno-froid.
Ça doit sembler comme "je me prépare à avoir un coaching de pro".

FLOW EN 3 ÉTATS :

ÉTAT A — Sélection (avant upload)
- Grand bouton central avec animation pulsante
  (comme un bouton d'enregistrement — cercle qui pulse)
- Texte : "Drop your session" ou "Analyze your game"
- Sous-texte : "MP4, MOV • Max 500MB • 30 sec minimum"
- Option : Galerie OU Caméra directe
- Tips contextuels en bas (rotatifs toutes les 3s) :
  * "📱 Place your phone 3-5m from the basket"
  * "💡 Good lighting = better detection"
  * "🎯 Include your full shooting motion"

ÉTAT B — Processing (pendant l'analyse)
NE PAS faire une simple progress bar.
Crée une expérience d'attente ENGAGEANTE :
- Visualisation animée du pipeline (les 7 étapes en cours)
  Chaque étape s'allume quand elle commence :
  ○ Extracting frames...
  ○ Detecting movements...
  ○ Analyzing shots...
  ○ Computing mental score...
  ○ Building 3D view...
  ○ Generating report...
  ○ Creating highlights...
- Pourcentage global
- Temps estimé restant
- Fun fact sur le basket pendant l'attente (change toutes les 8s)
  Ex: "Stephen Curry shoots at 47.3% from 3 — what's your rate?"

ÉTAT C — Résultat immédiat (dès que l'analyse est prête)
- Animation de reveal (les stats apparaissent une par une)
- Score headline ÉNORME (ex: "67%" en taille hero)
- Sous-titre contextuel basé sur la valeur :
  * < 40% : "Tough day. Champions keep shooting."
  * 40-60% : "Solid session. Room to grow."
  * 60-75% : "Great shooting day! 🔥"
  * > 75% : "Elite performance. NBA-level accuracy."
- Boutons : "Full Report" | "Share" | "New Session"

Fournis : apps/mobile/app/upload.tsx + apps/mobile/app/processing/[id].tsx
```

### Écran 3 — Rapport d'Analyse

```
CONTEXTE : [colle le contexte ci-dessus + design system créé]

TÂCHE — Le rapport est ce que l'utilisateur garde et partage.
Il doit être BEAU comme un rapport Nike ou Apple Fitness.

STRUCTURE EN TABS (3 onglets) :

TAB 1 — "Performance"
- Hero stat : pourcentage de tir avec ScoreRing animé
- Grid 2x2 de stats :
  * Tirs réussis / tentés
  * Meilleure série
  * Angle de coude moyen
  * Distance parcourue
- Section "Shot Breakdown" :
  * Par main (droite/gauche) avec mini donut charts
  * Evolution dans le temps (si sessions précédentes dispo)
- Comparaison vs ta session précédente (trend +/- %)

TAB 2 — "Mental"
- Score mental principal avec ScoreRing grande taille
- 4 sous-métriques en cards :
  * Shoulder alignment
  * Movement consistency
  * Recovery speed
  * Focus score
- Message du Coach IA (texte généré par LLM)
  Affiché comme un message d'un vrai coach humain,
  avec avatar coach et style conversationnel
- Timeline mentale : comment le score a évolué pendant la session

TAB 3 — "AI Coach"
- Programme personnalisé 7 jours
- Chaque jour : 3 exercices avec sets/reps
- Exercice : nom + description + durée estimée + XP gagné
- Progress tracker : cocher les exercices terminés
- Bouton partage en bas

DESIGN REQUIREMENTS :
- Les onglets doivent avoir un indicateur animé (slide)
- Chaque chiffre doit avoir une animation count-up au premier affichage
- Les comparaisons positives = vert + flèche haut
- Les comparaisons négatives = orange + flèche bas (jamais rouge — trop négatif)
- Bouton "Share Report" flottant en bas qui ouvre une belle modal

Fournis : apps/mobile/app/analysis/[id].tsx
```

### Écran 4 — Communauté

```
CONTEXTE : [colle le contexte ci-dessus + design system créé]

TÂCHE — La communauté doit donner envie de revenir chaque jour.
Inspire-toi de Strava pour l'aspect social + Duolingo pour la gamification.

STRUCTURE EN 3 SOUS-ONGLETS :

SOUS-ONGLET 1 — "Feed"
- Post d'activité des amis :
  * Avatar + nom + "just completed a session"
  * Stats en pills : "71% FG · 88 Mental"
  * Il y a X heures
  * Bouton Like (avec animation cœur)
  * 1 commentaire IA automatique fun :
    "That mental score though! 👀"
- Si feed vide : suggestions d'amis à follow
- Refresh to load animation (basketball qui rebondit)

SOUS-ONGLET 2 — "Rankings"
- Sélecteur de métrique : Overall / Shooting / Mental / Sessions
- Sélecteur de scope : Global / Friends
- Top 3 avec podium visuel (or/argent/bronze avec tailles différentes)
- Liste scrollable pour rang 4+
- Ta position surlignée avec la couleur signature (même si pas top 10)
- Ton rang change → animation de slide

SOUS-ONGLET 3 — "Challenges"
- Challenge actif en cours (card grande en haut)
  * Timer countdown
  * Top participants
  * Ta position actuelle
  * CTA "Submit Score"
- Challenges passés (liste compacte)
- Challenges à venir (locked avec date de début)

Fournis : apps/mobile/app/(dashboard)/community.tsx
```

### Écran 5 — Digital Twin

```
CONTEXTE : [colle le contexte ci-dessus + design system créé]

TÂCHE — Le Digital Twin est la feature la plus unique.
Elle doit sembler de la science-fiction accessible.

SECTION 1 — Hero Twin
- Avatar stylisé (silhouette de joueur, pas une photo)
  Dessiné en lignes de néon avec la couleur signature
  Animation idle : légère rotation / pulsation
- Note globale ÉNORME au centre : "84"
- Titre style détecté : "Sharpshooter" ou "Slasher"
- Sous-titre : "Based on 12 analyzed sessions"

SECTION 2 — Radar Chart
- 5 axes : Shooting / Mental / Physical / Tactical / Consistency
- Tes données en couleur signature (rempli semi-transparent)
- Données NBA comparable en blanc (ligne seulement)
- Label NBA comparable : "Your style: Kevin Durant (62% match)"
- Animation draw-in au premier affichage

SECTION 3 — NBA Comparaisons
- 3 joueurs les plus proches
- Row : photo NBA (ou silhouette) + nom + % de similarité + stat commune
- Tap → modal détail avec explication de la similarité

SECTION 4 — Simulation Match-Up
- CTA "Simulate Matchup"
- Sélection d'un joueur NBA depuis une liste
- Résultat en overlay :
  * Win probability (barre horizontale split)
  * Ton plan de jeu (3 bullets)
  * Leur avantage, ton avantage
  * Score prédit : Toi 18 — Curry 24

SECTION 5 — Evolution Timeline
- Graph de l'évolution de ta note globale sur les 30 derniers jours
- Points clés annotés : "Best session" "New record"
- Smooth line chart (pas de barres — trop basique)

Fournis : apps/mobile/app/(dashboard)/twin.tsx
```

### Écran 6 — Profil

```
CONTEXTE : [colle le contexte ci-dessus + design system créé]

TÂCHE — Le profil est la carte d'identité de l'athlète.
Il doit être shareable et désirable.

SECTION 1 — Header identité
- Cover image/gradient dynamique basé sur le niveau
- Avatar avec ring XP (niveau actuel visible)
- Nom + Poste + Niveau en badge
- Bio courte
- Stats sociales : X followers · X following
- Boutons : "Edit Profile" | "Share Profile"

SECTION 2 — Stats snapshot
- 4 chiffres clés en row :
  * Sessions totales
  * Meilleur FG%
  * Mental max
  * Classement global (#X)

SECTION 3 — Badges gagnés
- Grid de badges (hex shape comme Duolingo ou Foursquare)
- Badges non obtenus = grisés avec cadenas
- Tap → modal détail : nom, condition, date obtenu, XP gagné
- Catégories : Performance / Social / Streak / Elite

SECTION 4 — Activité récente
- Timeline verticale des 10 dernières sessions
- Date + stats résumées + badge de performance
- Tap → rapport complet

SECTION 5 — Paramètres (collapsé en bas)
- Notifications ON/OFF
- Profil public ON/OFF
- Plan actuel (Free / Pro / Academy)
- Se déconnecter

MODAL EDIT PROFILE (bottom sheet) :
- Edit avatar (photo ou initiales stylisées)
- Nom, Username, Poste, Niveau, Bio
- Bouton Save avec loading state

Fournis : apps/mobile/app/(dashboard)/profile.tsx
```

---

## 🏠 PHASE LANDING PAGE — Next.js Redesign

```
CONTEXTE : [colle le contexte ci-dessus]

TÂCHE — Landing page Next.js qui convertit des visiteurs en utilisateurs.
Inspire-toi de : linear.app, raycast.com, arc.net pour l'élégance dark.

STRUCTURE DE LA PAGE :

SECTION 1 — Hero (above the fold)
- Background : dark avec effet de particules ou grain subtil
- Headline principale ÉNORME :
  "Your game, decoded."
  (ou trouve mieux — tu as la liberté)
- Sous-headline : 1 phrase, max 12 mots, parle au joueur pas à la tech
- Social proof : "Trusted by X+ ballers" avec avatars
- 2 CTAs : "Start Free" (primary) + "Watch Demo" (secondary)
- Mockup de l'app en hero (screenshot ou animation)

SECTION 2 — Features (3 features principales)
Ne fais PAS une grid de 6 features génériques.
Choisis les 3 features les plus différenciantes et montre-les vraiment :
1. Shot Analysis — "Every shot. Every angle. Every detail."
2. Mental Score — "Basketball is 80% mental. Now you can measure it."
3. Digital Twin — "Your AI self evolves with every session."

Pour chaque feature : visual + headline + 2 phrases max.

SECTION 3 — Social proof / Stats
- 3-4 chiffres impressionnants :
  * Shots analyzed
  * Average accuracy improvement
  * Sessions per user per month
  * Active players

SECTION 4 — Pricing (simple)
- 3 plans : Free / Pro ($9.99/mo) / Academy ($49.99/mo)
- Highlight le plan Pro
- Features en liste claire
- CTA sur chaque plan

SECTION 5 — Footer minimal
- Logo + tagline
- Liens : Privacy / Terms / Twitter / Discord

REQUIREMENTS TECHNIQUES :
- Next.js 14 App Router
- Tailwind CSS
- Framer Motion pour les animations
- Responsive (mobile first)
- Dark theme SEULEMENT
- Pas de stock photos — utilise des formes, dégradés, mockups
- Lighthouse score > 90

Fournis : apps/web/src/app/page.tsx + tous les composants nécessaires
```

---

## ⚡ ANIMATIONS & MICRO-INTERACTIONS

```
CONTEXTE : [colle le contexte ci-dessus + design system créé]

TÂCHE — Crée un fichier d'animations réutilisables pour toute l'app.

Fichier : apps/mobile/lib/animations.ts

Inclus ces animations avec react-native-reanimated :

1. useCountUp(targetValue, duration)
   - Anime un chiffre de 0 à targetValue
   - Easing : spring avec légère overshoot
   - Usage : stats, scores, pourcentages

2. useFadeSlideIn(delay)
   - Fade + slide from bottom (20px)
   - Pour les cards qui apparaissent
   - Stagger par index si dans une liste

3. useScalePress()
   - Scale 1 → 0.96 au press
   - Spring release
   - Pour tous les boutons

4. usePulse()
   - Scale 1 → 1.05 → 1 en loop
   - Pour les CTA importants quand l'app attend une action

5. useGlow(color)
   - Glow effect qui pulse sur une card
   - Pour highlight les nouvelles notifications, badges

6. useTabSlide(activeIndex)
   - Indicateur tab qui slide entre les onglets
   - Spring animation

7. useSkeletonPulse()
   - Opacity 0.3 → 0.7 en loop
   - Pour les skeleton loaders

8. useLevelUp()
   - Animation de célébration niveau up
   - Confetti + scale + glow
   - Usage unique (se déclenche une fois)

Pour chaque animation : hook complet avec react-native-reanimated v3.
Pas de setTimeout. Pas d'Animated API classique. Reanimated uniquement.
```

---

## 🔔 PROMPT NAVIGATION & ARCHITECTURE UX

```
CONTEXTE : [colle le contexte ci-dessus + design system créé]

TÂCHE — Repense l'architecture de navigation de zéro.

NAVIGATION PRINCIPALE : Tab Bar (5 onglets)

Réévalue les noms et icônes :
- Pas "Home", "Upload", "Community", "Twin", "Profile"
- Trouve des noms qui parlent à un basketteur :
  Ex : "Court" / "Film" / "Squad" / "Twin" / "Me"
  Ou autre chose — tu décides.

Tab Bar design :
- Background : légèrement surélevé avec blur (expo-blur)
- Icônes : custom SVG, pas Lucide/Ionicons defaults
- Label : petits, sous l'icône, seulement pour l'actif
- Indicateur actif : pill qui slide ou dot qui bounce
- FAB Upload (bouton flottant central) : 
  * Plus grand que les autres tabs
  * Couleur signature
  * Animation press + haptic

NAVIGATION SECONDAIRE : Stack Screens
- Les modales viennent du bas (bottom sheet) quand c'est contextuel
- Les pages de détail viennent de la droite (stack classique)
- Transitions personnalisées : fade pour les modales, slide pour les pages

GESTES :
- Swipe back sur iOS natif
- Pull-to-refresh avec animation custom (basketball qui tombe)
- Long press sur une session → quick actions (Share / Delete / Pin)

Fournis :
- apps/mobile/app/(dashboard)/_layout.tsx (Tab Navigator complet)
- apps/mobile/components/TabBar.tsx (Custom tab bar component)
- apps/mobile/components/FABUpload.tsx (Floating action button)
```

---

## 📐 DESIGN TOKENS FINAL — Fichier Complet

```
CONTEXTE : [colle le contexte ci-dessus]

Génère le fichier design system complet :
apps/mobile/lib/theme.ts

Il doit contenir TOUT :
- Toutes les couleurs (avec les décisions prises ci-dessus)
- Toutes les tailles de typo
- Tous les spacings (4px base grid : 4/8/12/16/20/24/32/40/48/64/80/96)
- Tous les border radius (sm:4 / md:8 / lg:12 / xl:16 / 2xl:24 / full:9999)
- Toutes les ombres (shadow-sm jusqu'à shadow-xl)
- Tous les z-index (base:0 / raised:10 / modal:100 / toast:1000)
- Durées d'animation (fast:150ms / normal:300ms / slow:500ms / verySlow:800ms)
- Easings (spring, ease-out, ease-in-out)

Format TypeScript avec const assertion pour avoir l'autocomplete.
Exporte aussi des helpers : colors.signature.primary, spacing[4], etc.
```

---

## ✅ CHECKLIST DESIGN FINAL

Avant de livrer le code, vérifie chaque point :

```
DESIGN :
□ La palette est cohérente sur TOUS les écrans
□ Chaque écran a une hiérarchie visuelle claire (1 élément dominant)
□ Les chiffres importants sont GRANDS (min 32px)
□ Les états de chargement sont beaux (skeleton, pas de spinner gris)
□ Les états vides sont motivants (pas juste "No data")
□ Les erreurs sont compréhensibles (pas "Error 500")
□ Le dark theme ne fatigue pas les yeux (pas de noir pur)
□ Les animations ne gênent pas l'utilisateur (< 400ms en général)

MOBILE :
□ Touch targets min 44x44px
□ Safe area insets respectés (iOS notch, Android nav bar)
□ Keyboard avoid scroll sur les formulaires
□ Pas de texte trop petit (min 12px)
□ Contrastes WCAG AA respectés

CODE :
□ Zéro hardcoded colors (tout dans theme.ts)
□ Zéro hardcoded strings (prêt pour i18n)
□ Tous les composants ont des loading + error states
□ Tous les boutons ont disabled state
□ Pas de console.log en production
```

---

*CourtVision AI Design System — Liberté totale, excellence requise.*
*"If it doesn't make you say WOW, it's not done."*
