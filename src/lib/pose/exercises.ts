/**
 * Exercise definitions for camera-based rep counting and form analysis.
 * Each exercise defines:
 * - How to detect a rep (angle thresholds)
 * - Form quality checks
 * - Real-time feedback messages
 */

import { Landmark, Joints, isVertical, getLandmark, midpoint, distance, LM } from "./landmarks";

export type ExerciseId =
  | "squat" | "lunge" | "pushup" | "high_knees" |"calf_raises"| "plank" | "wall_sit" | "burpee" |"jumping_jacks" | "shoulder_taps"
  // Basketball-specific exercises
  | "defensive_slide" | "stance_hold" | "speed_change" |"pocket_dribble"| "lateral_quick" | "jumping_lunge" |"sprint_stance";

export interface FormFeedback {
  type: "good" | "warning" | "error";
  key: string;
  message: { fr: string; en: string };
}

export interface RepState {
  count: number;
  inRep: boolean;
  lastAngle: number;
  formScore: number;      // 0-100
  feedback: FormFeedback[]; // current frame feedback
  peakAngle: number;      // deepest point of current rep
  holdStart: number | null; // timestamp for isometric exercises
}

export interface ExerciseDef {
  id: ExerciseId;
  label: { fr: string; en: string };
  /** Joint angle getter function */
  getAngle: (lm: Landmark[]) => number;
  /** Angle at which we consider the "down" position reached */
  downThreshold: number;
  /** Angle at which we consider the "up" position reached */
  upThreshold: number;
  /** "up" angle must be LOWER than "down" (e.g., pushups: up=150, down=90) */
  inverted?: boolean;
  /** Is this an isometric hold? (plank, wall sit) */
  isometric?: boolean;
  /** For isometric: how many seconds = 1 rep */
  holdDurationSec?: number;
  /** Form quality checks */
  checkForm: (lm: Landmark[], state: RepState) => FormFeedback[];
  /** Target drill IDs from the plan system that map to this exercise */
  drillKeywords: string[];
}

// ── Helper ──────────────────────────────────────────────────
function kneeCheck(lm: Landmark[]): FormFeedback[] {
  const fb: FormFeedback[] = [];
  const lKnee = getLandmark(lm, LM.LEFT_KNEE);
  const _rKnee = getLandmark(lm, LM.RIGHT_KNEE);
  const lHip = getLandmark(lm, LM.LEFT_HIP);
  const _rHip = getLandmark(lm, LM.RIGHT_HIP);
  const lAnkle = getLandmark(lm, LM.LEFT_ANKLE);
  const _rAnkle = getLandmark(lm, LM.RIGHT_ANKLE);

  if (lKnee && lHip && lAnkle) {
    const kneeAngle = Math.abs(Math.atan2(lKnee.x - lHip.x, lKnee.y - lHip.y) * 180 / Math.PI);
    if (kneeAngle > 15) {
      fb.push({ type: "warning", key: "knee_cave", message: { fr: "Genoux qui cèdent — garde-les alignés", en: "Knees caving — keep them aligned" } });
    }
  }
  if (!isVertical(lm, 20)) {
    fb.push({ type: "warning", key: "back_lean", message: { fr: "Dos trop penché — reste droit", en: "Back too lean — stay upright" } });
  }
  return fb;
}

function pushupFormCheck(lm: Landmark[]): FormFeedback[] {
  const fb: FormFeedback[] = [];
  const lShoulder = getLandmark(lm, LM.LEFT_SHOULDER);
  const rShoulder = getLandmark(lm, LM.RIGHT_SHOULDER);
  const lHip = getLandmark(lm, LM.LEFT_HIP);
  const rHip = getLandmark(lm, LM.RIGHT_HIP);
  const lAnkle = getLandmark(lm, LM.LEFT_ANKLE);

  if (lShoulder && rShoulder && lHip && rHip && lAnkle) {
    const shoulderMid = midpoint(lShoulder, rShoulder);
    const hipMid = midpoint(lHip, rHip);
    const bodyAngle = Math.abs(Math.atan2(hipMid.x - shoulderMid.x, hipMid.y - shoulderMid.y)) * 180 / Math.PI;
    if (bodyAngle > 25) {
      fb.push({ type: "warning", key: "hips_sag", message: { fr: "Hanches basses — garde le corps droit", en: "Hips sagging — keep body straight" } });
    }
  }

  const elbowAngle = Joints.avgElbow(lm);
  if (elbowAngle > 0 && elbowAngle > 100) {
    fb.push({ type: "warning", key: "wide_elbows", message: { fr: "Coudes trop écartés — serre-les à 45°", en: "Elbows too wide — tuck to 45°" } });
  }
  return fb;
}

// ── Basketball-specific helpers ─────────────────────────────

/** Check that hands/wrists are above shoulders (defensive hands up) */
function handsUpCheck(lm: Landmark[]): FormFeedback[] {
  const fb: FormFeedback[] = [];
  const lWrist = getLandmark(lm, LM.LEFT_WRIST);
  const rWrist = getLandmark(lm, LM.RIGHT_WRIST);
  const lShoulder = getLandmark(lm, LM.LEFT_SHOULDER);
  const rShoulder = getLandmark(lm, LM.RIGHT_SHOULDER);

  const lUp = lWrist && lShoulder && lWrist.y < lShoulder.y;
  const rUp = rWrist && rShoulder && rWrist.y < rShoulder.y;

  if (lUp && rUp) {
    fb.push({ type: "good", key: "hands_up", message: { fr: "Mains en l'air — bon !", en: "Hands up — good!" } });
  } else if (!lUp && !rUp) {
    fb.push({ type: "warning", key: "hands_low", message: { fr: "Mains trop basses — lève-les", en: "Hands too low — raise them" } });
  }
  return fb;
}

/** Check if stance is low (knees bent below a threshold angle) */
function lowStanceCheck(lm: Landmark[], kneeThreshold = 145): FormFeedback[] {
  const fb: FormFeedback[] = [];
  const avgKnee = Joints.avgKnee(lm);
  if (avgKnee < 0) return fb;

  if (avgKnee > kneeThreshold) {
    fb.push({ type: "warning", key: "stance_high", message: { fr: "Posture trop haute — fléchis les genoux", en: "Stance too high — bend your knees" } });
  } else {
    fb.push({ type: "good", key: "low_stance", message: { fr: "Bonne posture basse", en: "Good low stance" } });
  }
  return fb;
}

// ── EXERCISE DEFINITIONS ─────────────────────────────────────

export const EXERCISES: Record<ExerciseId, ExerciseDef> = {
  squat: {
    id: "squat",
    label: { fr: "Squat", en: "Squat" },
    getAngle: (lm) => Joints.avgKnee(lm),
    downThreshold: 100,  // knee angle < 100 = deep enough
    upThreshold: 160,    // knee angle > 160 = standing
    checkForm: kneeCheck,
    drillKeywords: ["squat", "accroupissement"],
  },

  lunge: {
    id: "lunge",
    label: { fr: "Fente", en: "Lunge" },
    getAngle: (lm) => Joints.rightKnee(lm),
    downThreshold: 95,
    upThreshold: 155,
    checkForm: (lm) => {
      const fb = kneeCheck(lm);
      // Check front knee doesn't go past toes
      const rKnee = getLandmark(lm, LM.RIGHT_KNEE);
      const rAnkle = getLandmark(lm, LM.RIGHT_ANKLE);
      if (rKnee && rAnkle && rKnee.x < rAnkle.x - 0.03) {
        fb.push({ type: "warning", key: "knee_past_toes", message: { fr: "Genou devant les orteils", en: "Knee past toes" } });
      }
      return fb;
    },
    drillKeywords: ["lunge", "fente"],
  },

  pushup: {
    id: "pushup",
    label: { fr: "Pompes", en: "Push-up" },
    getAngle: (lm) => Joints.avgElbow(lm),
    downThreshold: 90,   // elbow < 90 = down
    upThreshold: 150,    // elbow > 150 = up
    inverted: true,      // lower angle = more bent (down position)
    checkForm: pushupFormCheck,
    drillKeywords: ["push", "pomp", "press"],
  },

  high_knees: {
    id: "high_knees",
    label: { fr: "Montées de genoux", en: "High Knees" },
    getAngle: (lm) => {
      const hip = getLandmark(lm, LM.LEFT_HIP);
      const knee = getLandmark(lm, LM.LEFT_KNEE);
      if (!hip || !knee) return -1;
      // Use vertical distance: knee above hip = good
      return (hip.y - knee.y) * 100; // positive = knee above hip
    },
    downThreshold: 3,   // knee 3% above hip = "up" position (high knee)
    upThreshold: -2,    // knee below hip = "down" (resting)
    inverted: true,
    checkForm: () => {
      const fb: FormFeedback[] = [];
      return fb;
    },
    drillKeywords: ["high_knee", "montée", "genou"],
  },

  calf_raises: {
    id: "calf_raises",
    label: { fr: "Mollets", en: "Calf Raises" },
    getAngle: (lm) => {
      const knee = getLandmark(lm, LM.LEFT_KNEE);
      const ankle = getLandmark(lm, LM.LEFT_ANKLE);
      const foot = getLandmark(lm, LM.LEFT_FOOT_INDEX);
      if (!knee || !ankle || !foot) return -1;
      return Math.atan2(knee.y - ankle.y, knee.x - ankle.x) * (180 / Math.PI);
    },
    downThreshold: 60,  // on toes
    upThreshold: 80,    // flat
    inverted: true,
    checkForm: () => [],
    drillKeywords: ["calf", "mollet"],
  },

  plank: {
    id: "plank",
    label: { fr: "Planche", en: "Plank" },
    getAngle: (lm) => Joints.avgElbow(lm),
    downThreshold: 80,
    upThreshold: 100,
    isometric: true,
    holdDurationSec: 10, // 10s hold = 1 "rep"
    checkForm: (lm) => pushupFormCheck(lm),
    drillKeywords: ["plank", "planche"],
  },

  wall_sit: {
    id: "wall_sit",
    label: { fr: "Chaise au mur", en: "Wall Sit" },
    getAngle: (lm) => Joints.avgKnee(lm),
    downThreshold: 110,
    upThreshold: 160,
    isometric: true,
    holdDurationSec: 15,
    checkForm: kneeCheck,
    drillKeywords: ["wall_sit", "chaise"],
  },

  burpee: {
    id: "burpee",
    label: { fr: "Burpee", en: "Burpee" },
    getAngle: (lm) => Joints.avgKnee(lm),
    downThreshold: 95,   // squat position
    upThreshold: 160,    // standing / jump
    checkForm: (lm) => {
      const fb = kneeCheck(lm);
      const lWrist = getLandmark(lm, LM.LEFT_WRIST);
      const lShoulder = getLandmark(lm, LM.LEFT_SHOULDER);
      const _rWrist = getLandmark(lm, LM.RIGHT_WRIST);
      const _rShoulder = getLandmark(lm, LM.RIGHT_SHOULDER);
      if (lWrist && lShoulder) {
        if (lWrist.y > lShoulder.y) {
          fb.push({ type: "good", key: "arms_up", message: { fr: "Bras levés — bon !", en: "Arms up — good!" } });
        }
      }
      return fb;
    },
    drillKeywords: ["burpee"],
  },

  jumping_jacks: {
    id: "jumping_jacks",
    label: { fr: "Jumping Jacks", en: "Jumping Jacks" },
    getAngle: (lm) => {
      const lShoulder = getLandmark(lm, LM.LEFT_SHOULDER);
      const lWrist = getLandmark(lm, LM.LEFT_WRIST);
      if (!lShoulder || !lWrist) return -1;
      return Math.abs(lWrist.y - lShoulder.y) * 100; // arms raised = small diff
    },
    downThreshold: 5,   // arms up (close to shoulder height)
    upThreshold: 25,    // arms down
    inverted: true,
    checkForm: () => [],
    drillKeywords: ["jumping_jack", "star_jump"],
  },

  shoulder_taps: {
    id: "shoulder_taps",
    label: { fr: "Touché d'épaules", en: "Shoulder Taps" },
    getAngle: (lm) => {
      const lWrist = getLandmark(lm, LM.LEFT_WRIST);
      const rShoulder = getLandmark(lm, LM.RIGHT_SHOULDER);
      const rWrist = getLandmark(lm, LM.RIGHT_WRIST);
      const lShoulder = getLandmark(lm, LM.LEFT_SHOULDER);
      if (!lWrist || !rShoulder || !rWrist || !lShoulder) return -1;
      const lDist = distance(lWrist, rShoulder);
      const rDist = distance(rWrist, lShoulder);
      return Math.min(lDist, rDist) * 100;
    },
    downThreshold: 2,   // hand near opposite shoulder
    upThreshold: 8,     // hand away
    inverted: true,
    checkForm: (lm) => {
      const fb: FormFeedback[] = [];
      if (!isVertical(lm, 20)) {
        fb.push({ type: "warning", key: "hips_sway", message: { fr: "Hanches qui bougent — reste stable", en: "Hips swaying — stay stable" } });
      }
      return fb;
    },
    drillKeywords: ["shoulder_tap", "touché"],
  },

  // ── BASKETBALL-SPECIFIC EXERCISES ──────────────────────────

  defensive_slide: {
    id: "defensive_slide",
    label: { fr: "Glissade défensive", en: "Defensive Slide" },
    getAngle: (lm) => {
      const rHip = getLandmark(lm, LM.RIGHT_HIP);
      const lHip = getLandmark(lm, LM.LEFT_HIP);
      if (!rHip || !lHip) return -1;
      // Wider stance when sliding — horizontal hip spread × 1000
      return Math.abs(rHip.x - lHip.x) * 1000;
    },
    downThreshold: 12,  // wide stance (sliding)
    upThreshold: 6,     // narrow/reset stance
    checkForm: (lm) => {
      const fb = lowStanceCheck(lm, 145);
      if (!isVertical(lm, 20)) {
        fb.push({ type: "warning", key: "back_lean", message: { fr: "Reste droit pendant le slide", en: "Stay upright during slide" } });
      }
      return fb;
    },
    drillKeywords: ["slide", "défensif", "defensive", "latéral"],
  },

  stance_hold: {
    id: "stance_hold",
    label: { fr: "Maintien de garde", en: "Stance Hold" },
    getAngle: (lm) => Joints.avgKnee(lm),
    downThreshold: 120,
    upThreshold: 155,
    isometric: true,
    holdDurationSec: 10,
    checkForm: (lm) => {
      const fb = lowStanceCheck(lm, 140);
      fb.push(...handsUpCheck(lm));
      if (!isVertical(lm, 20)) {
        fb.push({ type: "warning", key: "back_straight", message: { fr: "Garde le dos droit", en: "Keep your back straight" } });
      }
      return fb;
    },
    drillKeywords: ["stance", "défensif", "defensive", "garde"],
  },

  speed_change: {
    id: "speed_change",
    label: { fr: "Changement de vitesse", en: "Speed Change" },
    getAngle: (lm) => {
      const lHip = getLandmark(lm, LM.LEFT_HIP);
      const rHip = getLandmark(lm, LM.RIGHT_HIP);
      if (!lHip || !rHip) return -1;
      const hipMid = midpoint(lHip, rHip);
      // Use hip height as proxy for speed: higher = faster, lower = decelerating
      return (1 - hipMid.y) * 100;
    },
    downThreshold: 20,  // low position = deceleration ("down" state)
    upThreshold: 45,    // tall = acceleration ("up" state)
    inverted: true,     // lower angle = deceleration = "down" position
    checkForm: (lm) => {
      const fb: FormFeedback[] = [];
      const avgKnee = Joints.avgKnee(lm);
      // When low (decelerating), check knees are bent
      if (avgKnee > 0 && avgKnee < 140) {
        fb.push({ type: "good", key: "knees_bent", message: { fr: "Genoux fléchis — bon freinage", en: "Knees bent — good deceleration" } });
      }
      // Check arm pumping when tall (accelerating)
      const lWrist = getLandmark(lm, LM.LEFT_WRIST);
      const lShoulder = getLandmark(lm, LM.LEFT_SHOULDER);
      const rWrist = getLandmark(lm, LM.RIGHT_WRIST);
      const rShoulder = getLandmark(lm, LM.RIGHT_SHOULDER);
      if (lWrist && lShoulder && rWrist && rShoulder) {
        const lArmUp = lWrist.y < lShoulder.y;
        const rArmUp = rWrist.y < rShoulder.y;
        if (lArmUp || rArmUp) {
          fb.push({ type: "good", key: "arms_pumping", message: { fr: "Bras actifs — bon !", en: "Arms pumping — good!" } });
        }
      }
      return fb;
    },
    drillKeywords: ["speed", "vitesse", "hesitation", "change", "accélér", "stop"],
  },

  pocket_dribble: {
    id: "pocket_dribble",
    label: { fr: "Dribble bas (poche)", en: "Pocket Dribble" },
    getAngle: (lm) => Joints.avgKnee(lm),
    downThreshold: 110,
    upThreshold: 150,
    checkForm: (lm) => {
      const fb = lowStanceCheck(lm, 135);
      if (!isVertical(lm, 20)) {
        fb.push({ type: "warning", key: "back_straight", message: { fr: "Garde le dos droit", en: "Keep your back straight" } });
      }
      // Check one hand is low (wrist near hip) — pocket dribble position
      const lWrist = getLandmark(lm, LM.LEFT_WRIST);
      const rWrist = getLandmark(lm, LM.RIGHT_WRIST);
      const lHip = getLandmark(lm, LM.LEFT_HIP);
      const rHip = getLandmark(lm, LM.RIGHT_HIP);
      if (lWrist && lHip && rWrist && rHip) {
        const lNearHip = Math.abs(lWrist.y - lHip.y) < 0.12;
        const rNearHip = Math.abs(rWrist.y - rHip.y) < 0.12;
        if (lNearHip || rNearHip) {
          fb.push({ type: "good", key: "hand_low", message: { fr: "Main basse — bon contrôle", en: "Hand low — good control" } });
        } else {
          fb.push({ type: "warning", key: "hand_high", message: { fr: "Baisse la main vers la poche", en: "Lower hand to pocket" } });
        }
      }
      return fb;
    },
    drillKeywords: ["pocket", "dribble", "basse", "low", "contrôl"],
  },

  lateral_quick: {
    id: "lateral_quick",
    label: { fr: "Déplacements latéraux rapides", en: "Quick Lateral Shuffles" },
    getAngle: (lm) => {
      const rHip = getLandmark(lm, LM.RIGHT_HIP);
      const lHip = getLandmark(lm, LM.LEFT_HIP);
      if (!rHip || !lHip) return -1;
      return Math.abs(rHip.x - lHip.x) * 1000;
    },
    downThreshold: 10,  // wide stance
    upThreshold: 5,     // narrow/reset
    checkForm: (lm) => {
      const fb = lowStanceCheck(lm, 145);
      // Check feet aren't crossing (ankles should remain separated horizontally)
      const lAnkle = getLandmark(lm, LM.LEFT_ANKLE);
      const rAnkle = getLandmark(lm, LM.RIGHT_ANKLE);
      if (lAnkle && rAnkle) {
        const ankleSpread = Math.abs(lAnkle.x - rAnkle.x);
        if (ankleSpread < 0.05) {
          fb.push({ type: "warning", key: "feet_crossing", message: { fr: "Pieds qui se croisent — écarte-les", en: "Feet crossing — spread them" } });
        }
      }
      return fb;
    },
    drillKeywords: ["shifty", "shuffle", "latéral", "crossover", "quick"],
  },

  jumping_lunge: {
    id: "jumping_lunge",
    label: { fr: "Fente explosive", en: "Jumping Lunge" },
    getAngle: (lm) => {
      // Use the side with the deeper knee bend
      const lKnee = Joints.leftKnee(lm);
      const rKnee = Joints.rightKnee(lm);
      if (lKnee < 0 && rKnee < 0) return -1;
      if (lKnee < 0) return rKnee;
      if (rKnee < 0) return lKnee;
      return Math.min(lKnee, rKnee);
    },
    downThreshold: 100,  // deep lunge
    upThreshold: 155,    // standing/explosive extension
    checkForm: (lm) => {
      const fb = kneeCheck(lm);
      // Check knee alignment — both knees tracking over toes
      const lKnee = getLandmark(lm, LM.LEFT_KNEE);
      const lHip = getLandmark(lm, LM.LEFT_HIP);
      const rKnee = getLandmark(lm, LM.RIGHT_KNEE);
      const rHip = getLandmark(lm, LM.RIGHT_HIP);
      if (lKnee && lHip && Math.abs(lKnee.x - lHip.x) > 0.08) {
        fb.push({ type: "warning", key: "knee_alignment", message: { fr: "Genou gauche mal aligné", en: "Left knee misaligned" } });
      }
      if (rKnee && rHip && Math.abs(rKnee.x - rHip.x) > 0.08) {
        fb.push({ type: "warning", key: "knee_alignment_r", message: { fr: "Genou droit mal aligné", en: "Right knee misaligned" } });
      }
      return fb;
    },
    drillKeywords: ["lunge", "jump", "explosif", "latéral"],
  },

  sprint_stance: {
    id: "sprint_stance",
    label: { fr: "Position de départ sprint", en: "Sprint Stance" },
    getAngle: (lm) => Joints.avgKnee(lm),
    downThreshold: 115,
    upThreshold: 150,
    isometric: true,
    holdDurationSec: 8,
    checkForm: (lm) => {
      const fb: FormFeedback[] = [];
      // Check one foot forward (hip alignment offset)
      const lHip = getLandmark(lm, LM.LEFT_HIP);
      const rHip = getLandmark(lm, LM.RIGHT_HIP);
      if (lHip && rHip) {
        const hipOffset = Math.abs(lHip.y - rHip.y);
        if (hipOffset < 0.02) {
          fb.push({ type: "warning", key: "split_stance", message: { fr: "Mets un pied en avant", en: "Place one foot forward" } });
        } else {
          fb.push({ type: "good", key: "split_stance", message: { fr: "Bonne position écartée", en: "Good split stance" } });
        }
      }
      fb.push(...lowStanceCheck(lm, 140));
      // Check arms ready (slightly bent)
      const lElbow = Joints.leftElbow(lm);
      const rElbow = Joints.rightElbow(lm);
      if (lElbow > 0 && rElbow > 0) {
        const avgElbow = (lElbow + rElbow) / 2;
        if (avgElbow > 140) {
          fb.push({ type: "warning", key: "arms_straight", message: { fr: "Fléchis légèrement les bras", en: "Bend arms slightly" } });
        }
      }
      return fb;
    },
    drillKeywords: ["sprint", "start", "athletic", "départ"],
  },
};

/** Try to match a drill name to an exercise */
export function matchExercise(drillName: string): ExerciseDef | null {
  const lower = drillName.toLowerCase();
  for (const ex of Object.values(EXERCISES)) {
    if (ex.drillKeywords.some(kw => lower.includes(kw))) return ex;
  }
  // Default: try to detect generic lower body vs upper body
  if (lower.includes("squat") || lower.includes("leg") || lower.includes("mollet")) return EXERCISES.squat;
  if (lower.includes("push") || lower.includes("press") || lower.includes("pomp")) return EXERCISES.pushup;
  // Basketball-specific fallbacks
  if (lower.includes("dribbl") || lower.includes("contrôl") || lower.includes("balle")) return EXERCISES.pocket_dribble;
  if (lower.includes("défens") || lower.includes("defens") || lower.includes("garde")) return EXERCISES.stance_hold;
  if (lower.includes("slide") || lower.includes("gliss")) return EXERCISES.defensive_slide;
  if (lower.includes("shuffle") || lower.includes("shifty") || lower.includes("latéral")) return EXERCISES.lateral_quick;
  if (lower.includes("speed") || lower.includes("vitesse") || lower.includes("hesitation")) return EXERCISES.speed_change;
  if (lower.includes("sprint") || lower.includes("départ") || lower.includes("start")) return EXERCISES.sprint_stance;
  return null;
}

/** Process one frame of landmarks and update rep state */
export function processFrame(
  landmarks: Landmark[],
  exercise: ExerciseDef,
  prevState: RepState,
  now: number,
): RepState {
  const angle = exercise.getAngle(landmarks);
  if (angle < 0) return { ...prevState, feedback: [] }; // not visible

  const feedback = exercise.checkForm(landmarks, prevState);
  const warningCount = feedback.filter(f => f.type === "warning" || f.type === "error").length;
  const formScore = Math.max(0, 100 - warningCount * 25);

  // ── ISOMETRIC (plank, wall sit) ──
  if (exercise.isometric) {
    const inPosition = exercise.inverted
      ? angle <= exercise.downThreshold
      : angle <= exercise.downThreshold;

    if (inPosition) {
      const holdStart = prevState.holdStart ?? now;
      const holdDuration = (now - holdStart) / 1000;
      const newReps = Math.floor(holdDuration / (exercise.holdDurationSec ?? 10));
      return {
        count: prevState.count + Math.max(0, newReps - (prevState.inRep ? 0 : 0)),
        inRep: true,
        lastAngle: angle,
        formScore,
        feedback,
        peakAngle: angle,
        holdStart,
      };
    } else {
      // Not in position — reset hold
      return {
        ...prevState,
        inRep: false,
        holdStart: null,
        lastAngle: angle,
        formScore,
        feedback,
      };
    }
  }

  // ── REP-BASED EXERCISES ──
  const isDown = exercise.inverted
    ? angle <= exercise.downThreshold
    : angle <= exercise.downThreshold;
  const isUp = exercise.inverted
    ? angle >= exercise.upThreshold
    : angle >= exercise.upThreshold;

  let { count, inRep, peakAngle } = prevState;

  if (isDown && !inRep) {
    // Entering down position — start of rep
    inRep = true;
    peakAngle = angle;
  } else if (inRep) {
    peakAngle = exercise.inverted
      ? Math.min(peakAngle, angle)  // inverted: lower angle = deeper
      : Math.min(peakAngle, angle);
  }

  if (isUp && inRep) {
    // Completed a rep (down → up cycle)
    count++;
    inRep = false;
  }

  return { count, inRep, lastAngle: angle, formScore, feedback, peakAngle, holdStart: null };
}

/** Create initial rep state */
export function createRepState(): RepState {
  return {
    count: 0,
    inRep: false,
    lastAngle: 0,
    formScore: 100,
    feedback: [],
    peakAngle: 180,
    holdStart: null,
  };
}