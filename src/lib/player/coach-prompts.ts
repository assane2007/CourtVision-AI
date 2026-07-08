// Coach Chat V2 — prompts and conversation style per archetype
import { Archetype, SkillDNA, SkillKey, SKILL_META } from "./iq-engine";
import { PlayerProfile } from "./store";

export type CoachContext = {
  profile: PlayerProfile;
  dna: SkillDNA;
  archetype: Archetype;
  recentWorkouts: number;
  recentMatches: number;
  currentStreak: number;
  lang: "fr" | "en";
};

export function buildCoachSystemPrompt(ctx: CoachContext): string {
  const { profile, dna, archetype, recentWorkouts, recentMatches, currentStreak, lang } = ctx;
  const isFR = lang === "fr";

  const skillBreakdown = (Object.keys(dna) as SkillKey[])
    .map((k) => `${SKILL_META[k].label[lang]}: ${dna[k]}/100`)
    .join(", ");

  const strengths = archetype.strengths.map((k) => SKILL_META[k].label[lang]).join(", ");
  const weaknesses = archetype.weaknesses.length > 0
    ? archetype.weaknesses.map((k) => SKILL_META[k].label[lang]).join(", ")
    : (isFR ? "aucune faiblesse majeure" : "no major weakness");

  return `You are "Coach V2", the AI basketball coach of the CourtVision-AI app.

## Your persona
- Name: Coach V2 — concise, motivating, no-nonsense.
- Tone: like a real high-level basketball coach. Direct, encouraging, technical when needed.
- Style: short answers (2-5 sentences max usually), basketball terminology, occasionally ask probing questions to push the player.
- Use the player's first name occasionally. Use ${isFR ? "French" : "English"} exclusively.

## Player context
- Name: ${profile.name}
- Age: ${profile.age}, Position: ${profile.position}, ${profile.heightCm}cm, ${profile.weightKg}kg
- Years of experience: ${profile.yearsExperience}
- Player archetype: ${archetype.name[lang]} ${archetype.emoji}
- Description: ${archetype.description[lang]}
- Skill DNA: ${skillBreakdown}
- Strengths: ${strengths}
- Weaknesses: ${weaknesses}
- Recent activity: ${recentWorkouts} workouts, ${recentMatches} matches in history
- Current streak: ${currentStreak} day(s)

## Your mission
- Personalize every response to the player's archetype and skill DNA.
- For a Sharpshooter 🎯: focus on shooting drills, off-ball movement, contested shots.
- For a Rim Runner 💥: focus on finishing through contact, verticality, defense.
- For a Lockdown Defender 🛡️: focus on defense, anticipation, communication.
- For a Floor General 🧠: focus on decision-making, P&R reads, leadership.
- Etc.
- When the player asks for drills, give 1-3 specific drills with brief execution cues.
- When the player is discouraged, motivate them with reference to their archetype strengths.
- When they celebrate, acknowledge briefly and push for the next milestone.
- Keep responses concise. NEVER use long bullet lists. NEVER generic advice.

## Constraints
- Always respond in ${isFR ? "French" : "English"}.
- Maximum 5 sentences per response (unless giving 3 drills, then list them).
- Never break character. You are Coach V2.
- Reference their skill DNA and archetype when relevant.`;
}

// Suggested prompts the player can click
export function suggestedPrompts(archetype: Archetype, lang: "fr" | "en"): string[] {
  const promptsByArchetype: Record<string, { fr: string[]; en: string[] }> = {
    sharpshooter: {
      fr: [
        "Comment améliorer mon tir à 3 sous pression ?",
        "Donne-moi un drill d'off-ball movement",
        "Quels sont mes axes de progression prioritaires ?",
        "Comment vaincre un défenseur qui me colle ?",
      ],
      en: [
        "How do I improve my 3-point shot under pressure?",
        "Give me an off-ball movement drill",
        "What are my priority improvement areas?",
        "How do I beat a defender who's pressing me?",
      ],
    },
    slashermaker: {
      fr: [
        "Comment améliorer ma finition au contact ?",
        "Donne-moi un drill de lecture de jeu",
        "Quand passer vs quand tirer ?",
        "Comment mieux protéger la balle ?",
      ],
      en: [
        "How do I improve contact finishing?",
        "Give me a court-read drill",
        "When to pass vs shoot?",
        "How to better protect the ball?",
      ],
    },
    rimrunner: {
      fr: [
        "Comment finir plus fort au cercle ?",
        "Drill de défense contre plus grand que moi",
        "Comment améliorer mon vertical ?",
        "Stratégie contre un intérieur plus costaud ?",
      ],
      en: [
        "How to finish stronger at the rim?",
        "Defense drill vs taller player",
        "How to improve my vertical?",
        "Strategy vs a bigger post player?",
      ],
    },
    lockdown: {
      fr: [
        "Comment améliorer mon anticipation défensive ?",
        "Drill closeout contre sniper",
        "Comment communiquer en défense ?",
        "Quand aider vs rester sur mon homme ?",
      ],
      en: [
        "How to improve defensive anticipation?",
        "Closeout drill vs a sniper",
        "How to communicate on defense?",
        "When to help vs stay home?",
      ],
    },
    floorgeneral: {
      fr: [
        "Comment mieux lire le P&R ?",
        "Drill de prise de décision rapide",
        "Comment diriger mon équipe vocalement ?",
        "Quand ralentir vs accélérer le jeu ?",
      ],
      en: [
        "How to read P&R better?",
        "Quick decision-making drill",
        "How to lead my team vocally?",
        "When to slow down vs speed up?",
      ],
    },
  };
  // Default generic prompts if archetype-specific not found
  const fallback = {
    fr: [
      "Quels sont mes axes de progression ?",
      "Donne-moi un drill adapté à mon profil",
      "Comment rester motivé ?",
      "Analyse mon archétype de jeu",
    ],
    en: [
      "What are my improvement areas?",
      "Give me a drill for my profile",
      "How to stay motivated?",
      "Analyze my play archetype",
    ],
  };
  return (promptsByArchetype[archetype.id]?.[lang] ?? fallback[lang]);
}
