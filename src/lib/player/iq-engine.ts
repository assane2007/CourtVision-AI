// Player IQ™ Engine
// Skill DNA (5 axes), Archetype classifier, Weakness Detector, NBA Comparison

export type SkillKey = "shooting" | "handling" | "finishing" | "defense" | "iq";

export const SKILL_KEYS: SkillKey[] = ["shooting", "handling", "finishing", "defense", "iq"];

export const SKILL_META: Record<SkillKey, { label: { fr: string; en: string }; color: string; icon: string }> = {
  shooting:  { label: { fr: "Tir",        en: "Shooting"   }, color: "neon-cyan",    icon: "🎯" },
  handling:  { label: { fr: "Maniement",  en: "Handling"   }, color: "neon-magenta", icon: "🌀" },
  finishing: { label: { fr: "Finition",   en: "Finishing"  }, color: "neon-lime",    icon: "💥" },
  defense:   { label: { fr: "Défense",    en: "Defense"    }, color: "neon-orange",  icon: "🛡️" },
  iq:        { label: { fr: "QI Basket",  en: "BBall IQ"   }, color: "neon-cyan",    icon: "🧠" },
};

export type SkillDNA = Record<SkillKey, number>; // 0-100

export type Archetype = {
  id: string;
  name: { fr: string; en: string };
  emoji: string;
  description: { fr: string; en: string };
  strengths: SkillKey[];
  weaknesses: SkillKey[];
  // NBA player archetype comparison
  nbaComparison: { playerId: string; reason: { fr: string; en: string } };
};

// 12 archetypes covering most playstyles
export const ARCHETYPES: Archetype[] = [
  {
    id: "sharpshooter",
    name: { fr: "Tireur d'élite", en: "Sharpshooter" },
    emoji: "🎯",
    description: { fr: "Sniper à 3 points. Menace prioritaire derrière l'arc.", en: "3-point sniper. Top threat beyond the arc." },
    strengths: ["shooting", "iq"],
    weaknesses: ["defense", "finishing"],
    nbaComparison: { playerId: "curry", reason: { fr: "Tir à 3 longue distance et jeu hors-ballon", en: "Deep range shooting and off-ball movement" } },
  },
  {
    id: "slashermaker",
    name: { fr: "Pénétrateur-playmaker", en: "Slasher Playmaker" },
    emoji: "🌀",
    description: { fr: "Crée pour les autres tout en attaquant le cercle.", en: "Creates for others while attacking the rim." },
    strengths: ["handling", "iq"],
    weaknesses: ["shooting", "defense"],
    nbaComparison: { playerId: "hali", reason: { fr: "Vision de jeu d'élite et finition créative", en: "Elite court vision and creative finishing" } },
  },
  {
    id: "rimrunner",
    name: { fr: "Fonceur", en: "Rim Runner" },
    emoji: "💥",
    description: { fr: "Explose vers le cercle, dunks et contres.", en: "Explodes to the rim, dunks and blocks." },
    strengths: ["finishing", "defense"],
    weaknesses: ["shooting", "handling"],
    nbaComparison: { playerId: "ant", reason: { fr: "Athlétisme explosif et agressivité vers le cercle", en: "Explosive athleticism and rim aggressiveness" } },
  },
  {
    id: "lockdown",
    name: { fr: "Verrou défensif", en: "Lockdown Defender" },
    emoji: "🛡️",
    description: { fr: "Défenseur d'élite qui étouffe son adversaire.", en: "Elite defender who suffocates opponents." },
    strengths: ["defense", "iq"],
    weaknesses: ["shooting", "handling"],
    nbaComparison: { playerId: "kawhi", reason: { fr: "Défense polyvalente et QI basket exceptionnel", en: "Versatile defense and elite basketball IQ" } },
  },
  {
    id: "floorgeneral",
    name: { fr: "Meneur général", en: "Floor General" },
    emoji: "🧠",
    description: { fr: "Contrôle le tempo, lit la défense, orchestre l'attaque.", en: "Controls tempo, reads defense, orchestrates offense." },
    strengths: ["iq", "handling"],
    weaknesses: ["finishing", "defense"],
    nbaComparison: { playerId: "brunson", reason: { fr: "Leadership clutch et contrôle du jeu", en: "Clutch leadership and game control" } },
  },
  {
    id: "stretchbig",
    name: { fr: "Intérieur espaceur", en: "Stretch Big" },
    emoji: "🏔️",
    description: { fr: "Intérieur qui tire à 3 et protège le cercle.", en: "Big who shoots 3s and protects the rim." },
    strengths: ["shooting", "defense"],
    weaknesses: ["handling", "iq"],
    nbaComparison: { playerId: "chet", reason: { fr: "Taille + tir extérieur + protection de cercle", en: "Size + outside shooting + rim protection" } },
  },
  {
    id: "threed",
    name: { fr: "3&D Wing", en: "3&D Wing" },
    emoji: "⚔️",
    description: { fr: "Tireur à 3 et défenseur polyvalent.", en: "3-point shooter and versatile defender." },
    strengths: ["shooting", "defense"],
    weaknesses: ["handling", "finishing"],
    nbaComparison: { playerId: "brown", reason: { fr: "Combo d'élite tir-défense à l'aile", en: "Elite shoot-defense combo on the wing" } },
  },
  {
    id: "postscorer",
    name: { fr: "Scoreur poste bas", en: "Post Scorer" },
    emoji: "🪓",
    description: { fr: "Domine dans la raquette, footwork d'élite.", en: "Dominates in the paint, elite footwork." },
    strengths: ["finishing", "iq"],
    weaknesses: ["shooting", "handling"],
    nbaComparison: { playerId: "embiid", reason: { fr: "Scoreur poste bas dominant avec footwork d'élite", en: "Dominant post scorer with elite footwork" } },
  },
  {
    id: "doitall",
    name: { fr: "Polyvalent", en: "Do-It-All" },
    emoji: "⚡",
    description: { fr: "Aucune faiblesse majeure, profil équilibré.", en: "No major weakness, balanced profile." },
    strengths: ["iq", "shooting", "finishing"],
    weaknesses: [],
    nbaComparison: { playerId: "tatum", reason: { fr: "Polyvalence offensive et défensive à haut niveau", en: "Two-way versatility at a high level" } },
  },
  {
    id: "sparkplug",
    name: { fr: "Étincelle", en: "Sparkplug" },
    emoji: "🔥",
    description: { fr: "Scoreur instantané qui prend feu rapidement.", en: "Instant offense scorer who catches fire fast." },
    strengths: ["shooting", "finishing"],
    weaknesses: ["iq", "defense"],
    nbaComparison: { playerId: "trae", reason: { fr: "Scoreur explosif à longue distance et finition créative", en: "Explosive deep-range scorer and creative finisher" } },
  },
  {
    id: "rimprotector",
    name: { fr: "Protecteur de cercle", en: "Rim Protector" },
    emoji: "🦅",
    description: { fr: "Dernier rempart, contres et interceptions.", en: "Last line of defense, blocks and steals." },
    strengths: ["defense", "finishing"],
    weaknesses: ["shooting", "handling"],
    nbaComparison: { playerId: "wemby", reason: { fr: "Protection de cercle d'élite et finition au cercle", en: "Elite rim protection and inside finishing" } },
  },
  {
    id: "primaryballhandler",
    name: { fr: "Meneur principal", en: "Primary Ball Handler" },
    emoji: "🎩",
    description: { fr: "Manie le ballon, crée son tir et pour les autres.", en: "Handles the ball, creates own shot and for others." },
    strengths: ["handling", "shooting"],
    weaknesses: ["defense", "finishing"],
    nbaComparison: { playerId: "luka", reason: { fr: "Création de tir et maniement de ballon d'élite", en: "Elite shot creation and ball handling" } },
  },
];

export type Weakness = {
  skill: SkillKey;
  severity: "minor" | "moderate" | "critical";
  recommendation: { fr: string; en: string };
  planType: PlanType;
};

export type PlanType = "shooting" | "handling" | "finishing" | "footwork" | "defense" | "conditioning" | "pocketBall" | "shifty" | "speedChange";

export const PLAN_TYPES: { id: PlanType; label: { fr: string; en: string }; emoji: string; skill: SkillKey; color: string }[] = [
  { id: "shooting",    label: { fr: "Tir",          en: "Shooting"     }, emoji: "🎯", skill: "shooting",  color: "neon-cyan" },
  { id: "handling",    label: { fr: "Maniement",    en: "Handling"     }, emoji: "🌀", skill: "handling",  color: "neon-magenta" },
  { id: "finishing",   label: { fr: "Finition",     en: "Finishing"    }, emoji: "💥", skill: "finishing", color: "neon-lime" },
  { id: "footwork",    label: { fr: "Appuis",       en: "Footwork"     }, emoji: "🦶", skill: "iq",        color: "neon-orange" },
  { id: "defense",     label: { fr: "Défense",      en: "Defense"      }, emoji: "🛡️", skill: "defense",   color: "neon-cyan" },
  { id: "conditioning",label: { fr: "Condition",    en: "Conditioning" }, emoji: "⚡", skill: "iq",        color: "neon-magenta" },
  { id: "pocketBall",  label: { fr: "Pocket Ball",  en: "Pocket Ball"  }, emoji: "🤲", skill: "handling",  color: "neon-magenta" },
  { id: "shifty",      label: { fr: "Shifty",       en: "Shifty"       }, emoji: "🔀", skill: "handling",  color: "neon-magenta" },
  { id: "speedChange", label: { fr: "Changement de vitesse", en: "Speed Change" }, emoji: "🏎️", skill: "finishing", color: "neon-lime" },
];

// ============ CORE FUNCTIONS ============

export function classifyArchetype(dna: SkillDNA): Archetype {
  // Score each archetype by how well it matches the DNA
  let bestArchetype = ARCHETYPES[0];
  let bestScore = -Infinity;

  for (const arch of ARCHETYPES) {
    let score = 0;
    // Reward: high scores in strengths
    for (const s of arch.strengths) score += dna[s] * 1.5;
    // Penalize: high scores in weaknesses (we want weaknesses to actually be lower)
    for (const w of arch.weaknesses) score -= Math.max(0, dna[w] - 40) * 0.5;
    // Reward: balance — variance penalty
    const values = SKILL_KEYS.map((k) => dna[k]);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
    if (arch.id === "doitall") score -= variance * 0.3; // doitall wants balance
    else score += variance * 0.2; // specialists want differentiation

    if (score > bestScore) {
      bestScore = score;
      bestArchetype = arch;
    }
  }
  return bestArchetype;
}

export function detectWeaknesses(dna: SkillDNA): Weakness[] {
  const result: Weakness[] = [];
  for (const skill of SKILL_KEYS) {
    const value = dna[skill];
    if (value >= 65) continue;
    const severity: Weakness["severity"] = value < 35 ? "critical" : value < 50 ? "moderate" : "minor";
    const planType: PlanType =
      skill === "shooting" ? "shooting" :
      skill === "handling" ? "handling" :
      skill === "finishing" ? "finishing" :
      skill === "defense" ? "defense" : "footwork";
    const rec: { fr: string; en: string } =
      severity === "critical"
        ? { fr: `Compétence critique (${value}/100). Plan intensif recommandé.`, en: `Critical skill (${value}/100). Intensive plan recommended.` }
        : severity === "moderate"
        ? { fr: `Faiblesse modérée (${value}/100). Plan régulier conseillé.`, en: `Moderate weakness (${value}/100). Regular plan advised.` }
        : { fr: `Marge de progression (${value}/100). Plan d'entretien suffisant.`, en: `Room to grow (${value}/100). Maintenance plan enough.` };
    result.push({ skill, severity, recommendation: rec, planType });
  }
  return result.sort((a, b) => a.severity === "critical" ? -1 : b.severity === "critical" ? 1 : dna[a.skill] - dna[b.skill]);
}

export function nbaAverageDNA(): SkillDNA {
  // Average NBA player baseline (relative scale)
  return { shooting: 72, handling: 68, finishing: 70, defense: 65, iq: 70 };
}

export function skillOverall(dna: SkillDNA): number {
  return Math.round(SKILL_KEYS.reduce((sum, k) => sum + dna[k], 0) / SKILL_KEYS.length);
}

// XP & Level system
export type LevelInfo = { level: number; xp: number; xpToNext: number; title: { fr: string; en: string }; progress: number };

export function levelFromXP(totalXP: number): LevelInfo {
  // Levels: each level requires more XP. Level 1 starts at 0.
  // xpToNext at level L = 100 * L * 1.4^(L-1) (capped)
  let level = 1;
  let remaining = totalXP;
  while (remaining > 0) {
    const needed = Math.min(2000, Math.round(100 * level * Math.pow(1.4, level - 1)));
    if (remaining < needed) break;
    remaining -= needed;
    level++;
  }
  const needed = Math.min(2000, Math.round(100 * level * Math.pow(1.4, level - 1)));
  const progress = needed > 0 ? (remaining / needed) * 100 : 0;

  const titles = [
    { fr: "Rookie", en: "Rookie" },
    { fr: "Prospect", en: "Prospect" },
    { fr: "Starter", en: "Starter" },
    { fr: "Vétéran", en: "Veteran" },
    { fr: "All-Star", en: "All-Star" },
    { fr: "All-NBA", en: "All-NBA" },
    { fr: "Superstar", en: "Superstar" },
    { fr: "MVP", en: "MVP" },
    { fr: "Légende", en: "Legend" },
    { fr: "Hall of Famer", en: "Hall of Famer" },
  ];
  const title = titles[Math.min(level - 1, titles.length - 1)];

  return { level, xp: remaining, xpToNext: needed, title, progress };
}

// Future Self Projection: given current DNA + active plan adherence, project where you'll be in N weeks
export function projectFutureSelf(dna: SkillDNA, weeksAhead: number, planAdherence: number): SkillDNA {
  // Adherence 0-1, planType determines which skills grow fastest
  // Realistic gains: ~1-3 points/week per skill when training focused, less for others
  const growthFactor = weeksAhead * planAdherence;
  const result: SkillDNA = { ...dna };
  for (const k of SKILL_KEYS) {
    // Diminishing returns: harder to grow if already high
    const current = dna[k];
    const maxGain = Math.max(0.5, (95 - current) * 0.15);
    const gain = maxGain * growthFactor * 0.4;
    result[k] = Math.min(99, Math.round(current + gain));
  }
  return result;
}

// Achievements
export type Achievement = {
  id: string;
  name: { fr: string; en: string };
  description: { fr: string; en: string };
  emoji: string;
  condition: (state: { workoutsCount: number; matchesCount: number; currentStreak: number; totalXP: number; level: number }) => boolean;
  tier: "bronze" | "silver" | "gold" | "platinum";
};

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first_workout", name: { fr: "Premier pas", en: "First Step" }, description: { fr: "Termine ta première séance", en: "Complete your first workout" }, emoji: "👟", tier: "bronze", condition: (s) => s.workoutsCount >= 1 },
  { id: "workouts_10", name: { fr: "Régulier", en: "Consistent" }, description: { fr: "10 séances complétées", en: "10 workouts completed" }, emoji: "🔥", tier: "silver", condition: (s) => s.workoutsCount >= 10 },
  { id: "workouts_50", name: { fr: "Machine", en: "Machine" }, description: { fr: "50 séances complétées", en: "50 workouts completed" }, emoji: "⚙️", tier: "gold", condition: (s) => s.workoutsCount >= 50 },
  { id: "first_match", name: { fr: "Game Time", en: "Game Time" }, description: { fr: "Log ton premier match", en: "Log your first match" }, emoji: "🏀", tier: "bronze", condition: (s) => s.matchesCount >= 1 },
  { id: "matches_10", name: { fr: "Vétéran", en: "Veteran" }, description: { fr: "10 matchs loggés", en: "10 matches logged" }, emoji: "🏟️", tier: "silver", condition: (s) => s.matchesCount >= 10 },
  { id: "streak_3", name: { fr: "Série de 3", en: "3-Streak" }, description: { fr: "3 jours d'affilée", en: "3 days in a row" }, emoji: "⚡", tier: "bronze", condition: (s) => s.currentStreak >= 3 },
  { id: "streak_7", name: { fr: "Semaine parfaite", en: "Perfect Week" }, description: { fr: "7 jours d'affilée", en: "7 days in a row" }, emoji: "📅", tier: "silver", condition: (s) => s.currentStreak >= 7 },
  { id: "streak_30", name: { fr: "Mois de fer", en: "Iron Month" }, description: { fr: "30 jours d'affilée", en: "30 days in a row" }, emoji: "🔱", tier: "gold", condition: (s) => s.currentStreak >= 30 },
  { id: "level_5", name: { fr: "Promu", en: "Promoted" }, description: { fr: "Atteins le niveau 5", en: "Reach level 5" }, emoji: "⭐", tier: "silver", condition: (s) => s.level >= 5 },
  { id: "level_10", name: { fr: "Star montante", en: "Rising Star" }, description: { fr: "Atteins le niveau 10", en: "Reach level 10" }, emoji: "🌟", tier: "gold", condition: (s) => s.level >= 10 },
  { id: "level_20", name: { fr: "Élite", en: "Elite" }, description: { fr: "Atteins le niveau 20", en: "Reach level 20" }, emoji: "💎", tier: "platinum", condition: (s) => s.level >= 20 },
  { id: "xp_5000", name: { fr: "Grinder", en: "Grinder" }, description: { fr: "5 000 XP au total", en: "5,000 total XP" }, emoji: "💪", tier: "gold", condition: (s) => s.totalXP >= 5000 },
];
