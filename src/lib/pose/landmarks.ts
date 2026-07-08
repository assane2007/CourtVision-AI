/**
 * MediaPipe Pose Landmark indices
 * Full 33-point body model
 */
export interface Landmark {
  x: number;  // 0..1 normalized
  y: number;  // 0..1 normalized
  z: number;  // depth relative to hips
  visibility?: number;
}

export interface PoseResult {
  landmarks: Landmark[];
  worldLandmarks: Landmark[];
}

// Key landmark indices
export const LM = {
  NOSE: 0,
  LEFT_EYE_INNER: 1, LEFT_EYE: 2, LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4, RIGHT_EYE: 5, RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7, RIGHT_EAR: 8,
  MOUTH_LEFT: 9, MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11, RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13, RIGHT_ELBOW: 14,
  LEFT_WRIST: 15, RIGHT_WRIST: 16,
  LEFT_PINKY: 17, RIGHT_PINKY: 18,
  LEFT_INDEX: 19, RIGHT_INDEX: 20,
  LEFT_THUMB: 21, RIGHT_THUMB: 22,
  LEFT_HIP: 23, RIGHT_HIP: 24,
  LEFT_KNEE: 25, RIGHT_KNEE: 26,
  LEFT_ANKLE: 27, RIGHT_ANKLE: 28,
  LEFT_HEEL: 29, RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31, RIGHT_FOOT_INDEX: 32,
} as const;

/** Calculate angle (degrees) at point B given three landmarks A-B-C */
export function angleDeg(a: Landmark, b: Landmark, c: Landmark): number {
  const ba = { x: a.x - b.x, y: a.y - b.y };
  const bc = { x: c.x - b.x, y: c.y - b.y };
  const dot = ba.x * bc.x + ba.y * bc.y;
  const magBA = Math.sqrt(ba.x * ba.x + ba.y * ba.y);
  const magBC = Math.sqrt(bc.x * bc.x + bc.y * bc.y);
  if (magBA < 1e-6 || magBC < 1e-6) return 0;
  const cos = Math.max(-1, Math.min(1, dot / (magBA * magBC)));
  return Math.acos(cos) * (180 / Math.PI);
}

/** Get landmark or null if not visible */
export function getLandmark(landmarks: Landmark[], idx: number, minVis = 0.5): Landmark | null {
  const lm = landmarks[idx];
  if (!lm) return null;
  if (lm.visibility !== undefined && lm.visibility < minVis) return null;
  return lm;
}

/** Midpoint of two landmarks */
export function midpoint(a: Landmark, b: Landmark): Landmark {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 };
}

/** Angle at a joint using landmark indices */
export function jointAngle(landmarks: Landmark[], a: number, b: number, c: number, minVis = 0.5): number {
  const la = getLandmark(landmarks, a, minVis);
  const lb = getLandmark(landmarks, b, minVis);
  const lc = getLandmark(landmarks, c, minVis);
  if (!la || !lb || !lc) return -1; // -1 = not visible
  return angleDeg(la, lb, lc);
}

// Predefined angle getters for common joints
export const Joints = {
  leftKnee:   (lm: Landmark[]) => jointAngle(lm, LM.LEFT_HIP, LM.LEFT_KNEE, LM.LEFT_ANKLE),
  rightKnee:  (lm: Landmark[]) => jointAngle(lm, LM.RIGHT_HIP, LM.RIGHT_KNEE, LM.RIGHT_ANKLE),
  leftElbow:  (lm: Landmark[]) => jointAngle(lm, LM.LEFT_SHOULDER, LM.LEFT_ELBOW, LM.LEFT_WRIST),
  rightElbow: (lm: Landmark[]) => jointAngle(lm, LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW, LM.RIGHT_WRIST),
  leftHip:    (lm: Landmark[]) => jointAngle(lm, LM.LEFT_SHOULDER, LM.LEFT_HIP, LM.LEFT_KNEE),
  rightHip:   (lm: Landmark[]) => jointAngle(lm, LM.RIGHT_SHOULDER, LM.RIGHT_HIP, LM.RIGHT_KNEE),
  leftShoulder:(lm: Landmark[]) => jointAngle(lm, LM.LEFT_HIP, LM.LEFT_SHOULDER, LM.LEFT_ELBOW),
  rightShoulder:(lm: Landmark[]) => jointAngle(lm, LM.RIGHT_HIP, LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW),
  avgKnee:    (lm: Landmark[]) => {
    const l = Joints.leftKnee(lm), r = Joints.rightKnee(lm);
    if (l < 0 || r < 0) return l < 0 ? r : l;
    return (l + r) / 2;
  },
  avgElbow:   (lm: Landmark[]) => {
    const l = Joints.leftElbow(lm), r = Joints.rightElbow(lm);
    if (l < 0 || r < 0) return l < 0 ? r : l;
    return (l + r) / 2;
  },
};

/** Is the body vertical? (good for squat/plank form) */
export function isVertical(landmarks: Landmark[], tolerance = 15): boolean {
  const lShoulder = getLandmark(landmarks, LM.LEFT_SHOULDER);
  const rShoulder = getLandmark(landmarks, LM.RIGHT_SHOULDER);
  const lHip = getLandmark(landmarks, LM.LEFT_HIP);
  const rHip = getLandmark(landmarks, LM.RIGHT_HIP);
  if (!lShoulder || !rShoulder || !lHip || !rHip) return false;
  const shoulderMid = midpoint(lShoulder, rShoulder);
  const hipMid = midpoint(lHip, rHip);
  const spineAngle = Math.abs(Math.atan2(shoulderMid.x - hipMid.x, shoulderMid.y - hipMid.y)) * (180 / Math.PI);
  return spineAngle < tolerance;
}

/** Distance between two landmarks (normalized 0..1) */
export function distance(a: Landmark, b: Landmark): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

/** Get the side (left/right) with better visibility for a joint chain */
export function bestSide(landmarks: Landmark[]): "left" | "right" {
  const lv = landmarks[LM.LEFT_SHOULDER]?.visibility ?? 0;
  const rv = landmarks[LM.RIGHT_SHOULDER]?.visibility ?? 0;
  return lv >= rv ? "left" : "right";
}