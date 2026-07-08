// Smart Plans™ — adaptive workout plan generator
import { PlanType, SkillKey } from "./iq-engine";

export type Drill = {
  id: string;
  name: { fr: string; en: string };
  description: { fr: string; en: string };
  durationMin: number;
  // Reps/sets OR time-based
  type: "reps" | "time";
  reps?: number;
  sets?: number;
  seconds?: number;
  // Difficulty 1-5
  difficulty: number;
  tips: { fr: string; en: string };
};

export type SmartPlan = {
  id: string;
  type: PlanType;
  level: "beginner" | "intermediate" | "advanced";
  title: { fr: string; en: string };
  description: { fr: string; en: string };
  totalDurationMin: number;
  xpReward: number;
  drills: Drill[];
  createdAt: string;
};

const DRILL_LIBRARY: Record<PlanType, { beginner: Drill[]; intermediate: Drill[]; advanced: Drill[] }> = {
  shooting: {
    beginner: [
      { id: "sh-b1", name: { fr: "Form shooting proche", en: "Close form shooting" }, description: { fr: "10 tirs à 1m du cercle, focus mécanique", en: "10 shots at 1m from rim, focus on mechanics" }, durationMin: 5, type: "reps", reps: 10, sets: 3, difficulty: 1, tips: { fr: "Coude aligné, suivi du bras", en: "Elbow aligned, follow through" } },
      { id: "sh-b2", name: { fr: "Tir ligne de fond", en: "Baseline jumper" }, description: { fr: "5 positions le long de la ligne de fond", en: "5 spots along the baseline" }, durationMin: 8, type: "reps", reps: 5, sets: 5, difficulty: 2, tips: { fr: "Pieds équilibrés, épaules carrées", en: "Balanced feet, square shoulders" } },
      { id: "sh-b3", name: { fr: "Lancers francs", en: "Free throws" }, description: { fr: "20 LF avec routine", en: "20 FTs with routine" }, durationMin: 7, type: "reps", reps: 20, sets: 1, difficulty: 1, tips: { fr: "Respire, vise le cercle avant de tirer", en: "Breathe, focus on rim before shooting" } },
    ],
    intermediate: [
      { id: "sh-i1", name: { fr: "Spot shooting 5 positions", en: "5-spot spot shooting" }, description: { fr: "5 positions (corner, wing, top, wing, corner)", en: "5 spots (corner, wing, top, wing, corner)" }, durationMin: 10, type: "reps", reps: 10, sets: 5, difficulty: 3, tips: { fr: "Attrape-tire rapide, pas d'hésitation", en: "Catch-and-shoot quick, no hesitation" } },
      { id: "sh-i2", name: { fr: "Off-the-dribble pull-up", en: "Off-dribble pull-up" }, description: { fr: "Dribble 2 fois puis pull-up jumper", en: "2 dribbles then pull-up jumper" }, durationMin: 8, type: "reps", reps: 8, sets: 4, difficulty: 3, tips: { fr: "Dernier dribble dur pour monter fort", en: "Hard last dribble to rise strong" } },
      { id: "sh-i3", name: { fr: "Step-back 3-points", en: "Step-back 3" }, description: { fr: "Step-back puis tir à 3", en: "Step-back then 3-pointer" }, durationMin: 10, type: "reps", reps: 6, sets: 4, difficulty: 4, tips: { fr: "Crée de l'espace latéralement", en: "Create space laterally" } },
      { id: "sh-i4", name: { fr: "Free throws pression", en: "Pressure FTs" }, description: { fr: "1+1 (si tu rates le 2e, recommence)", en: "1+1 (miss 2nd, restart)" }, durationMin: 6, type: "reps", reps: 10, sets: 1, difficulty: 3, tips: { fr: "Routine sous pression", en: "Routine under pressure" } },
    ],
    advanced: [
      { id: "sh-a1", name: { fr: "Game-speed 3-points", en: "Game-speed 3s" }, description: { fr: "10 tirs à 3 en mouvement, temps limité 60s", en: "10 3-pointers on the move, 60s limit" }, durationMin: 8, type: "time", seconds: 60, sets: 5, difficulty: 5, tips: { fr: "Vitesse de jeu réelle, pieds prêts", en: "Real game speed, feet ready" } },
      { id: "sh-a2", name: { fr: "Step-back série enchaînée", en: "Step-back combo series" }, description: { fr: "Enchaîne 5 step-backs différents (côté, milieu, inverse)", en: "5 different step-backs (side, middle, reverse)" }, durationMin: 12, type: "reps", reps: 5, sets: 4, difficulty: 5, tips: { fr: "Variation d'angle pour tromper la défense", en: "Vary angle to fool defense" } },
      { id: "sh-a3", name: { fr: "Fadeaway mid-range", en: "Fadeaway mid-range" }, description: { fr: "Fadeaway jumper depuis le poste", en: "Fadeaway jumper from post" }, durationMin: 10, type: "reps", reps: 8, sets: 4, difficulty: 5, tips: { fr: "Épaule en arrière, hauteur de relâche", en: "Shoulder back, release height" } },
      { id: "sh-a4", name: { fr: "100 LF en 20 min", en: "100 FTs in 20 min" }, description: { fr: "Vise 85%+ pour valider", en: "Aim for 85%+ to pass" }, durationMin: 20, type: "reps", reps: 100, sets: 1, difficulty: 4, tips: { fr: "Routine et mental sous fatigue", en: "Routine and mental under fatigue" } },
    ],
  },
  handling: {
    beginner: [
      { id: "ha-b1", name: { fr: "Dribble stationnaire", en: "Stationary dribble" }, description: { fr: "Main droite puis gauche, 30s chaque", en: "Right then left hand, 30s each" }, durationMin: 5, type: "time", seconds: 30, sets: 8, difficulty: 1, tips: { fr: "Balle basse, tête haute", en: "Low ball, head up" } },
      { id: "ha-b2", name: { fr: "Figure 8", en: "Figure 8" }, description: { fr: "Dribble en 8 entre les jambes", en: "Dribble in 8 between legs" }, durationMin: 6, type: "time", seconds: 30, sets: 6, difficulty: 2, tips: { fr: "Rythme constant", en: "Steady rhythm" } },
      { id: "ha-b3", name: { fr: "Crossover marche", en: "Walking crossover" }, description: { fr: "Crossover en marchant", en: "Crossover while walking" }, durationMin: 7, type: "reps", reps: 20, sets: 3, difficulty: 2, tips: { fr: "Main opposée avant le changement", en: "Opposite hand before change" } },
    ],
    intermediate: [
      { id: "ha-i1", name: { fr: "Two-ball dribble", en: "Two-ball dribble" }, description: { fr: "2 ballons simultanés, hauteur variable", en: "2 balls simultaneously, varying height" }, durationMin: 8, type: "time", seconds: 30, sets: 8, difficulty: 4, tips: { fr: "Si tu perds un, continue l'autre", en: "If you lose one, keep going with other" } },
      { id: "ha-i2", name: { fr: "Behind-the-back en mouvement", en: "Moving behind-the-back" }, description: { fr: "BTB dribble sur longueur du terrain", en: "BTB dribble court length" }, durationMin: 7, type: "reps", reps: 8, sets: 4, difficulty: 3, tips: { fr: "Élan naturel, pas forcé", en: "Natural momentum, not forced" } },
      { id: "ha-i3", name: { fr: "Hesitation pull-back", en: "Hesi pull-back" }, description: { fr: "Hésitation puis recul pour créer l'espace", en: "Hesi then pull-back to create space" }, durationMin: 8, type: "reps", reps: 10, sets: 4, difficulty: 4, tips: { fr: "Vendre la feinte avec les yeux", en: "Sell fake with eyes" } },
      { id: "ha-i4", name: { fr: "Spider dribble", en: "Spider dribble" }, description: { fr: "Dribble rapide alterné devant-soi", en: "Quick alternating dribble in front" }, durationMin: 5, type: "time", seconds: 20, sets: 6, difficulty: 4, tips: { fr: "Mains près du sol", en: "Hands close to floor" } },
    ],
    advanced: [
      { id: "ha-a1", name: { fr: "Combo moves à pleine vitesse", en: "Full-speed combo moves" }, description: { fr: "Crossover + BTB + spin en mouvement", en: "Crossover + BTB + spin moving" }, durationMin: 10, type: "reps", reps: 6, sets: 5, difficulty: 5, tips: { fr: "Vitesse de jeu réelle", en: "Real game speed" } },
      { id: "ha-a2", name: { fr: "Two-ball obstacle course", en: "Two-ball obstacle course" }, description: { fr: "2 ballons à travers cônes avec changements", en: "2 balls through cones with changes" }, durationMin: 12, type: "reps", reps: 4, sets: 4, difficulty: 5, tips: { fr: "Si tu perds un, reprends immédiatement", en: "If lost, pick up immediately" } },
      { id: "ha-a3", name: { fr: "Tennis ball toss + dribble", en: "Tennis toss + dribble" }, description: { fr: "Dribble en attrapant balle de tennis", en: "Dribble while catching tennis ball" }, durationMin: 8, type: "time", seconds: 30, sets: 8, difficulty: 5, tips: { fr: "Tête haute en permanence", en: "Head up at all times" } },
    ],
  },
  finishing: {
    beginner: [
      { id: "fi-b1", name: { fr: "Mikan drill", en: "Mikan drill" }, description: { fr: "Layups alternés main droite/gauche", en: "Alternating right/left layups" }, durationMin: 6, type: "reps", reps: 20, sets: 2, difficulty: 2, tips: { fr: "Pas d'appui, finish main opposée", en: "One step, opposite-hand finish" } },
      { id: "fi-b2", name: { fr: "Layups puissance", en: "Power layups" }, description: { fr: "Layups à 2 mains au cercle", en: "Two-hand layups at rim" }, durationMin: 5, type: "reps", reps: 15, sets: 2, difficulty: 1, tips: { fr: "Protection de balle", en: "Ball protection" } },
      { id: "fi-b3", name: { fr: "Reverse layups", en: "Reverse layups" }, description: { fr: "Layups revers côté opposé", en: "Reverse layups other side" }, durationMin: 7, type: "reps", reps: 10, sets: 3, difficulty: 2, tips: { fr: "Sortir le ballon loin du défenseur", en: "Take ball away from defender" } },
    ],
    intermediate: [
      { id: "fi-i1", name: { fr: "Euro-step layups", en: "Euro-step layups" }, description: { fr: "Euro-step à pleine vitesse", en: "Full-speed euro-step" }, durationMin: 8, type: "reps", reps: 8, sets: 4, difficulty: 3, tips: { fr: "Premier pas large pour vendre la feinte", en: "Wide first step to sell fake" } },
      { id: "fi-i2", name: { fr: "Pro hop layups", en: "Pro hop layups" }, description: { fr: "Jump-stop + finish", en: "Jump-stop + finish" }, durationMin: 7, type: "reps", reps: 10, sets: 3, difficulty: 3, tips: { fr: "Saute à 2 pieds pour la puissance", en: "Jump 2 feet for power" } },
      { id: "fi-i3", name: { fr: "Floaters main faible", en: "Weak-hand floaters" }, description: { fr: "Floater main gauche (ou droite si gaucher)", en: "Left-hand floater (or right if lefty)" }, durationMin: 8, type: "reps", reps: 8, sets: 4, difficulty: 4, tips: { fr: "Hauteur de relâche haute", en: "High release point" } },
      { id: "fi-i4", name: { fr: "And-1 finishes contact", en: "Contact and-1 finishes" }, description: { fr: "Layups avec contact (coussin)", en: "Layups with contact (pad)" }, durationMin: 10, type: "reps", reps: 10, sets: 3, difficulty: 4, tips: { fr: "Absorbe le contact puis finis", en: "Absorb contact then finish" } },
    ],
    advanced: [
      { id: "fi-a1", name: { fr: "Reverse euro-step", en: "Reverse euro-step" }, description: { fr: "Euro-step reverse vers le cercle", en: "Euro-step reverse to rim" }, durationMin: 10, type: "reps", reps: 6, sets: 4, difficulty: 5, tips: { fr: "Changement de direction explosif", en: "Explosive direction change" } },
      { id: "fi-a2", name: { fr: "Step-through + finish", en: "Step-through + finish" }, description: { fr: "Pas à travers le défenseur après contact", en: "Step through defender after contact" }, durationMin: 8, type: "reps", reps: 8, sets: 4, difficulty: 5, tips: { fr: "Lire l'épaule du défenseur", en: "Read defender's shoulder" } },
      { id: "fi-a3", name: { fr: "Contact layups intensifs", en: "Intensive contact layups" }, description: { fr: "Avec défenseur + contact, finis des 2 mains", en: "With defender + contact, both hands" }, durationMin: 12, type: "reps", reps: 12, sets: 4, difficulty: 5, tips: { fr: "Maintenir la balle haute", en: "Keep ball high" } },
    ],
  },
  footwork: {
    beginner: [
      { id: "fo-b1", name: { fr: "Jump stops", en: "Jump stops" }, description: { fr: "Saut à 2 pieds à chaque arrêt", en: "Two-foot hop at each stop" }, durationMin: 5, type: "reps", reps: 20, sets: 2, difficulty: 1, tips: { fr: "Équilibre parfait à l'atterrissage", en: "Perfect balance on landing" } },
      { id: "fo-b2", name: { fr: "Pivot avant/arrière", en: "Forward/reverse pivot" }, description: { fr: "Pivots sur pied de pivot", en: "Pivots on pivot foot" }, durationMin: 6, type: "reps", reps: 15, sets: 3, difficulty: 2, tips: { fr: "Pied de pivot collé au sol", en: "Pivot foot glued to floor" } },
      { id: "fo-b3", name: { fr: "Échelle d'agilité", en: "Agility ladder" }, description: { fr: "Pattern rapide à l'échelle", en: "Quick pattern on ladder" }, durationMin: 7, type: "time", seconds: 30, sets: 6, difficulty: 2, tips: { fr: "Sur la plante des pieds", en: "On balls of feet" } },
    ],
    intermediate: [
      { id: "fo-i1", name: { fr: "Jab series", en: "Jab series" }, description: { fr: "Jab step + shoot / drive / pass", en: "Jab step + shoot / drive / pass" }, durationMin: 10, type: "reps", reps: 12, sets: 3, difficulty: 3, tips: { fr: "Lire la défense après le jab", en: "Read defense after jab" } },
      { id: "fo-i2", name: { fr: "Cone drills changements direction", en: "Cone change-of-direction" }, description: { fr: "Slalom cônes avec variations", en: "Cone slalom with variations" }, durationMin: 8, type: "reps", reps: 6, sets: 4, difficulty: 3, tips: { fr: "Couper court autour des cônes", en: "Cut tight around cones" } },
      { id: "fo-i3", name: { fr: "Defensive slides", en: "Defensive slides" }, description: { fr: "Slides défensifs largeur terrain", en: "Defensive slides court width" }, durationMin: 7, type: "reps", reps: 10, sets: 3, difficulty: 3, tips: { fr: "Ne croise pas les pieds", en: "Don't cross feet" } },
      { id: "fo-i4", name: { fr: "Drop step post", en: "Post drop step" }, description: { fr: "Drop step vers le cercle", en: "Drop step to rim" }, durationMin: 8, type: "reps", reps: 10, sets: 4, difficulty: 3, tips: { fr: "Épaule basse, contact puis finis", en: "Low shoulder, contact then finish" } },
    ],
    advanced: [
      { id: "fo-a1", name: { fr: "Dream shake combo", en: "Dream shake combo" }, description: { fr: "Up-and-under + spin", en: "Up-and-under + spin" }, durationMin: 12, type: "reps", reps: 8, sets: 4, difficulty: 5, tips: { fr: "Vendre chaque feinte", en: "Sell every fake" } },
      { id: "fo-a2", name: { fr: "Closeout defensive", en: "Defensive closeout" }, description: { fr: "Sprint + slide défensif réaliste", en: "Sprint + realistic defensive slide" }, durationMin: 10, type: "reps", reps: 10, sets: 4, difficulty: 4, tips: { fr: "Main haute, pieds bas", en: "Hand high, feet low" } },
      { id: "fo-a3", name: { fr: "Footwork combo poste", en: "Post footwork combo" }, description: { fr: "Drop step + up-and-under + fadeaway", en: "Drop step + up-and-under + fadeaway" }, durationMin: 12, type: "reps", reps: 6, sets: 4, difficulty: 5, tips: { fr: "Enchaînement fluide", en: "Fluid sequence" } },
    ],
  },
  defense: {
    beginner: [
      { id: "de-b1", name: { fr: "Stance défensive", en: "Defensive stance" }, description: { fr: "Maintenir la stance 30s", en: "Hold stance 30s" }, durationMin: 5, type: "time", seconds: 30, sets: 6, difficulty: 1, tips: { fr: "Bas, mains actives", en: "Low, active hands" } },
      { id: "de-b2", name: { fr: "Slides latéraux", en: "Lateral slides" }, description: { fr: "Slides gauche-droite largeur", en: "Left-right slides width" }, durationMin: 6, type: "reps", reps: 10, sets: 3, difficulty: 2, tips: { fr: "Pas de croisement", en: "No crossing" } },
      { id: "de-b3", name: { fr: "Closeout simple", en: "Simple closeout" }, description: { fr: "Sprint + contrôle au tireur", en: "Sprint + control to shooter" }, durationMin: 7, type: "reps", reps: 10, sets: 3, difficulty: 2, tips: { fr: "Main haute sur les derniers pas", en: "High hand on last steps" } },
    ],
    intermediate: [
      { id: "de-i1", name: { fr: "1v1 défense périmètre", en: "1v1 perimeter defense" }, description: { fr: "Défense 1v1 contre attaquant", en: "1v1 defense vs attacker" }, durationMin: 10, type: "reps", reps: 10, sets: 3, difficulty: 4, tips: { fr: "Forcer vers l'aide", en: "Force toward help" } },
      { id: "de-i2", name: { fr: "Help & recover", en: "Help & recover" }, description: { fr: "Aide puis retour sur ton homme", en: "Help then return to your man" }, durationMin: 8, type: "reps", reps: 8, sets: 4, difficulty: 4, tips: { fr: "Communication voix haute", en: "Loud communication" } },
      { id: "de-i3", name: { fr: "Steal drills", en: "Steal drills" }, description: { fr: "Interceptions sur passes et dribbles", en: "Interceptions on passes and dribbles" }, durationMin: 7, type: "reps", reps: 12, sets: 3, difficulty: 3, tips: { fr: "Lire les yeux du porteur", en: "Read ball handler's eyes" } },
      { id: "de-i4", name: { fr: "Post defense", en: "Post defense" }, description: { fr: "Défense poste bas contre intérieur", en: "Low post defense vs big" }, durationMin: 8, type: "reps", reps: 8, sets: 4, difficulty: 3, tips: { fr: "3/4 deny avant la passe", en: "3/4 deny before pass" } },
    ],
    advanced: [
      { id: "de-a1", name: { fr: "Switches défensifs", en: "Defensive switches" }, description: { fr: "Switchs sur écrans, tout poste", en: "Switch on screens, all positions" }, durationMin: 10, type: "reps", reps: 10, sets: 4, difficulty: 5, tips: { fr: "Communiquer avant l'écran", en: "Communicate before screen" } },
      { id: "de-a2", name: { fr: "Recovery 2v1", en: "2v1 recovery" }, description: { fr: "Aide puis sprint pour revenir 2v1", en: "Help then sprint back 2v1" }, durationMin: 10, type: "reps", reps: 8, sets: 4, difficulty: 5, tips: { fr: "Vitesse de récupération max", en: "Max recovery speed" } },
      { id: "de-a3", name: { fr: "Lockdown 1v1 intensif", en: "Intensive 1v1 lockdown" }, description: { fr: "10 possessions défense complète", en: "10 full defense possessions" }, durationMin: 12, type: "reps", reps: 10, sets: 1, difficulty: 5, tips: { fr: "Aucun layup facile", en: "No easy layups" } },
    ],
  },
  conditioning: {
    beginner: [
      { id: "co-b1", name: { fr: "Jogging 10 min", en: "10-min jog" }, description: { fr: "Footing léger", en: "Light jog" }, durationMin: 10, type: "time", seconds: 600, sets: 1, difficulty: 1, tips: { fr: "Respire par le nez", en: "Breathe through nose" } },
      { id: "co-b2", name: { fr: "Sauts à la corde", en: "Jump rope" }, description: { fr: "Corde à sauter 30s x 8", en: "Jump rope 30s x 8" }, durationMin: 6, type: "time", seconds: 30, sets: 8, difficulty: 2, tips: { fr: "Sur la plante des pieds", en: "On balls of feet" } },
      { id: "co-b3", name: { fr: "Squats au poids du corps", en: "Bodyweight squats" }, description: { fr: "3x15 squats", en: "3x15 squats" }, durationMin: 6, type: "reps", reps: 15, sets: 3, difficulty: 2, tips: { fr: "Dos droit, genoux alignés", en: "Straight back, aligned knees" } },
    ],
    intermediate: [
      { id: "co-i1", name: { fr: "Sprints 17 (lignes)", en: "17 sidelines" }, description: { fr: "17 allers-retours ligne de fond en 1 min", en: "17 baseline sidelines in 1 min" }, durationMin: 8, type: "reps", reps: 17, sets: 3, difficulty: 4, tips: { fr: "Vitesse max sur chaque sprint", en: "Max speed every sprint" } },
      { id: "co-i2", name: { fr: "Suicides", en: "Suicides" }, description: { fr: "5 lignes (close, FT, mid, 3PT, half)", en: "5 lines (close, FT, mid, 3PT, half)" }, durationMin: 8, type: "reps", reps: 5, sets: 4, difficulty: 4, tips: { fr: "Toucher la ligne complète", en: "Touch line fully" } },
      { id: "co-i3", name: { fr: "Burpees basket", en: "Basketball burpees" }, description: { fr: "Burpee + saut + tir imaginaire", en: "Burpee + jump + imaginary shot" }, durationMin: 7, type: "reps", reps: 10, sets: 3, difficulty: 4, tips: { fr: "Explosivité sur le saut", en: "Explosive on the jump" } },
      { id: "co-i4", name: { fr: "Mountain climbers", en: "Mountain climbers" }, description: { fr: "30s x 6 séries", en: "30s x 6 sets" }, durationMin: 5, type: "time", seconds: 30, sets: 6, difficulty: 3, tips: { fr: "Genoux hauts", en: "Knees high" } },
    ],
    advanced: [
      { id: "co-a1", name: { fr: "Hero runs (3⁄4 terrain)", en: "Hero runs (3/4 court)" }, description: { fr: "Sprint 3/4 terrain en 3s, 10 reps", en: "3/4 court sprint in 3s, 10 reps" }, durationMin: 10, type: "reps", reps: 10, sets: 3, difficulty: 5, tips: { fr: "Récupération active entre les reps", en: "Active recovery between reps" } },
      { id: "co-a2", name: { fr: "Plyo box jumps", en: "Plyo box jumps" }, description: { fr: "5x10 sauts en hauteur", en: "5x10 vertical jumps" }, durationMin: 10, type: "reps", reps: 10, sets: 5, difficulty: 5, tips: { fr: "Atterrissage souple", en: "Soft landing" } },
      { id: "co-a3", name: { fr: "Full court intervals", en: "Full court intervals" }, description: { fr: "30s sprint + 30s repos x 15", en: "30s sprint + 30s rest x 15" }, durationMin: 15, type: "time", seconds: 30, sets: 15, difficulty: 5, tips: { fr: "Maintenir l'intensité", en: "Maintain intensity" } },
    ],
  },
  pocketBall: {
    beginner: [
      { id: "po-b1", name: { fr: "Dribble pocket stationnaire", en: "Stationary pocket dribble" }, description: { fr: "Dribble bas en position pocket, 30s chaque main", en: "Low pocket dribble, 30s each hand" }, durationMin: 5, type: "time", seconds: 30, sets: 6, difficulty: 1, tips: { fr: "Garde la balle au niveau de la hanche, poignets actifs", en: "Keep ball at hip level, active wrists" } },
      { id: "po-b2", name: { fr: "Pound dribble bas", en: "Low pound dribble" }, description: { fr: "Dribble pound très bas, 20s chaque main", en: "Very low pound dribble, 20s each hand" }, durationMin: 5, type: "time", seconds: 20, sets: 8, difficulty: 1, tips: { fr: "Frappe la balle fort, garde la tête haute", en: "Pound the ball hard, keep head up" } },
      { id: "po-b3", name: { fr: "Figure 8 bas", en: "Figure 8 low" }, description: { fr: "Figure 8 en dribble bas entre les jambes", en: "Low dribble figure 8 between legs" }, durationMin: 6, type: "time", seconds: 30, sets: 6, difficulty: 2, tips: { fr: "Balle toujours sous les genoux", en: "Ball always below the knees" } },
    ],
    intermediate: [
      { id: "po-i1", name: { fr: "Pocket crossover combo", en: "Pocket crossover combo" }, description: { fr: "Crossover bas en position pocket enchaîné", en: "Chained low pocket crossover" }, durationMin: 7, type: "reps", reps: 12, sets: 4, difficulty: 3, tips: { fr: "Reste bas, change de main rapide", en: "Stay low, quick hand change" } },
      { id: "po-i2", name: { fr: "Two-ball contrôle bas", en: "Two-ball low control" }, description: { fr: "2 ballons en dribble bas simultané", en: "2 balls simultaneous low dribble" }, durationMin: 8, type: "time", seconds: 30, sets: 8, difficulty: 4, tips: { fr: "Hauteur constante, pas au-dessus des genoux", en: "Constant height, no higher than knees" } },
      { id: "po-i3", name: { fr: "In-and-out pocket", en: "In-and-out pocket" }, description: { fr: "In-and-out dribble en position pocket", en: "In-and-out dribble from pocket position" }, durationMin: 7, type: "reps", reps: 10, sets: 4, difficulty: 3, tips: { fr: "Vends la feinte avec l'épaule", en: "Sell the fake with your shoulder" } },
    ],
    advanced: [
      { id: "po-a1", name: { fr: "Pocket contrôle pleine vitesse", en: "Full-speed pocket control" }, description: { fr: "Dribble pocket en sprint sur demi-terrain", en: "Pocket dribble sprinting half court" }, durationMin: 8, type: "reps", reps: 8, sets: 4, difficulty: 5, tips: { fr: "Contrôle total à haute vitesse, balle protégée", en: "Total control at high speed, ball protected" } },
      { id: "po-a2", name: { fr: "Two-ball pocket avec mouvement", en: "Two-ball pocket with movement" }, description: { fr: "2 ballons pocket en slalom entre cônes", en: "2 balls pocket slalom through cones" }, durationMin: 10, type: "reps", reps: 6, sets: 4, difficulty: 5, tips: { fr: "Si tu perds un ballon, reprends immédiatement", en: "If you lose a ball, pick up immediately" } },
      { id: "po-a3", name: { fr: "Dribble pocket les yeux fermés", en: "Blind pocket dribble" }, description: { fr: "Dribble pocket stationnaire yeux fermés", en: "Stationary pocket dribble eyes closed" }, durationMin: 7, type: "time", seconds: 30, sets: 8, difficulty: 5, tips: { fr: "Ressens la balle, confiance dans le toucher", en: "Feel the ball, trust your touch" } },
    ],
  },
  shifty: {
    beginner: [
      { id: "sh-b1", name: { fr: "Slides latéraux basiques", en: "Lateral slides basic" }, description: { fr: "Slides gauche-droite sur 5m, aller-retour", en: "Left-right slides 5m, back and forth" }, durationMin: 6, type: "reps", reps: 10, sets: 3, difficulty: 1, tips: { fr: "Pieds ne se croisent jamais, reste bas", en: "Feet never cross, stay low" } },
      { id: "sh-b2", name: { fr: "Shuffle côté-à-côté", en: "Side-to-side shuffle" }, description: { fr: "Shuffle rapide entre deux points", en: "Quick shuffle between two points" }, durationMin: 5, type: "time", seconds: 20, sets: 8, difficulty: 2, tips: { fr: "Poids sur la plante des pieds", en: "Weight on balls of feet" } },
      { id: "sh-b3", name: { fr: "Zig-zag marche", en: "Zig-zag walking" }, description: { fr: "Marche en zig-zag entre 5 cônes", en: "Walk zig-zag between 5 cones" }, durationMin: 6, type: "reps", reps: 6, sets: 3, difficulty: 1, tips: { fr: "Change de direction avec le pied extérieur", en: "Change direction with outside foot" } },
    ],
    intermediate: [
      { id: "sh-i1", name: { fr: "Crossover step slide", en: "Crossover step slide" }, description: { fr: "Crossover step puis slide défensif", en: "Crossover step then defensive slide" }, durationMin: 8, type: "reps", reps: 10, sets: 4, difficulty: 3, tips: { fr: "Transition fluide entre steps", en: "Smooth transition between steps" } },
      { id: "sh-i2", name: { fr: "Jab step série", en: "Jab step series" }, description: { fr: "Jab gauche, droite, pump fake enchaînés", en: "Jab left, right, pump fake chained" }, durationMin: 8, type: "reps", reps: 12, sets: 3, difficulty: 4, tips: { fr: "Chaque jab doit vendre une intention", en: "Every jab must sell an intention" } },
      { id: "sh-i3", name: { fr: "Slide défensif + sprint", en: "Defensive slide sprint" }, description: { fr: "2 slides puis sprint en changement de direction", en: "2 slides then sprint direction change" }, durationMin: 7, type: "reps", reps: 8, sets: 4, difficulty: 3, tips: { fr: "Explose sur le sprint après les slides", en: "Explode on sprint after slides" } },
    ],
    advanced: [
      { id: "sh-a1", name: { fr: "Combo shifty pleine vitesse", en: "Full-speed shifty combo" }, description: { fr: "Enchaîne 5 changements de direction à max vitesse", en: "Chain 5 direction changes at max speed" }, durationMin: 10, type: "reps", reps: 6, sets: 4, difficulty: 5, tips: { fr: "Chaque changement doit être explosif", en: "Every change must be explosive" } },
      { id: "sh-a2", name: { fr: "Chair drill changement direction", en: "Chair drill (change direction off cones)" }, description: { fr: "Sprint vers cône, changement de direction, sprint", en: "Sprint to cone, change direction, sprint" }, durationMin: 10, type: "reps", reps: 8, sets: 4, difficulty: 5, tips: { fr: "Coude bas, corps incliné dans la direction", en: "Low shoulder, body leaning into direction" } },
      { id: "sh-a3", name: { fr: "Slides en réaction", en: "Reaction slides" }, description: { fr: "Slides directionnels sur signal visuel ou sonore", en: "Directional slides on visual or audio cue" }, durationMin: 8, type: "time", seconds: 20, sets: 10, difficulty: 5, tips: { fr: "Réaction instantanée, pas d'anticipation", en: "Instant reaction, no anticipation" } },
    ],
  },
  speedChange: {
    beginner: [
      { id: "sc-b1", name: { fr: "Marche-jog-sprint", en: "Walk-jog-sprint" }, description: { fr: "3 phases de vitesse sur 15m, puis retour", en: "3 speed phases over 15m, then return" }, durationMin: 6, type: "reps", reps: 6, sets: 3, difficulty: 1, tips: { fr: "Transition progressive entre chaque phase", en: "Gradual transition between each phase" } },
      { id: "sc-b2", name: { fr: "Stop-start basique", en: "Stop-start basic" }, description: { fr: "Sprint 5m, arrêt net, repars en sprint", en: "Sprint 5m, dead stop, sprint again" }, durationMin: 5, type: "reps", reps: 10, sets: 3, difficulty: 2, tips: { fr: "Changement brusque, pieds bien plantés", en: "Abrupt change, feet firmly planted" } },
      { id: "sc-b3", name: { fr: "Hésitation en marchant", en: "Hesitation walk" }, description: { fr: "Marche, pause nette 1s, repars en marchant", en: "Walk, hard stop 1s, resume walking" }, durationMin: 5, type: "time", seconds: 30, sets: 6, difficulty: 1, tips: { fr: "Vends l'arrêt comme si tu allais tirer", en: "Sell the stop like you're about to shoot" } },
    ],
    intermediate: [
      { id: "sc-i1", name: { fr: "Sprint-décélère-sprint", en: "Sprint-decelerate-sprint" }, description: { fr: "Sprint 10m, ralentis à contrôle, resprint", en: "Sprint 10m, decelerate to control, re-sprint" }, durationMin: 8, type: "reps", reps: 8, sets: 4, difficulty: 3, tips: { fr: "Décélération contrôlée sans perdre l'équilibre", en: "Controlled deceleration without losing balance" } },
      { id: "sc-i2", name: { fr: "Hesitation crossover", en: "Hesitation crossover" }, description: { fr: "Sprint, hésitation, crossover, re-sprint", en: "Sprint, hesitation, crossover, re-sprint" }, durationMin: 8, type: "reps", reps: 10, sets: 3, difficulty: 4, tips: { fr: "La pause doit durer une fraction de seconde", en: "The pause should last a fraction of a second" } },
      { id: "sc-i3", name: { fr: "Layup line changement vitesse", en: "Speed change layup line" }, description: { fr: "Layup line avec variations de vitesse", en: "Layup line with speed variations" }, durationMin: 10, type: "reps", reps: 12, sets: 3, difficulty: 3, tips: { fr: "Accélère après le dribble de ralentissement", en: "Accelerate after the slow-down dribble" } },
    ],
    advanced: [
      { id: "sc-a1", name: { fr: "Changements vitesse terrain entier", en: "Full court speed changes" }, description: { fr: "4-5 changements de vitesse sur pleine longueur", en: "4-5 speed changes full court length" }, durationMin: 10, type: "reps", reps: 6, sets: 4, difficulty: 5, tips: { fr: "Chaque changement doit tromper le défenseur", en: "Every change must fool the defender" } },
      { id: "sc-a2", name: { fr: "Accélération en réaction", en: "Reaction acceleration" }, description: { fr: "Sur signal, passe de 0 à vitesse max instantanément", en: "On cue, go from 0 to max speed instantly" }, durationMin: 8, type: "time", seconds: 10, sets: 15, difficulty: 5, tips: { fr: "Premier pas explosif vers l'avant", en: "Explosive first step forward" } },
      { id: "sc-a3", name: { fr: "Stop-and-go game speed", en: "Game-speed stop-and-go" }, description: { fr: "Sequence complète : sprint, stop, hesi, re-sprint, layup", en: "Full sequence: sprint, stop, hesi, re-sprint, layup" }, durationMin: 12, type: "reps", reps: 8, sets: 4, difficulty: 5, tips: { fr: "Simulation de possession réelle", en: "Simulate real game possession" } },
    ],
  },
};

const PLAN_META: Record<PlanType, { titlePrefix: { fr: string; en: string }; desc: { fr: string; en: string } }> = {
  shooting: {
    titlePrefix: { fr: "Sniper Session", en: "Sniper Session" },
    desc: { fr: "Améliore ton tir à tous les niveaux : mécanique, vitesse de relâche, game-speed.", en: "Improve your shooting at all levels: mechanics, release speed, game-speed." },
  },
  handling: {
    titlePrefix: { fr: "Ball Wizard", en: "Ball Wizard" },
    desc: { fr: "Maîtrise le maniement de balle à deux mains, mouvement et vitesse de jeu.", en: "Master two-hand ball handling, on the move, at game speed." },
  },
  finishing: {
    titlePrefix: { fr: "Paint Touch", en: "Paint Touch" },
    desc: { fr: "Finition au cercle sous contact, layups avancés et game-speed finishes.", en: "Finishing at the rim under contact, advanced layups and game-speed finishes." },
  },
  footwork: {
    titlePrefix: { fr: "Footwork Lab", en: "Footwork Lab" },
    desc: { fr: "Appuis, pivots, jabs et déplacements défensifs — la base de tout.", en: "Footwork, pivots, jabs and defensive movement — the foundation." },
  },
  defense: {
    titlePrefix: { fr: "Lockdown Lab", en: "Lockdown Lab" },
    desc: { fr: "Slides, closeouts, help defense — deviens un verrou défensif.", en: "Slides, closeouts, help defense — become a lockdown defender." },
  },
  conditioning: {
    titlePrefix: { fr: "Engine Build", en: "Engine Build" },
    desc: { fr: "Cardio basket, explosivité et résistance pour tenir tout le match.", en: "Basketball cardio, explosiveness and endurance to last the whole game." },
  },
  pocketBall: {
    titlePrefix: { fr: "Pocket Mastery", en: "Pocket Mastery" },
    desc: { fr: "Contrôle de balle en position pocket : dribble bas, protection et maniement serré.", en: "Pocket ball control: low dribble, ball protection and tight handling." },
  },
  shifty: {
    titlePrefix: { fr: "Shifty Lab", en: "Shifty Lab" },
    desc: { fr: "Changements de direction explosifs, slides latéraux et mouvement shifty.", en: "Explosive direction changes, lateral slides and shifty movement." },
  },
  speedChange: {
    titlePrefix: { fr: "Speed Gear", en: "Speed Gear" },
    desc: { fr: "Maîtrise des changements de vitesse : accélération, décélération et hésitation.", en: "Speed change mastery: acceleration, deceleration and hesitation." },
  },
};

const LEVEL_MULTIPLIER: Record<"beginner" | "intermediate" | "advanced", number> = {
  beginner: 1,
  intermediate: 1.5,
  advanced: 2,
};

export function generatePlan(type: PlanType, level: "beginner" | "intermediate" | "advanced"): SmartPlan {
  const drills = DRILL_LIBRARY[type][level];
  const totalDurationMin = drills.reduce((acc, d) => acc + d.durationMin, 0);
  const xpReward = Math.round(50 * LEVEL_MULTIPLIER[level] + totalDurationMin * 3);
  const meta = PLAN_META[type];

  return {
    id: `plan_${type}_${level}_${Date.now()}`,
    type,
    level,
    title: { fr: `${meta.titlePrefix.fr} · ${level === "beginner" ? "Débutant" : level === "intermediate" ? "Intermédiaire" : "Avancé"}`, en: `${meta.titlePrefix.en} · ${level === "beginner" ? "Beginner" : level === "intermediate" ? "Intermediate" : "Advanced"}` },
    description: meta.desc,
    totalDurationMin,
    xpReward,
    drills,
    createdAt: new Date().toISOString(),
  };
}

export function getDrillById(drillId: string): Drill | null {
  for (const levelGroups of Object.values(DRILL_LIBRARY)) {
    for (const drills of Object.values(levelGroups)) {
      const found = drills.find((d) => d.id === drillId);
      if (found) return found;
    }
  }
  return null;
}

export function recommendedPlan(skill: SkillKey, currentLevel: number): { type: PlanType; level: "beginner" | "intermediate" | "advanced" } {
  let planType: PlanType =
    skill === "shooting" ? "shooting" :
    skill === "defense" ? "defense" :
    skill === "iq" ? "footwork" : "handling";
  // Specialized sub-plans for handling and finishing
  if (skill === "handling") {
    planType = currentLevel < 40 ? "handling" : currentLevel < 60 ? "pocketBall" : "shifty";
  } else if (skill === "finishing") {
    planType = currentLevel < 50 ? "finishing" : "speedChange";
  }
  const level: "beginner" | "intermediate" | "advanced" =
    currentLevel < 40 ? "beginner" : currentLevel < 70 ? "intermediate" : "advanced";
  return { type: planType, level };
}
