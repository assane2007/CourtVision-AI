/**
 * Pure rep detection algorithm extracted from camera-workout.tsx
 * for testability. Contains no React, DOM, or side-effect dependencies.
 */

export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export type DrillCategory =
  | "pocket_ball"
  | "shifty"
  | "ball_handling"
  | "speed_change"
  | "defense"
  | "shooting"
  | "footwork"
  | "conditioning"
  | "passing";

export interface RepState {
  buffer: number[];
  lastRepTime: number;
  threshold: number;
}

export interface RepResult {
  rep: boolean;
  score: {
    movement: number;
    posture: number;
    arms: number;
    stance: number;
  };
}

export function detectRep(
  landmarks: Landmark[],
  prevLandmarks: Landmark[] | null,
  category: DrillCategory | string,
  state: RepState,
): RepResult {
  if (!prevLandmarks || landmarks.length < 33) {
    return { rep: false, score: { movement: 0, posture: 0, arms: 0, stance: 0 } };
  }

  const lShoulder = landmarks[11];
  const rShoulder = landmarks[12];
  const _lElbow = landmarks[13];
  const _rElbow = landmarks[14];
  const lWrist = landmarks[15];
  const rWrist = landmarks[16];
  const lHip = landmarks[23];
  const rHip = landmarks[24];
  const lKnee = landmarks[25];
  const rKnee = landmarks[26];
  const lAnkle = landmarks[27];
  const rAnkle = landmarks[28];
  const nose = landmarks[0];

  const plShoulder = prevLandmarks[11];
  const prShoulder = prevLandmarks[12];
  const plWrist = prevLandmarks[15];
  const prWrist = prevLandmarks[16];
  const plHip = prevLandmarks[23];
  const prHip = prevLandmarks[24];
  const pNose = prevLandmarks[0];

  const now = Date.now();

  // Movement metric: average landmark displacement
  let movement = 0;
  let count = 0;
  for (let i = 11; i <= 28; i++) {
    if (landmarks[i]?.visibility > 0.5 && prevLandmarks[i]?.visibility > 0.5) {
      const dx = landmarks[i].x - prevLandmarks[i].x;
      const dy = landmarks[i].y - prevLandmarks[i].y;
      movement += Math.sqrt(dx * dx + dy * dy);
      count++;
    }
  }
  movement = count > 0 ? movement / count : 0;

  // Posture: shoulders-hip alignment
  const shoulderMid = { x: (lShoulder.x + rShoulder.x) / 2, y: (lShoulder.y + rShoulder.y) / 2 };
  const hipMid = { x: (lHip.x + rHip.x) / 2, y: (lHip.y + rHip.y) / 2 };
  const postureAngle = Math.abs(Math.atan2(shoulderMid.x - hipMid.x, shoulderMid.y - hipMid.y));
  const posture = Math.max(0, 100 - postureAngle * 57.3 * 4);

  // Arms: wrist velocity
  let armVelocity = 0;
  if (lWrist.visibility > 0.5 && plWrist.visibility > 0.5) {
    armVelocity += Math.abs(lWrist.y - plWrist.y) + Math.abs(lWrist.x - plWrist.x);
  }
  if (rWrist.visibility > 0.5 && prWrist.visibility > 0.5) {
    armVelocity += Math.abs(rWrist.y - prWrist.y) + Math.abs(rWrist.x - prWrist.x);
  }
  const arms = Math.min(100, armVelocity * 800);

  // Stance: shoulder & hip width ratio
  const shoulderWidth = Math.abs(lShoulder.x - rShoulder.x);
  const hipWidth = Math.abs(lHip.x - rHip.x);
  const stance = hipWidth > 0 ? Math.min(100, (shoulderWidth / hipWidth) * 80) : 50;

  let rep = false;
  state.buffer.push(movement);

  if (state.buffer.length > 15) state.buffer.shift();

  const avg = state.buffer.reduce((a, b) => a + b, 0) / state.buffer.length;

  switch (category) {
    case "pocket_ball": {
      const bodyDrop = nose.y - pNose.y;
      const handMove = Math.abs(lWrist.y - plWrist.y) + Math.abs(rWrist.y - prWrist.y);
      if (bodyDrop > 0.01 && handMove > 0.03 && now - state.lastRepTime > 600) {
        rep = true;
        state.lastRepTime = now;
      }
      break;
    }
    case "shifty": {
      const lateralShift = Math.abs(shoulderMid.x - ((plShoulder.x + prShoulder.x) / 2));
      if (lateralShift > 0.015 && avg > 0.008 && now - state.lastRepTime > 500) {
        rep = true;
        state.lastRepTime = now;
      }
      break;
    }
    case "ball_handling": {
      const handOsc = Math.abs(lWrist.y - plWrist.y) + Math.abs(rWrist.y - prWrist.y);
      if (handOsc > 0.04 && now - state.lastRepTime > 400) {
        rep = true;
        state.lastRepTime = now;
      }
      break;
    }
    case "speed_change": {
      if (movement > state.threshold && now - state.lastRepTime > 700) {
        rep = true;
        state.lastRepTime = now;
        state.threshold = movement * 0.6;
      }
      if (state.buffer.length > 10 && avg < state.threshold * 0.3) {
        state.threshold = avg * 2.5;
      }
      break;
    }
    case "defense": {
      const stanceW = Math.abs(lKnee.x - rKnee.x);
      const prevStanceW = Math.abs(prevLandmarks[25].x - prevLandmarks[26].x);
      const stanceChange = Math.abs(stanceW - prevStanceW);
      const lateralMove = Math.abs(hipMid.x - ((plHip.x + prHip.x) / 2));
      if ((stanceChange > 0.01 || lateralMove > 0.015) && now - state.lastRepTime > 800) {
        rep = true;
        state.lastRepTime = now;
      }
      break;
    }
    case "shooting": {
      const armRaise = plWrist.y - lWrist.y + prWrist.y - rWrist.y;
      if (armRaise > 0.06 && now - state.lastRepTime > 1000) {
        rep = true;
        state.lastRepTime = now;
      }
      break;
    }
    case "footwork": {
      const footMove = Math.abs(lAnkle.x - prevLandmarks[27].x) + Math.abs(rAnkle.x - prevLandmarks[28].x);
      if (footMove > 0.025 && now - state.lastRepTime > 500) {
        rep = true;
        state.lastRepTime = now;
      }
      break;
    }
    default: {
      if (movement > 0.015 && now - state.lastRepTime > 600) {
        rep = true;
        state.lastRepTime = now;
      }
    }
  }

  return {
    rep,
    score: { movement: Math.min(100, movement * 600), posture, arms, stance },
  };
}