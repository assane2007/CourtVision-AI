// Video Session Analyzer — multi-phase pose analysis
// Analyzes dribbling, finishing, and shooting from recorded video

import { FormMetrics, FormScore, PoseData } from "./form-analyzer";

export type AnalysisPhase = "dribble" | "finishing" | "shooting" | "general";

export type SessionFrame = {
  timestamp: number; // ms from start
  pose: PoseData;
  metrics: FormMetrics | null;
  score: FormScore | null;
};

export type SessionAnalysis = {
  id: string;
  phase: AnalysisPhase;
  durationSec: number;
  frames: SessionFrame[];
  // Aggregated insights
  avgScore: number;
  bestScore: number;
  worstScore: number;
  // Phase-specific insights
  insights: { fr: string; en: string }[];
  // Key moments (timestamps with high/low scores)
  keyMoments: { timestamp: number; score: number; type: "peak" | "valley" }[];
  // Recommendations
  recommendations: { fr: string; en: string; priority: "high" | "medium" | "low" }[];
  // Overall rating
  rating: "elite" | "good" | "average" | "needs_work";
  createdAt: string;
};

// Phase-specific analysis logic
export function analyzeSession(
  frames: SessionFrame[],
  phase: AnalysisPhase,
  durationSec: number
): SessionAnalysis {
  const scores = frames.map((f) => f.score?.total ?? 0).filter((s) => s > 0);
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const bestScore = scores.length > 0 ? Math.max(...scores) : 0;
  const worstScore = scores.length > 0 ? Math.min(...scores) : 0;

  // Find key moments (peaks and valleys)
  const keyMoments: { timestamp: number; score: number; type: "peak" | "valley" }[] = [];
  if (scores.length > 5) {
    // Find top 3 peaks and bottom 2 valleys
    const indexed = scores.map((score, i) => ({ score, i, timestamp: frames[i].timestamp }));
    const peaks = [...indexed].sort((a, b) => b.score - a.score).slice(0, 3);
    const valleys = [...indexed].sort((a, b) => a.score - b.score).slice(0, 2);
    peaks.forEach((p) => keyMoments.push({ timestamp: p.timestamp, score: p.score, type: "peak" }));
    valleys.forEach((v) => keyMoments.push({ timestamp: v.timestamp, score: v.score, type: "valley" }));
    keyMoments.sort((a, b) => a.timestamp - b.timestamp);
  }

  // Phase-specific insights and recommendations
  const { insights, recommendations } = generatePhaseInsights(frames, phase, avgScore);

  const rating: SessionAnalysis["rating"] =
    avgScore >= 85 ? "elite" : avgScore >= 70 ? "good" : avgScore >= 50 ? "average" : "needs_work";

  return {
    id: `session_${Date.now()}`,
    phase,
    durationSec,
    frames,
    avgScore,
    bestScore,
    worstScore,
    insights,
    keyMoments,
    recommendations,
    rating,
    createdAt: new Date().toISOString(),
  };
}

function generatePhaseInsights(
  frames: SessionFrame[],
  phase: AnalysisPhase,
  avgScore: number
): { insights: { fr: string; en: string }[]; recommendations: { fr: string; en: string; priority: "high" | "medium" | "low" }[] } {
  const insights: { fr: string; en: string }[] = [];
  const recommendations: { fr: string; en: string; priority: "high" | "medium" | "low" }[] = [];

  // Analyze metrics across frames
  const elbowAngles = frames.map((f) => f.metrics?.elbowAngle ?? 0).filter((a) => a > 0);
  const kneeAngles = frames.map((f) => f.metrics?.kneeAngle ?? 0).filter((a) => a > 0);
  const trunkAngles = frames.map((f) => f.metrics?.trunkAngle ?? 0).filter((a) => a > 0);
  const shoulderAligns = frames.map((f) => f.metrics?.shoulderAlignment ?? 1).filter((a) => a >= 0);

  const avgElbow = elbowAngles.length > 0 ? elbowAngles.reduce((a, b) => a + b, 0) / elbowAngles.length : 0;
  const avgKnee = kneeAngles.length > 0 ? kneeAngles.reduce((a, b) => a + b, 0) / kneeAngles.length : 0;
  const avgTrunk = trunkAngles.length > 0 ? trunkAngles.reduce((a, b) => a + b, 0) / trunkAngles.length : 0;
  const avgShoulderAlign = shoulderAligns.length > 0 ? shoulderAligns.reduce((a, b) => a + b, 0) / shoulderAligns.length : 0;
  const consistency = elbowAngles.length > 0 ? Math.sqrt(elbowAngles.reduce((acc, a) => acc + Math.pow(a - avgElbow, 2), 0) / elbowAngles.length) : 0;

  if (phase === "dribble") {
    insights.push({
      fr: `Hauteur de dribble: ${avgKnee > 110 ? "trop haute" : avgKnee > 90 ? "correcte" : "basse et explosive"}`,
      en: `Dribble height: ${avgKnee > 110 ? "too high" : avgKnee > 90 ? "correct" : "low and explosive"}`,
    });
    insights.push({
      fr: `Stabilité du tronc: ${avgTrunk < 10 ? "excellente" : avgTrunk < 20 ? "correcte" : "trop de penché"}`,
      en: `Trunk stability: ${avgTrunk < 10 ? "excellent" : avgTrunk < 20 ? "decent" : "too much lean"}`,
    });
    insights.push({
      fr: `Cohérence du mouvement: ${consistency < 5 ? "très régulier" : consistency < 10 ? "régulier" : "irrégulier"}`,
      en: `Movement consistency: ${consistency < 5 ? "very consistent" : consistency < 10 ? "consistent" : "inconsistent"}`,
    });

    if (avgKnee > 110) recommendations.push({ fr: "Baisse ton dribble — plus bas = plus difficile à voler", en: "Lower your dribble — lower = harder to steal", priority: "high" });
    if (avgTrunk > 20) recommendations.push({ fr: "Redresse ton tronc pendant le dribble pour meilleure vision", en: "Stay upright while dribbling for better vision", priority: "medium" });
    if (consistency > 10) recommendations.push({ fr: "Travaille la régularité : même rythme, même hauteur", en: "Work on consistency: same rhythm, same height", priority: "high" });
    recommendations.push({ fr: "Ajoute des changements de direction (crossover, entre-jambes)", en: "Add change-of-direction moves (crossover, between legs)", priority: "medium" });
    recommendations.push({ fr: "Pratique le dribble sans regarder (tête haute)", en: "Practice dribbling without looking (head up)", priority: "low" });
  } else if (phase === "finishing") {
    insights.push({
      fr: `Angle coude à la finition: ${avgElbow > 100 ? "extension complète" : avgElbow > 80 ? "correct" : "trop plié"}`,
      en: `Elbow angle at finish: ${avgElbow > 100 ? "full extension" : avgElbow > 80 ? "correct" : "too bent"}`,
    });
    insights.push({
      fr: `Puissance des jambes: ${avgKnee < 110 ? "bonne flexion" : avgKnee < 140 ? "modérée" : "insuffisante"}`,
      en: `Leg power: ${avgKnee < 110 ? "good flexion" : avgKnee < 140 ? "moderate" : "insufficient"}`,
    });
    insights.push({
      fr: `Protection de balle: ${avgShoulderAlign < 0.03 ? "bonne" : avgShoulderAlign < 0.06 ? "moyenne" : "balle exposée"}`,
      en: `Ball protection: ${avgShoulderAlign < 0.03 ? "good" : avgShoulderAlign < 0.06 ? "average" : "ball exposed"}`,
    });

    if (avgKnee > 140) recommendations.push({ fr: "Fléchis plus les genoux pour générer de la puissance", en: "Bend knees more to generate power", priority: "high" });
    if (avgElbow < 80) recommendations.push({ fr: "Étends complètement le bras au cercle", en: "Fully extend arm to the rim", priority: "high" });
    if (avgShoulderAlign > 0.06) recommendations.push({ fr: "Protège la balle avec l'épaule libre", en: "Protect the ball with your off-shoulder", priority: "medium" });
    recommendations.push({ fr: "Pratique les finitions des deux mains", en: "Practice finishing with both hands", priority: "high" });
    recommendations.push({ fr: "Ajoute l'euro-step et le pro-hop à ton arsenal", en: "Add euro-step and pro-hop to your arsenal", priority: "low" });
  } else if (phase === "shooting") {
    insights.push({
      fr: `Angle coude au tir: ${avgElbow >= 80 && avgElbow <= 100 ? "90° parfait" : avgElbow > 100 ? "trop ouvert" : "trop fermé"}`,
      en: `Elbow angle on shot: ${avgElbow >= 80 && avgElbow <= 100 ? "perfect 90°" : avgElbow > 100 ? "too open" : "too closed"}`,
    });
    insights.push({
      fr: `Flexion genoux: ${avgKnee >= 110 && avgKnee <= 140 ? "optimale" : avgKnee > 140 ? "trop droite" : "trop pliée"}`,
      en: `Knee flexion: ${avgKnee >= 110 && avgKnee <= 140 ? "optimal" : avgKnee > 140 ? "too straight" : "too bent"}`,
    });
    insights.push({
      fr: `Alignement épaules: ${avgShoulderAlign < 0.02 ? "parfait" : avgShoulderAlign < 0.04 ? "correct" : "désaligné"}`,
      en: `Shoulder alignment: ${avgShoulderAlign < 0.02 ? "perfect" : avgShoulderAlign < 0.04 ? "decent" : "misaligned"}`,
    });
    insights.push({
      fr: `Cohérence mécanique: ${consistency < 5 ? "élite" : consistency < 10 ? "bonne" : "à travailler"}`,
      en: `Mechanical consistency: ${consistency < 5 ? "elite" : consistency < 10 ? "good" : "needs work"}`,
    });

    if (avgElbow < 80 || avgElbow > 100) recommendations.push({ fr: `Vise 90° au coude (actuel: ${avgElbow.toFixed(0)}°)`, en: `Aim for 90° elbow (current: ${avgElbow.toFixed(0)}°)`, priority: "high" });
    if (avgKnee > 140) recommendations.push({ fr: "Fléchis plus les genoux pour plus de puissance", en: "Bend knees more for more power", priority: "high" });
    if (avgShoulderAlign > 0.04) recommendations.push({ fr: "Carré tes épaules au cercle avant de tirer", en: "Square shoulders to the rim before shooting", priority: "medium" });
    if (consistency > 10) recommendations.push({ fr: "Travaille la reproductibilité : même mécanique à chaque tir", en: "Work on repeatability: same mechanics every shot", priority: "high" });
    recommendations.push({ fr: "Ajoute le follow-through complet (poignet cassé)", en: "Add full follow-through (snapped wrist)", priority: "medium" });
    recommendations.push({ fr: "Pratique le tir game-speed avec défenseur", en: "Practice game-speed shooting with defender", priority: "low" });
  } else {
    // General
    insights.push({
      fr: `Score moyen: ${avgScore}/100`,
      en: `Average score: ${avgScore}/100`,
    });
    insights.push({
      fr: `Cohérence: ${consistency < 5 ? "élite" : consistency < 10 ? "bonne" : "irrégulière"}`,
      en: `Consistency: ${consistency < 5 ? "elite" : consistency < 10 ? "good" : "inconsistent"}`,
    });
    recommendations.push({ fr: "Continue à t'entraîner régulièrement", en: "Keep training regularly", priority: "low" });
  }

  return { insights, recommendations };
}

export const PHASE_LABELS: Record<AnalysisPhase, { fr: string; en: string; emoji: string }> = {
  dribble: { fr: "Dribble", en: "Dribbling", emoji: "🌀" },
  finishing: { fr: "Finition", en: "Finishing", emoji: "💥" },
  shooting: { fr: "Tir", en: "Shooting", emoji: "🎯" },
  general: { fr: "Général", en: "General", emoji: "🏀" },
};
