// Form Analyzer Engine
// Compute joint angles from pose landmarks, score shooting form

// MediaPipe Pose Landmarks indices (33 landmarks total)
// Reference: https://developers.google.com/mediapipe/solutions/vision/pose_landmarker
export const POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
} as const;

export type Landmark = { x: number; y: number; z: number; visibility: number };
export type PoseData = Landmark[];

// Calculate angle at point B given points A, B, C (in degrees)
export function angleAt(a: Landmark, b: Landmark, c: Landmark): number {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const cross = ab.x * cb.y - ab.y * cb.x;
  const angle = Math.atan2(Math.abs(cross), dot);
  return (angle * 180) / Math.PI;
}

// Determine if person is right-handed or left-handed based on which wrist is higher
// (shooting hand usually comes up higher during set position)
export function detectShootingHand(pose: PoseData): "R" | "L" | "unknown" {
  const rightWrist = pose[POSE_LANDMARKS.RIGHT_WRIST];
  const leftWrist = pose[POSE_LANDMARKS.LEFT_WRIST];
  if (!rightWrist || !leftWrist) return "unknown";
  if (rightWrist.visibility < 0.5 && leftWrist.visibility < 0.5) return "unknown";
  // Lower y = higher in image
  if (rightWrist.y < leftWrist.y - 0.05) return "R";
  if (leftWrist.y < rightWrist.y - 0.05) return "L";
  return "unknown";
}

export type FormMetrics = {
  // Joint angles (degrees)
  elbowAngle: number;       // shooting arm elbow (shoulder → elbow → wrist)
  kneeAngle: number;        // legs (hip → knee → ankle) — average of both
  shoulderAlignment: number; // |leftShoulderY - rightShoulderY| (0 = perfect, lower better)
  hipAlignment: number;     // |leftHipY - rightHipY|
  trunkAngle: number;        // trunk lean forward (degrees from vertical)
  // Derived
  shootingHand: "R" | "L" | "unknown";
  // Visibility checks
  visible: {
    upperBody: boolean;
    lowerBody: boolean;
    fullBody: boolean;
  };
};

export type FormScore = {
  total: number; // 0-100
  breakdown: {
    elbow: { score: number; feedback: { fr: string; en: string } };
    knee: { score: number; feedback: { fr: string; en: string } };
    alignment: { score: number; feedback: { fr: string; en: string } };
    balance: { score: number; feedback: { fr: string; en: string } };
    trunk: { score: number; feedback: { fr: string; en: string } };
  };
  overallFeedback: { fr: string; en: string };
  rating: "excellent" | "good" | "average" | "needs_work";
};

export function computeMetrics(pose: PoseData): FormMetrics | null {
  // Check we have essential landmarks with sufficient visibility
  const required = [
    POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.RIGHT_SHOULDER,
    POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.RIGHT_HIP,
  ];
  for (const idx of required) {
    if (!pose[idx] || pose[idx].visibility < 0.3) return null;
  }

  const ls = pose[POSE_LANDMARKS.LEFT_SHOULDER];
  const rs = pose[POSE_LANDMARKS.RIGHT_SHOULDER];
  const lh = pose[POSE_LANDMARKS.LEFT_HIP];
  const rh = pose[POSE_LANDMARKS.RIGHT_HIP];

  // Shooting hand detection
  const shootingHand = detectShootingHand(pose);

  // Elbow angle (use shooting arm if detected, else average both)
  let elbowAngle = 0;
  if (shootingHand === "R") {
    const elbow = pose[POSE_LANDMARKS.RIGHT_ELBOW];
    const wrist = pose[POSE_LANDMARKS.RIGHT_WRIST];
    if (elbow?.visibility > 0.3 && wrist?.visibility > 0.3) {
      elbowAngle = angleAt(rs, elbow, wrist);
    }
  } else if (shootingHand === "L") {
    const elbow = pose[POSE_LANDMARKS.LEFT_ELBOW];
    const wrist = pose[POSE_LANDMARKS.LEFT_WRIST];
    if (elbow?.visibility > 0.3 && wrist?.visibility > 0.3) {
      elbowAngle = angleAt(ls, elbow, wrist);
    }
  }
  if (elbowAngle === 0) {
    // Fallback: average both elbows if visible
    const le = pose[POSE_LANDMARKS.LEFT_ELBOW];
    const lw = pose[POSE_LANDMARKS.LEFT_WRIST];
    const re = pose[POSE_LANDMARKS.RIGHT_ELBOW];
    const rw = pose[POSE_LANDMARKS.RIGHT_WRIST];
    const angles: number[] = [];
    if (le?.visibility > 0.3 && lw?.visibility > 0.3) angles.push(angleAt(ls, le, lw));
    if (re?.visibility > 0.3 && rw?.visibility > 0.3) angles.push(angleAt(rs, re, rw));
    elbowAngle = angles.length ? angles.reduce((a, b) => a + b, 0) / angles.length : 0;
  }

  // Knee angles
  let kneeAngle = 0;
  const lk = pose[POSE_LANDMARKS.LEFT_KNEE];
  const la = pose[POSE_LANDMARKS.LEFT_ANKLE];
  const rk = pose[POSE_LANDMARKS.RIGHT_KNEE];
  const ra = pose[POSE_LANDMARKS.RIGHT_ANKLE];
  const kneeAngles: number[] = [];
  if (lk?.visibility > 0.3 && la?.visibility > 0.3) kneeAngles.push(angleAt(lh, lk, la));
  if (rk?.visibility > 0.3 && ra?.visibility > 0.3) kneeAngles.push(angleAt(rh, rk, ra));
  kneeAngle = kneeAngles.length ? kneeAngles.reduce((a, b) => a + b, 0) / kneeAngles.length : 0;

  // Alignment (lower = better, in normalized image coords, so multiply by 100 for percentage)
  const shoulderAlignment = Math.abs(ls.y - rs.y);
  const hipAlignment = Math.abs(lh.y - rh.y);

  // Trunk angle (lean forward): angle from vertical at hip midpoint
  const midShoulder = { x: (ls.x + rs.x) / 2, y: (ls.y + rs.y) / 2, z: 0, visibility: 1 };
  const midHip = { x: (lh.x + rh.x) / 2, y: (lh.y + rh.y) / 2, z: 0, visibility: 1 };
  // vertical reference (straight down from midShoulder)
  const vertical = { x: midShoulder.x, y: midShoulder.y + 1, z: 0, visibility: 1 };
  const trunkAngle = angleAt(midShoulder, midHip, vertical);

  // Visibility checks
  const upperBodyVisible = !!(ls.visibility > 0.5 && rs.visibility > 0.5);
  const lowerBodyVisible = !!(lh.visibility > 0.5 && rh.visibility > 0.5 && (lk?.visibility > 0.5 || rk?.visibility > 0.5));

  return {
    elbowAngle,
    kneeAngle,
    shoulderAlignment,
    hipAlignment,
    trunkAngle,
    shootingHand,
    visible: {
      upperBody: upperBodyVisible,
      lowerBody: lowerBodyVisible,
      fullBody: upperBodyVisible && lowerBodyVisible,
    },
  };
}

export function scoreForm(m: FormMetrics): FormScore {
  // Elbow: ideal at set ~90°, scoring depends on phase
  // For "set position" snapshot: 80-100° = excellent
  let elbowScore: number;
  if (m.elbowAngle === 0) elbowScore = 50; // unknown
  else if (m.elbowAngle >= 80 && m.elbowAngle <= 100) elbowScore = 100;
  else if (m.elbowAngle >= 70 && m.elbowAngle <= 110) elbowScore = 85;
  else if (m.elbowAngle >= 60 && m.elbowAngle <= 120) elbowScore = 70;
  else elbowScore = 50;

  const elbowFeedback = elbowScore >= 85
    ? { fr: "Coudé à 90° parfait — mécanique de tir élite.", en: "Perfect 90° elbow — elite shooting mechanics." }
    : elbowScore >= 70
    ? { fr: `Coude à ${m.elbowAngle.toFixed(0)}°. Vise 90° pour plus de constance.`, en: `Elbow at ${m.elbowAngle.toFixed(0)}°. Aim for 90° for more consistency.` }
    : { fr: `Coude à ${m.elbowAngle.toFixed(0)}° — trop fermé/ouvert. Travaille le set position.`, en: `Elbow at ${m.elbowAngle.toFixed(0)}° — too closed/open. Work on set position.` };

  // Knee: ideal 110-135° (slight bend, ready to generate power)
  let kneeScore: number;
  if (m.kneeAngle === 0) kneeScore = 50;
  else if (m.kneeAngle >= 110 && m.kneeAngle <= 140) kneeScore = 100;
  else if (m.kneeAngle >= 100 && m.kneeAngle <= 150) kneeScore = 80;
  else if (m.kneeAngle >= 90 && m.kneeAngle <= 160) kneeScore = 65;
  else kneeScore = 45;

  const kneeFeedback = kneeScore >= 85
    ? { fr: "Flexion des genoux optimale — prêt à générer la puissance.", en: "Optimal knee bend — ready to generate power." }
    : kneeScore >= 65
    ? { fr: `Genoux à ${m.kneeAngle.toFixed(0)}°. Plie un peu plus pour plus de puissance.`, en: `Knees at ${m.kneeAngle.toFixed(0)}°. Bend more for more power.` }
    : { fr: `Genoux à ${m.kneeAngle.toFixed(0)}° — fléchis plus pour charger tes jambes.`, en: `Knees at ${m.kneeAngle.toFixed(0)}° — bend more to load your legs.` };

  // Shoulder alignment: 0 = perfect, lower = better (multiply by 1000 for percentage-ish)
  // shoulderAlignment is in normalized coords (0-1), so a 0.02 diff = 2% body height
  const alignPct = m.shoulderAlignment * 100;
  let alignScore: number;
  if (alignPct <= 2) alignScore = 100;
  else if (alignPct <= 4) alignScore = 85;
  else if (alignPct <= 6) alignScore = 70;
  else if (alignPct <= 10) alignScore = 50;
  else alignScore = 30;

  const alignFeedback = alignScore >= 85
    ? { fr: "Épaules parfaitement alignées — base solide.", en: "Shoulders perfectly aligned — solid base." }
    : alignScore >= 70
    ? { fr: "Léger désalignement des épaules. Vise le carré au cercle.", en: "Slight shoulder misalignment. Square up to the rim." }
    : { fr: "Épaules inclinées — corrige ton alignement pour plus de précision.", en: "Tilted shoulders — fix your alignment for accuracy." };

  // Hip alignment (balance): same logic
  const hipPct = m.hipAlignment * 100;
  let balanceScore: number;
  if (hipPct <= 2) balanceScore = 100;
  else if (hipPct <= 4) balanceScore = 85;
  else if (hipPct <= 6) balanceScore = 70;
  else if (hipPct <= 10) balanceScore = 50;
  else balanceScore = 30;

  const balanceFeedback = balanceScore >= 85
    ? { fr: "Hanches équilibrées — bonne stabilité.", en: "Hips balanced — good stability." }
    : balanceScore >= 70
    ? { fr: "Léger déséquilibre des hanches. Centre ta gravité.", en: "Slight hip imbalance. Center your gravity." }
    : { fr: "Hanches déséquilibrées — travaille ta stabilité avant le tir.", en: "Hips unbalanced — work on stability before shooting." };

  // Trunk lean: 0-10° = excellent, 10-20° = good (slight forward lean is OK), >20° = leaning too much
  let trunkScore: number;
  if (m.trunkAngle <= 10) trunkScore = 100;
  else if (m.trunkAngle <= 20) trunkScore = 85;
  else if (m.trunkAngle <= 30) trunkScore = 65;
  else trunkScore = 45;

  const trunkFeedback = trunkScore >= 85
    ? { fr: "Tronc droit — bonne posture de tir.", en: "Trunk straight — good shooting posture." }
    : trunkScore >= 65
    ? { fr: `Tronc légèrement penché (${m.trunkAngle.toFixed(0)}°). Reste droit pour plus de contrôle.`, en: `Trunk slightly leaned (${m.trunkAngle.toFixed(0)}°). Stay upright for more control.` }
    : { fr: `Tronc trop penché (${m.trunkAngle.toFixed(0)}°). Redresse pour préserver l'équilibre.`, en: `Trunk too leaned (${m.trunkAngle.toFixed(0)}°). Straighten to preserve balance.` };

  // Total weighted: elbow 30%, knee 20%, alignment 20%, balance 15%, trunk 15%
  const total = Math.round(
    elbowScore * 0.30 +
    kneeScore * 0.20 +
    alignScore * 0.20 +
    balanceScore * 0.15 +
    trunkScore * 0.15
  );

  let rating: FormScore["rating"];
  if (total >= 85) rating = "excellent";
  else if (total >= 70) rating = "good";
  else if (total >= 50) rating = "average";
  else rating = "needs_work";

  const overallFeedback = rating === "excellent"
    ? { fr: "Mécanique d'élite ! Continue comme ça.", en: "Elite mechanics! Keep it up." }
    : rating === "good"
    ? { fr: "Bon form avec quelques ajustements à faire.", en: "Good form with a few tweaks to make." }
    : rating === "average"
    ? { fr: "Form correct mais travail Needed sur les bases.", en: "Decent form but work needed on fundamentals." }
    : { fr: "Form à retravailler. Concentre-toi sur les feedbacks ci-dessous.", en: "Form needs rework. Focus on the feedback below." };

  return {
    total,
    breakdown: {
      elbow: { score: elbowScore, feedback: elbowFeedback },
      knee: { score: kneeScore, feedback: kneeFeedback },
      alignment: { score: alignScore, feedback: alignFeedback },
      balance: { score: balanceScore, feedback: balanceFeedback },
      trunk: { score: trunkScore, feedback: trunkFeedback },
    },
    overallFeedback,
    rating,
  };
}

// Pose skeleton connections (for drawing)
export const POSE_CONNECTIONS: [number, number][] = [
  // Torso
  [11, 12], [11, 23], [12, 24], [23, 24],
  // Left arm
  [11, 13], [13, 15],
  // Right arm
  [12, 14], [14, 16],
  // Left leg
  [23, 25], [25, 27],
  // Right leg
  [24, 26], [26, 28],
  // Face/shoulders
  [0, 11], [0, 12],
];
