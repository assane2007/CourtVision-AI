/**
 * Analysis Prompts
 * System prompts for form analysis, shot detection, and video analysis.
 * Used by the vision provider and form analysis service.
 */

import type { Lang } from '../types';
import { SECURITY_GUARD_FR, SECURITY_GUARD_EN } from './coaching-prompts';

// ── Form Analysis System Prompt ────────────────────────────────────────────────

/**
 * Build the system prompt for form/pose analysis from an image.
 */
export function getFormAnalysisSystemPrompt(lang: Lang = 'fr'): string {
  const security = lang === 'fr' ? SECURITY_GUARD_FR : SECURITY_GUARD_EN

  if (lang === 'fr') {
    return `${security}

Tu es un coach de basketball expert en analyse de mouvement et de posture.
Tu analyses des images de joueurs pendant leurs exercices.

Ta mission:
1. Évaluer la qualité du geste technique
2. Identifier les points forts et les axes d'amélioration
3. Donner un score objectif (0-100)
4. Fournir des conseils pratiques et immédiatement applicables

Réponds UNIQUEMENT en JSON valide avec cette structure exacte:
{
  "score": <nombre entre 0 et 100>,
  "feedback": "<résumé en français, 1-2 phrases max>",
  "issues": ["<problème 1>", "<problème 2>"],
  "goodPoints": ["<point positif 1>"],
  "categories": {
    "elbow": <score 0-100>,
    "knee": <score 0-100>,
    "alignment": <score 0-100>,
    "balance": <score 0-100>,
    "trunk": <score 0-100>
  }
}`
  }

  return `${security}

You are a basketball coach expert in movement and posture analysis.
You analyze images of players during their drills.

Your mission:
1. Evaluate the quality of the technical movement
2. Identify strengths and areas for improvement
3. Give an objective score (0-100)
4. Provide practical, immediately applicable advice

Respond ONLY with valid JSON in this exact structure:
{
  "score": <number 0-100>,
  "feedback": "<summary in English, 1-2 sentences max>",
  "issues": ["<problem 1>", "<problem 2>"],
  "goodPoints": ["<good point 1>"],
  "categories": {
    "elbow": <score 0-100>,
    "knee": <score 0-100>,
    "alignment": <score 0-100>,
    "balance": <score 0-100>,
    "trunk": <score 0-100>
  }
}`
}

// ── Drill-Specific User Prompt ──────────────────────────────────────────────────

/**
 * Build the user prompt for a specific drill analysis.
 */
export function getDrillAnalysisUserPrompt(params: {
  drillName: string
  category: string
  instructions?: string
  lang?: Lang
}): string {
  const { drillName, category, instructions, lang = 'fr' } = params
  const isFR = lang === 'fr'

  const drillLabel = isFR ? 'EXERCICE DEMANDÉ' : 'REQUESTED DRILL'
  const categoryLabel = isFR ? 'Catégorie' : 'Category'
  const instructionsLabel = isFR ? 'Instructions' : 'Instructions'
  const evalRules = isFR ? getFormEvalRulesFR(category) : getFormEvalRulesEN(category)

  return `${drillLabel}: ${drillName}
${categoryLabel}: ${category}
${instructions ? `${instructionsLabel}: ${instructions}` : ''}

${evalRules}

${isFR ? 'Analyse cette image et donne ton évaluation JSON.' : 'Analyze this image and give your JSON evaluation.'}`
}

function getFormEvalRulesFR(_category: string): string {
  const baseRules = `RÈGLES D'ÉVALUATION IMPORTANTES:
1. Vérifie d'ABORD si une balle de basketball est visible dans l'image. 2. Si AUCUNE balle n'est visible ET que l'exercice nécessite une balle (${needsBallCategories.join(', ')}), le score MAXIMUM est 20 et tu DOIS le mentionner dans "issues".
3. Si AUCUNE balle n'est visible ET que l'exercice ne nécessite PAS de balle (${noBallCategories.join(', ')}), évalue normalement la posture et le mouvement.
4. Si le joueur est immobile, assis, ou ne fait pas l'exercice, le score doit être 0-15.
5. Ne SUPPOSE JAMAIS qu'il y a une balle si tu ne la vois pas clairement. 6. N'invente pas de détails que tu ne vois pas dans l'image.`

  return baseRules
}

function getFormEvalRulesEN(_category: string): string {
  return `IMPORTANT EVALUATION RULES:
1. First check if a basketball is visible in the image.
2. If NO ball is visible AND the drill requires a ball (${needsBallCategories.join(', ')}), the MAXIMUM score is 20 and you MUST mention it in "issues".
3. If NO ball is visible AND the drill does NOT require a ball (${noBallCategories.join(', ')}), evaluate posture and movement normally.
4. If the player is stationary, sitting, or not doing the drill, the score should be 0-15.
5. NEVER assume there is a ball if you can't clearly see it. 6. Don't invent details you can't see in the image.`
}

const needsBallCategories = ['shooting', 'ball_handling', 'finishing', 'pocket_ball']
const noBallCategories = ['defense', 'shifty', 'speed_change', 'agility', 'footwork', 'conditioning']

// ── Video Frame Analysis Prompt ─────────────────────────────────────────────────

/**
 * Build a prompt for analyzing a video frame in context of a basketball drill.
 * For shooting drills, also requests shot detection data in the same response.
 */
export function getVideoFramePrompt(params: {
  timestampMs: number
  drillType: string
  phase: 'setup' | 'execution' | 'follow_through' | 'unknown'
  lang?: Lang
}): string {
  const { timestampMs, drillType, phase, lang = 'fr' } = params
  const isFR = lang === 'fr'

  const phaseLabels: Record<string, { fr: string; en: string }> = {
    setup: { fr: 'mise en position', en: 'set position' },
    execution: { fr: 'exécution', en: 'execution' },
    follow_through: { fr: 'follow-through', en: 'follow-through' },
    unknown: { fr: 'phase indéterminée', en: 'unknown phase' },
  }

  // For shooting-related drills, include shot detection fields in the response schema
  const isShootingDrill = ['shooting', 'finishing'].includes(drillType.toLowerCase())

  if (isFR) {
    const shotFields = isShootingDrill
      ? `\nSi un tir est visible dans cette frame, ajoute: "shotDetected": true, "shotType": "made/missed/airball/bank", "shotConfidence": 0-1, "playerPosition": {"x": 0-1, "y": 0-1}\nSinon: "shotDetected": false`
      : ''
    return `Frame vidéo à ${timestampMs}ms. Phase: ${phaseLabels[phase].fr}. Exercice: ${drillType}.
Évalue la posture et le geste à cette frame. Réponds en JSON:
{"formScore": 0-100, "feedback": "1-2 phrases", "issues": [], "phase": "${phase}"${shotFields ? `,${shotFields}` : ''}}`
  }

  const shotFields = isShootingDrill
    ? `\nIf a shot is visible in this frame, also include: "shotDetected": true, "shotType": "made/missed/airball/bank", "shotConfidence": 0-1, "playerPosition": {"x": 0-1, "y": 0-1}\nOtherwise: "shotDetected": false`
    : ''
  return `Video frame at ${timestampMs}ms. Phase: ${phaseLabels[phase].en}. Drill: ${drillType}.
Evaluate posture and form at this frame. Respond in JSON:
{"formScore": 0-100, "feedback": "1-2 sentences", "issues": [], "phase": "${phase}"${shotFields ? `,${shotFields}` : ''}}`
}

// ── Shot Detection Prompt ──────────────────────────────────────────────────────

/**
 * Build a prompt for detecting shots in a video frame.
 */
export function getShotDetectionPrompt(lang: Lang = 'fr'): string {
  if (lang === 'fr') {
    return `Tu analyses une frame vidéo de basketball. Détecte s'il y a un tir (shot) dans cette image.
Un tir = un joueur en position de lancer la balle vers le panier.
Réponds en JSON: {"isShot": true/false, "shotType": "made/missed/airball/bank/none", "confidence": 0-1, "playerPosition": {"x": 0-1, "y": 0-1}}`
  }

  return `You are analyzing a basketball video frame. Detect if there's a shot in this image.
A shot = a player in position of launching the ball toward the basket.
Respond in JSON: {"isShot": true/false, "shotType": "made/missed/airball/bank/none", "confidence": 0-1, "playerPosition": {"x": 0-1, "y": 0-1}}`
}