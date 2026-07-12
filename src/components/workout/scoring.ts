import {
  type Landmark,
  type RepTracker,
  type ScoreDetail,
  FEEDBACK_MESSAGES,
  POSE_CONNECTIONS,
  REP_DEBOUNCE_MS,
  LANDMARK_COLOR,
  LANDMARK_RADIUS,
  CONNECTION_WIDTH,
} from './types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-400'
  if (score >= 50) return 'text-orange-400'
  return 'text-red-400'
}

export function getScoreBgColor(score: number): string {
  if (score >= 80) return 'bg-emerald-500/20 border-emerald-500/30'
  if (score >= 50) return 'bg-orange-500/20 border-orange-500/30'
  return 'bg-red-500/20 border-red-500/30'
}

export function getGaugeColor(score: number): string {
  if (score >= 80) return '#34d399'  // emerald-400
  if (score >= 60) return '#4ade80'  // green-400
  if (score >= 30) return '#fbbf24'  // amber-400
  return '#f87171'                    // red-400
}

export function getGaugeTrackColor(score: number): string {
  if (score >= 80) return '#34d39933'
  if (score >= 60) return '#4ade8033'
  if (score >= 30) return '#fbbf2433'
  return '#f8717133'
}

export function getStarCount(score: number): number {
  if (score >= 90) return 5
  if (score >= 75) return 4
  if (score >= 60) return 3
  if (score >= 40) return 2
  return 1
}

export function createRepTracker(): RepTracker {
  return {
    lastPos: 0,
    direction: 'none',
    lastRepTime: 0,
    peakPositions: [],
    troughPositions: [],
    sampleCount: 0,
    totalMovement: 0,
    lastXPos: 0,
    lastYPos: 0,
    lastHipY: 0,
    lastWristY: 0,
    lastAnkleLX: 0,
    lastAnkleRX: 0,
    velocityHistory: [],
  }
}

export function computeScore(scores: ScoreDetail[]): number {
  if (scores.length === 0) return 0
  const recent = scores.slice(-10)

  // Movement is a prerequisite: if average movement is near 0, score = 0
  const avgMovement = recent.reduce((s, d) => s + d.movementQuality, 0) / recent.length
  if (avgMovement < 10) return 0

  // Movement quality is the dominant factor (55%), form is secondary (45%)
  const avg =
    recent.reduce(
      (sum, s) =>
        sum +
        (s.movementQuality * 0.55 +
          s.posture * 0.15 +
          s.stanceWidth * 0.08 +
          s.armPosition * 0.22),
      0,
    ) / recent.length
  return Math.round(Math.min(100, Math.max(0, avg)))
}

export function analyzeForm(
  landmarks: Landmark[],
  category: string,
  tracker: RepTracker,
): { score: ScoreDetail; feedback: string } {
  const lShoulder = landmarks[11]
  const rShoulder = landmarks[12]
  const lAnkle = landmarks[27]
  const rAnkle = landmarks[28]
  const lWrist = landmarks[15]
  const rWrist = landmarks[16]
  const lHip = landmarks[23]
  const rHip = landmarks[24]

  // ── 1. Posture: shoulders level? (0-100, baseline ~60) ──
  const shoulderDy = Math.abs(lShoulder.y - rShoulder.y)
  const postureScore = Math.max(0, Math.min(100, 90 - shoulderDy * 600))

  // ── 2. Stance width: ankle distance (0-100, baseline ~30) ──
  const ankleDist = Math.abs(lAnkle.x - rAnkle.x)
  let stanceScore = 30
  if (ankleDist > 0.15 && ankleDist < 0.45) stanceScore = 85
  else if (ankleDist > 0.1 && ankleDist < 0.55) stanceScore = 60
  else if (ankleDist < 0.1) stanceScore = 15
  else stanceScore = 20

  // ── 3. Arm position: depends on category (0-100, baseline ~30) ──
  let armScore = 30
  const avgWristY = (lWrist.y + rWrist.y) / 2
  const avgShoulderY = (lShoulder.y + rShoulder.y) / 2
  if (category === 'shooting') {
    const wristAbove = avgShoulderY - avgWristY
    armScore = Math.min(100, Math.max(0, 30 + wristAbove * 400))
  } else if (category === 'defense') {
    const wristBelow = avgWristY - avgShoulderY
    armScore = Math.min(100, Math.max(0, 30 + wristBelow * 300))
  } else if (category === 'ball_handling' || category === 'pocket_ball') {
    armScore = avgWristY > avgShoulderY ? 60 : 25
  }

  // ── 4. Movement quality (DOMINANT: 50% weight) (0-100, baseline 0) ──
  const velocities = tracker.velocityHistory
  let moveScore = 0
  if (velocities.length > 3) {
    const recent = velocities.slice(-10)
    const avgSpeed = recent.reduce((a, b) => a + b, 0) / recent.length

    if (avgSpeed < 0.001) {
      moveScore = 0
    } else if (avgSpeed < 0.002) {
      moveScore = 15
    } else if (avgSpeed < 0.008) {
      moveScore = Math.min(95, 40 + (avgSpeed - 0.002) * 15000)
    } else {
      moveScore = Math.max(30, 95 - (avgSpeed - 0.008) * 5000)
    }

    if (recent.length > 5) {
      const mean = recent.reduce((a, b) => a + b, 0) / recent.length
      const variance =
        recent.reduce((sum, v) => sum + (v - mean) ** 2, 0) / recent.length
      const variancePenalty = Math.min(30, variance * 50000)
      moveScore = Math.max(0, moveScore - variancePenalty)
    }
  }

  const score: ScoreDetail = {
    posture: postureScore,
    stanceWidth: stanceScore,
    armPosition: armScore,
    movementQuality: moveScore,
  }

  // ── Feedback generation ──
  let feedback = ''
  const hipMidX = (lHip.x + rHip.x) / 2
  const shoulderMidX = (lShoulder.x + rShoulder.x) / 2
  const lean = hipMidX - shoulderMidX

  if (velocities.length > 3) {
    const recentSpeed = velocities.slice(-5).reduce((a, b) => a + b, 0) / 5
    if (recentSpeed < 0.001) {
      feedback = FEEDBACK_MESSAGES.tooSlow
    }
  }
  if (!feedback && Math.abs(lean) > 0.04) {
    feedback = FEEDBACK_MESSAGES.leanRight
  }
  if (!feedback && category === 'shooting' && avgWristY > avgShoulderY + 0.05) {
    feedback = FEEDBACK_MESSAGES.armsLow
  }
  if (!feedback && ankleDist < 0.12 && category !== 'shooting') {
    feedback = FEEDBACK_MESSAGES.narrowStance
  }
  if (!feedback && ankleDist > 0.5 && category !== 'finishing') {
    feedback = FEEDBACK_MESSAGES.wideStance
  }
  if (!feedback && velocities.length > 5) {
    const recentSpeed = velocities.slice(-3).reduce((a, b) => a + b, 0) / 3
    if (recentSpeed > 0.003 && recentSpeed < 0.008) {
      feedback = FEEDBACK_MESSAGES.goodSpeed
    }
  }
  if (!feedback && postureScore > 80 && moveScore > 70) {
    feedback = FEEDBACK_MESSAGES.goodPosture
  }
  if (!feedback && postureScore > 90 && moveScore > 80) {
    feedback = FEEDBACK_MESSAGES.greatForm
  }

  return { score, feedback }
}

export function detectRep(
  landmarks: Landmark[],
  category: string,
  tracker: RepTracker,
  now: number,
): { rep: boolean; updatedTracker: RepTracker } {
  const t = { ...tracker }
  t.sampleCount++

  let repDetected = false

  const computeVelocity = (current: number, last: number): number =>
    Math.abs(current - last)

  switch (category) {
    case 'pocket_ball': case'ball_handling': {
      const wristY = (landmarks[15].y + landmarks[16].y) / 2
      const velocity = computeVelocity(wristY, t.lastWristY)
      t.velocityHistory.push(velocity)
      if (t.velocityHistory.length > 20) t.velocityHistory.shift()

      if (t.sampleCount > 5) {
        if (t.direction === 'up' && wristY > t.lastWristY + 0.01) {
          t.direction = 'down'
        } else if (t.direction === 'down' && wristY < t.lastWristY - 0.01) {
          t.direction = 'up'
          if (now - t.lastRepTime > REP_DEBOUNCE_MS) {
            repDetected = true
            t.lastRepTime = now
          }
        }
        if (t.direction === 'none') t.direction = wristY > t.lastWristY ? 'down' : 'up'
      }
      t.lastWristY = wristY
      break
    }
    case 'shifty':
    case 'speed_change': {
      const hipX = (landmarks[23].x + landmarks[24].x) / 2
      const velocity = computeVelocity(hipX, t.lastXPos)
      t.velocityHistory.push(velocity)
      if (t.velocityHistory.length > 20) t.velocityHistory.shift()

      if (t.sampleCount > 5) {
        if (t.direction === 'right' && hipX < t.lastXPos - 0.015) {
          t.direction = 'left'
        } else if (t.direction === 'left' && hipX > t.lastXPos + 0.015) {
          t.direction = 'right'
          if (now - t.lastRepTime > REP_DEBOUNCE_MS) {
            repDetected = true
            t.lastRepTime = now
          }
        }
        if (t.direction === 'none') t.direction = hipX > t.lastXPos ? 'right' : 'left'
      }
      t.lastXPos = hipX
      break
    }
    case 'defense': {
      const hipX = (landmarks[23].x + landmarks[24].x) / 2
      const velocity = computeVelocity(hipX, t.lastXPos)
      t.velocityHistory.push(velocity)
      if (t.velocityHistory.length > 20) t.velocityHistory.shift()

      if (t.sampleCount > 5) {
        if (t.direction === 'right' && hipX < t.lastXPos - 0.02) {
          t.direction = 'left'
        } else if (t.direction === 'left' && hipX > t.lastXPos + 0.02) {
          t.direction = 'right'
          if (now - t.lastRepTime > REP_DEBOUNCE_MS) {
            repDetected = true
            t.lastRepTime = now
          }
        }
        if (t.direction === 'none') t.direction = hipX > t.lastXPos ? 'right' : 'left'
      }
      t.lastXPos = hipX
      break
    }
    case 'shooting': {
      const wristY = Math.min(landmarks[15].y, landmarks[16].y)
      const velocity = computeVelocity(wristY, t.lastWristY)
      t.velocityHistory.push(velocity)
      if (t.velocityHistory.length > 20) t.velocityHistory.shift()

      if (t.sampleCount > 5) {
        if (t.direction === 'down' && wristY < t.lastWristY - 0.02) {
          t.direction = 'up'
        } else if (t.direction === 'up' && wristY > t.lastWristY + 0.02) {
          t.direction = 'down'
          if (now - t.lastRepTime > REP_DEBOUNCE_MS) {
            repDetected = true
            t.lastRepTime = now
          }
        }
        if (t.direction === 'none') t.direction = wristY > t.lastWristY ? 'down' : 'up'
      }
      t.lastWristY = wristY
      break
    }
    case 'footwork': {
      const lAnkleX = landmarks[27].x
      const rAnkleX = landmarks[28].x
      const footShift = Math.abs(lAnkleX - t.lastAnkleLX) + Math.abs(rAnkleX - t.lastAnkleRX)
      const velocity = footShift
      t.velocityHistory.push(velocity)
      if (t.velocityHistory.length > 20) t.velocityHistory.shift()

      if (t.sampleCount > 5 && footShift > 0.03) {
        if (now - t.lastRepTime > REP_DEBOUNCE_MS) {
          repDetected = true
          t.lastRepTime = now
        }
      }
      t.lastAnkleLX = lAnkleX
      t.lastAnkleRX = rAnkleX
      break
    }
    case 'finishing': {
      const hipY = (landmarks[23].y + landmarks[24].y) / 2
      const velocity = computeVelocity(hipY, t.lastHipY)
      t.velocityHistory.push(velocity)
      if (t.velocityHistory.length > 20) t.velocityHistory.shift()

      if (t.sampleCount > 5) {
        if (t.direction === 'down' && hipY < t.lastHipY - 0.03) {
          t.direction = 'up'
        } else if (t.direction === 'up' && hipY > t.lastHipY + 0.02) {
          t.direction = 'down'
          if (now - t.lastRepTime > REP_DEBOUNCE_MS) {
            repDetected = true
            t.lastRepTime = now
          }
        }
        if (t.direction === 'none') t.direction = hipY > t.lastHipY ? 'down' : 'up'
      }
      t.lastHipY = hipY
      break
    }
    case 'conditioning': {
      const hipX = (landmarks[23].x + landmarks[24].x) / 2
      const hipY = (landmarks[23].y + landmarks[24].y) / 2
      const dx = computeVelocity(hipX, t.lastXPos)
      const dy = computeVelocity(hipY, t.lastYPos)
      const speed = Math.sqrt(dx * dx + dy * dy)
      t.totalMovement += speed

      if (t.velocityHistory.length > 20) t.velocityHistory.shift()
      t.velocityHistory.push(speed)

      if (t.totalMovement > 0.5 && now - t.lastRepTime > REP_DEBOUNCE_MS * 2) {
        repDetected = true
        t.lastRepTime = now
        t.totalMovement = 0
      }
      t.lastXPos = hipX
      t.lastYPos = hipY
      break
    }
  }

  return { rep: repDetected, updatedTracker: t }
}

export function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark[],
  width: number,
  height: number,
) {
  ctx.clearRect(0, 0, width, height)
  if (!landmarks || landmarks.length < 33) return

  ctx.strokeStyle = LANDMARK_COLOR
  ctx.lineWidth = CONNECTION_WIDTH
  ctx.lineCap = 'round'

  for (const [i, j] of POSE_CONNECTIONS) {
    const a = landmarks[i]
    const b = landmarks[j]
    if (!a || !b) continue
    if ((a.visibility ?? 0) < 0.5 || (b.visibility ?? 0) < 0.5) continue

    const ax = (1 - a.x) * width
    const ay = a.y * height
    const bx = (1 - b.x) * width
    const by = b.y * height

    ctx.beginPath()
    ctx.moveTo(ax, ay)
    ctx.lineTo(bx, by)
    ctx.stroke()
  }

  for (let i = 0; i < landmarks.length; i++) {
    const lm = landmarks[i]
    if (!lm) continue
    if ((lm.visibility ?? 0) < 0.5) continue

    const x = (1 - lm.x) * width
    const y = lm.y * height

    ctx.beginPath()
    ctx.arc(x, y, LANDMARK_RADIUS, 0, Math.PI * 2)
    ctx.fillStyle = LANDMARK_COLOR
    ctx.fill()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1.5
    ctx.stroke()
  }
}