'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

// ── Types ────────────────────────────────────────────────────────────
interface DrillDemoAnimationProps {
  category: string
  className?: string
}

// ── Constants ────────────────────────────────────────────────────────
const C = '#f97316'  // stick figure / ball color
const SW = 2.5       // stroke width
const HR = 10        // head radius
const FY = 162       // floor Y

// ── Shared SVG Elements ──────────────────────────────────────────────

/** Basketball: orange circle with seam lines */
function Basketball({ cx, cy, r = 8 }: { cx: number; cy: number; r?: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={C} />
      <line x1={cx} y1={cy - r} x2={cx} y2={cy + r} stroke="#7c2d12" strokeWidth={0.7} />
      <line x1={cx - r} y1={cy} x2={cx + r} y2={cy} stroke="#7c2d12" strokeWidth={0.7} />
      <path
        d={`M${cx - r * 0.7},${cy - r} Q${cx - r * 0.3},${cy} ${cx - r * 0.7},${cy + r}`}
        stroke="#7c2d12" strokeWidth={0.6} fill="none"
      />
      <path
        d={`M${cx + r * 0.7},${cy - r} Q${cx + r * 0.3},${cy} ${cx + r * 0.7},${cy + r}`}
        stroke="#7c2d12" strokeWidth={0.6} fill="none"
      />
    </g>
  )
}

/** Court floor with hash marks */
function CourtFloor() {
  return (
    <g>
      <line x1={8} y1={FY} x2={232} y2={FY} stroke="#374151" strokeWidth={1.5} />
      {[50, 90, 120, 150, 190].map((x) => (
        <line key={x} x1={x} y1={FY} x2={x} y2={FY + 4} stroke="#2d3748" strokeWidth={0.7} />
      ))}
    </g>
  )
}

/** DÉMO badge overlay top-left */
function DemoBadge() {
  return (
    <g>
      <rect x={8} y={6} width={38} height={16} rx={4} fill="white" fillOpacity={0.1} />
      <text
        x={27} y={17}
        fill="white" fontSize={8} fontWeight={700}
        fontFamily="system-ui, sans-serif" textAnchor="middle" opacity={0.75}
      >
        DÉMO
      </text>
    </g>
  )
}

/** Static stick-figure head */
function Head({ cx, cy }: { cx: number; cy: number }) {
  return <circle cx={cx} cy={cy} r={HR} fill="none" stroke={C} strokeWidth={SW} />
}

/** Hoop (backboard + rim) for shooting / finishing scenes */
function Hoop({ x, y }: { x: number; y: number }) {
  return (
    <g>
      {/* Pole */}
      <line x1={x + 4} y1={y - 18} x2={x + 4} y2={FY} stroke="#4b5563" strokeWidth={2.5} />
      {/* Backboard */}
      <rect x={x - 4} y={y - 22} width={16} height={28} rx={2} fill="none" stroke="#6b7280" strokeWidth={2} />
      {/* Rim */}
      <line x1={x - 18} y1={y + 4} x2={x + 4} y2={y + 4} stroke="#ef4444" strokeWidth={2.5} strokeLinecap="round" />
      {/* Net hint */}
      <line x1={x - 14} y1={y + 7} x2={x - 8} y2={y + 18} stroke="#9ca3af" strokeWidth={0.5} opacity={0.5} />
      <line x1={x - 6} y1={y + 7} x2={x - 2} y2={y + 18} stroke="#9ca3af" strokeWidth={0.5} opacity={0.5} />
      <line x1={x + 2} y1={y + 7} x2={x + 3} y2={y + 18} stroke="#9ca3af" strokeWidth={0.5} opacity={0.5} />
    </g>
  )
}

/** Small triangular direction arrow */
function DirArrow({ x, y, rot = 0 }: { x: number; y: number; rot?: number }) {
  return (
    <polygon
      points="-5,-3.5 5,0 -5,3.5"
      fill={C}
      transform={`translate(${x},${y}) rotate(${rot})`}
    />
  )
}

/** Speed lines (horizontal dashes) */
function SpeedLines({ x, y }: { x: number; y: number }) {
  return (
    <g opacity={0.4}>
      <line x1={x} y1={y - 8} x2={x - 18} y2={y - 8} stroke={C} strokeWidth={1.2} strokeLinecap="round" />
      <line x1={x + 5} y1={y} x2={x - 15} y2={y} stroke={C} strokeWidth={1.2} strokeLinecap="round" />
      <line x1={x} y1={y + 8} x2={x - 12} y2={y + 8} stroke={C} strokeWidth={1.2} strokeLinecap="round" />
    </g>
  )
}

// ══════════════════════════════════════════════════════════════════════
// ANIMATION: pocket_ball — Low dribble, crossovers near hip
// ══════════════════════════════════════════════════════════════════════
function PocketBallAnim() {
  return (
    <g>
      {/* Stick figure — wide athletic stance */}
      <Head cx={120} cy={52} />
      <line x1={120} y1={62} x2={118} y2={105} stroke={C} strokeWidth={SW} strokeLinecap="round" />

      {/* Left arm — follows ball */}
      <motion.line
        x1={120} y1={75} x2={98} y2={98}
        stroke={C} strokeWidth={SW} strokeLinecap="round"
        animate={{ x2: [98, 142, 98] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Right arm — follows ball */}
      <motion.line
        x1={120} y1={75} x2={142} y2={98}
        stroke={C} strokeWidth={SW} strokeLinecap="round"
        animate={{ x2: [142, 98, 142] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Legs — wide */}
      <line x1={118} y1={105} x2={95} y2={156} stroke={C} strokeWidth={SW} strokeLinecap="round" />
      <line x1={118} y1={105} x2={143} y2={156} stroke={C} strokeWidth={SW} strokeLinecap="round" />

      {/* Ball — bounces low with crossover */}
      <motion.g
        animate={{ x: [0, 28, -28, 0] }}
        transition={{
          duration: 1.6, repeat: Infinity, ease: 'easeInOut',
          times: [0, 0.35, 0.65, 1],
        }}
      >
        <motion.g
          animate={{ y: [4, -18, 4] }}
          transition={{ duration: 0.55, repeat: Infinity, ease: 'easeOut' }}
        >
          <Basketball cx={120} cy={136} r={8} />
        </motion.g>
      </motion.g>

      {/* Crossover arrows */}
      <motion.g
        animate={{ opacity: [0, 0.55, 0], x: [0, -6, 0] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
      >
        <DirArrow x={72} y={132} rot={180} />
      </motion.g>
      <motion.g
        animate={{ opacity: [0, 0.55, 0], x: [0, 6, 0] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <DirArrow x={168} y={132} rot={0} />
      </motion.g>
    </g>
  )
}

// ══════════════════════════════════════════════════════════════════════
// ANIMATION: shifty — Lateral side-to-side shuffle
// ══════════════════════════════════════════════════════════════════════
function ShiftyAnim() {
  return (
    <g>
      {/* Entire figure slides laterally */}
      <motion.g
        animate={{ x: [-38, 38, -38] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Head cx={120} cy={50} />
        <line x1={120} y1={60} x2={118} y2={100} stroke={C} strokeWidth={SW} strokeLinecap="round" />

        {/* Arms — slightly out for balance */}
        <motion.line
          x1={120} y1={72} x2={88} y2={82}
          stroke={C} strokeWidth={SW} strokeLinecap="round"
          animate={{ x2: [88, 96, 88], x1: [120, 114, 120] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.line
          x1={120} y1={72} x2={152} y2={82}
          stroke={C} strokeWidth={SW} strokeLinecap="round"
          animate={{ x2: [152, 144, 152], x1: [120, 126, 120] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Legs — wide, shuffling */}
        <motion.line
          x1={118} y1={100} x2={95} y2={156}
          stroke={C} strokeWidth={SW} strokeLinecap="round"
          animate={{ x2: [95, 108, 95] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.line
          x1={118} y1={100} x2={141} y2={156}
          stroke={C} strokeWidth={SW} strokeLinecap="round"
          animate={{ x2: [141, 128, 141] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.g>

      {/* Direction arrows */}
      <motion.g
        animate={{ opacity: [0, 0.6, 0] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <DirArrow x={30} y={90} rot={180} />
      </motion.g>
      <motion.g
        animate={{ opacity: [0, 0.6, 0] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: 1.1 }}
      >
        <DirArrow x={210} y={90} rot={0} />
      </motion.g>
    </g>
  )
}

// ══════════════════════════════════════════════════════════════════════
// ANIMATION: ball_handling — Figure-8 dribbling, alternating hands
// ══════════════════════════════════════════════════════════════════════
function BallHandlingAnim() {
  return (
    <g>
      {/* Stick figure — standing */}
      <Head cx={120} cy={48} />
      <motion.g
        animate={{ x: [0, 0, 0] }}
      >
        <line x1={120} y1={58} x2={120} y2={100} stroke={C} strokeWidth={SW} strokeLinecap="round" />

        {/* Arms — follow ball in figure-8 */}
        <motion.line
          x1={120} y1={70}
          stroke={C} strokeWidth={SW} strokeLinecap="round"
          animate={{
            x2: [100, 140, 100],
            y2: [88, 88, 88],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.line
          x1={120} y1={70}
          stroke={C} strokeWidth={SW} strokeLinecap="round"
          animate={{
            x2: [140, 100, 140],
            y2: [88, 88, 88],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Legs — slight stance */}
        <line x1={120} y1={100} x2={105} y2={156} stroke={C} strokeWidth={SW} strokeLinecap="round" />
        <line x1={120} y1={100} x2={135} y2={156} stroke={C} strokeWidth={SW} strokeLinecap="round" />
      </motion.g>

      {/* Ball — figure-8 motion */}
      <motion.g
        animate={{
          x: [-22, 0, 22, 0, -22],
          y: [8, -12, 8, 22, 8],
        }}
        transition={{
          duration: 2, repeat: Infinity, ease: 'easeInOut',
          times: [0, 0.25, 0.5, 0.75, 1],
        }}
      >
        <Basketball cx={120} cy={125} r={8} />
      </motion.g>

      {/* Figure-8 path hint */}
      <ellipse cx={120} cy={125} rx={24} ry={16} fill="none" stroke={C} strokeWidth={0.5} opacity={0.2} />
    </g>
  )
}

// ══════════════════════════════════════════════════════════════════════
// ANIMATION: speed_change — Burst forward, decelerate
// ══════════════════════════════════════════════════════════════════════
function SpeedChangeAnim() {
  return (
    <g>
      {/* Figure — non-linear forward motion */}
      <motion.g
        animate={{
          x: [-30, -30, 50, 50, -30],
        }}
        transition={{
          duration: 3, repeat: Infinity, ease: 'easeInOut',
          times: [0, 0.15, 0.45, 0.6, 1],
        }}
      >
        {/* Lean forward during burst */}
        <motion.g
          animate={{ rotate: [0, 0, -8, -8, 0] }}
          transition={{
            duration: 3, repeat: Infinity, ease: 'easeInOut',
            times: [0, 0.15, 0.45, 0.6, 1],
          }}
          style={{ originX: '120px', originY: '100px' }}
        >
          <Head cx={120} cy={48} />
          <line x1={120} y1={58} x2={118} y2={100} stroke={C} strokeWidth={SW} strokeLinecap="round" />

          {/* Arms — pump during run */}
          <motion.line
            x1={120} y1={70} x2={96} y2={58}
            stroke={C} strokeWidth={SW} strokeLinecap="round"
            animate={{ y2: [80, 80, 55, 80, 80] }}
            transition={{
              duration: 3, repeat: Infinity, ease: 'easeInOut',
              times: [0, 0.15, 0.45, 0.6, 1],
            }}
          />
          <motion.line
            x1={120} y1={70} x2={144} y2={58}
            stroke={C} strokeWidth={SW} strokeLinecap="round"
            animate={{ y2: [80, 80, 85, 80, 80] }}
            transition={{
              duration: 3, repeat: Infinity, ease: 'easeInOut',
              times: [0, 0.15, 0.45, 0.6, 1],
            }}
          />

          {/* Legs — running stride */}
          <motion.line
            x1={118} y1={100} x2={140} y2={156}
            stroke={C} strokeWidth={SW} strokeLinecap="round"
            animate={{ x2: [105, 105, 145, 105, 105] }}
            transition={{
              duration: 3, repeat: Infinity, ease: 'easeInOut',
              times: [0, 0.15, 0.35, 0.45, 1],
            }}
          />
          <motion.line
            x1={118} y1={100} x2={96} y2={156}
            stroke={C} strokeWidth={SW} strokeLinecap="round"
            animate={{ x2: [131, 131, 91, 131, 131] }}
            transition={{
              duration: 3, repeat: Infinity, ease: 'easeInOut',
              times: [0, 0.15, 0.35, 0.45, 1],
            }}
          />
        </motion.g>

        {/* Speed lines — visible during burst phase */}
        <motion.g
          animate={{ opacity: [0, 0, 0.5, 0.5, 0] }}
          transition={{
            duration: 3, repeat: Infinity,
            times: [0, 0.15, 0.25, 0.5, 0.6],
          }}
        >
          <SpeedLines x={85} y={80} />
        </motion.g>
      </motion.g>

      {/* Direction arrow */}
      <motion.g
        animate={{ opacity: [0, 0, 0.6, 0.3, 0], x: [0, 0, 8, 14, 0] }}
        transition={{
          duration: 3, repeat: Infinity, ease: 'easeInOut',
          times: [0, 0.1, 0.3, 0.5, 0.7],
        }}
      >
        <DirArrow x={60} y={78} rot={0} />
      </motion.g>
    </g>
  )
}

// ══════════════════════════════════════════════════════════════════════
// ANIMATION: defense — Low stance, lateral slides, hands up
// ══════════════════════════════════════════════════════════════════════
function DefenseAnim() {
  return (
    <g>
      {/* Figure slides laterally in low stance */}
      <motion.g
        animate={{ x: [-32, 32, -32] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Head cx={120} cy={58} />
        {/* Torso — short, low stance */}
        <line x1={120} y1={68} x2={120} y2={112} stroke={C} strokeWidth={SW} strokeLinecap="round" />

        {/* Arms — hands up wide (defensive) */}
        <line x1={120} y1={80} x2={85} y2={62} stroke={C} strokeWidth={SW} strokeLinecap="round" />
        <line x1={120} y1={80} x2={155} y2={62} stroke={C} strokeWidth={SW} strokeLinecap="round" />

        {/* Legs — very wide, low stance */}
        <line x1={120} y1={112} x2={90} y2={156} stroke={C} strokeWidth={SW} strokeLinecap="round" />
        <line x1={120} y1={112} x2={150} y2={156} stroke={C} strokeWidth={SW} strokeLinecap="round" />
      </motion.g>

      {/* Defensive stance indicator — dashed arc below */}
      <motion.ellipse
        cx={120} cy={170}
        rx={40} ry={3}
        fill="none" stroke={C} strokeWidth={0.8}
        strokeDasharray="3 3"
        animate={{ rx: [40, 72, 40] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        opacity={0.25}
      />

      {/* Arrows */}
      <motion.g
        animate={{ opacity: [0, 0.5, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <DirArrow x={30} y={100} rot={180} />
      </motion.g>
      <motion.g
        animate={{ opacity: [0, 0.5, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }}
      >
        <DirArrow x={210} y={100} rot={0} />
      </motion.g>
    </g>
  )
}

// ══════════════════════════════════════════════════════════════════════
// ANIMATION: shooting — Raise ball, follow through, ball arcs to hoop
// ══════════════════════════════════════════════════════════════════════
function ShootingAnim() {
  return (
    <g>
      {/* Hoop at right side */}
      <Hoop x={205} y={42} />

      {/* Stick figure */}
      <Head cx={100} cy={50} />
      <line x1={100} y1={60} x2={100} y2={102} stroke={C} strokeWidth={SW} strokeLinecap="round" />

      {/* Off arm (guide hand) */}
      <motion.line
        x1={100} y1={72}
        stroke={C} strokeWidth={SW} strokeLinecap="round"
        animate={{
          x2: [84, 82, 84, 84],
          y2: [82, 60, 55, 82],
        }}
        transition={{
          duration: 2.4, repeat: Infinity, ease: 'easeInOut',
          times: [0, 0.3, 0.5, 1],
        }}
      />

      {/* Shooting arm — raises up and follows through */}
      <motion.line
        x1={100} y1={72}
        stroke={C} strokeWidth={SW} strokeLinecap="round"
        animate={{
          x2: [116, 114, 108, 116],
          y2: [82, 40, 28, 82],
        }}
        transition={{
          duration: 2.4, repeat: Infinity, ease: 'easeInOut',
          times: [0, 0.3, 0.5, 1],
        }}
      />

      {/* Legs — wide stance, slight bend */}
      <line x1={100} y1={102} x2={80} y2={156} stroke={C} strokeWidth={SW} strokeLinecap="round" />
      <line x1={100} y1={102} x2={120} y2={156} stroke={C} strokeWidth={SW} strokeLinecap="round" />

      {/* Ball — starts at shooting pocket, arcs to hoop */}
      <motion.g
        animate={{
          x: [0, -4, 72, 92, 92],
          y: [0, -50, -60, -42, 0],
        }}
        transition={{
          duration: 2.4, repeat: Infinity, ease: [0.4, 0, 0.6, 1],
          times: [0, 0.2, 0.5, 0.7, 1],
        }}
      >
        <circle cx={118} cy={88} r={7} fill={C} />
      </motion.g>

      {/* Arc trail hint */}
      <motion.path
        d="M118,88 Q160,20 190,46"
        fill="none" stroke={C} strokeWidth={0.8}
        strokeDasharray="2 3"
        animate={{ opacity: [0, 0.3, 0.3, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, times: [0, 0.15, 0.5, 0.75] }}
      />
    </g>
  )
}

// ══════════════════════════════════════════════════════════════════════
// ANIMATION: footwork — Top-down ladder drill (feet stepping pattern)
// ══════════════════════════════════════════════════════════════════════
function FootworkAnim() {
  // Ladder rungs (top-down view)
  const rungYs = [80, 95, 110, 125, 140]
  const ladderX1 = 60
  const ladderX2 = 180

  return (
    <g>
      {/* Label hint */}
      <text x={120} y={28} fill="white" fontSize={7} textAnchor="middle" opacity={0.35} fontFamily="system-ui, sans-serif">
        VUE DU DESSUS
      </text>

      {/* Ladder */}
      <line x1={ladderX1} y1={70} x2={ladderX1} y2={148} stroke="#4b5563" strokeWidth={2} />
      <line x1={ladderX2} y1={70} x2={ladderX2} y2={148} stroke="#4b5563" strokeWidth={2} />
      {rungYs.map((y) => (
        <line key={y} x1={ladderX1} y1={y} x2={ladderX2} y2={y} stroke="#4b5563" strokeWidth={1.2} />
      ))}

      {/* Left foot (oval) — steps: in, out, in, out pattern */}
      <motion.ellipse
        rx={7} ry={10}
        fill={C} fillOpacity={0.8} stroke={C} strokeWidth={1.5}
        animate={{
          cx: [100, 100, 140, 140, 100],
          cy: [80, 95, 110, 125, 140],
        }}
        transition={{
          duration: 2, repeat: Infinity, ease: 'easeInOut',
          times: [0, 0.25, 0.5, 0.75, 1],
        }}
      />

      {/* Right foot (oval) — opposite pattern */}
      <motion.ellipse
        rx={7} ry={10}
        fill={C} fillOpacity={0.5} stroke={C} strokeWidth={1.5}
        animate={{
          cx: [140, 140, 100, 100, 140],
          cy: [80, 95, 110, 125, 140],
        }}
        transition={{
          duration: 2, repeat: Infinity, ease: 'easeInOut',
          times: [0, 0.25, 0.5, 0.75, 1],
        }}
      />

      {/* Forward direction arrow */}
      <motion.g
        animate={{ opacity: [0.3, 0.7, 0.3], y: [0, 3, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <polygon points="120,155 112,165 128,165" fill={C} opacity={0.5} />
      </motion.g>
    </g>
  )
}

// ══════════════════════════════════════════════════════════════════════
// ANIMATION: finishing — Drive, jump, layup at rim
// ══════════════════════════════════════════════════════════════════════
function FinishingAnim() {
  return (
    <g>
      {/* Hoop */}
      <Hoop x={208} y={42} />

      {/* Figure — drives from left, jumps, lays up */}
      <motion.g
        animate={{
          x: [-40, -10, 20, 40, 55, 55],
        }}
        transition={{
          duration: 2.6, repeat: Infinity, ease: 'easeInOut',
          times: [0, 0.2, 0.35, 0.45, 0.55, 1],
        }}
      >
        {/* Jump effect */}
        <motion.g
          animate={{ y: [0, 0, 0, -28, -32, 0] }}
          transition={{
            duration: 2.6, repeat: Infinity, ease: [0.4, 0, 0.6, 1],
            times: [0, 0.2, 0.35, 0.45, 0.55, 0.75],
          }}
        >
          <Head cx={120} cy={48} />
          <line x1={120} y1={58} x2={118} y2={100} stroke={C} strokeWidth={SW} strokeLinecap="round" />

          {/* Off arm */}
          <motion.line
            x1={120} y1={72}
            stroke={C} strokeWidth={SW} strokeLinecap="round"
            animate={{ x2: [104, 104, 96, 96], y2: [80, 82, 58, 80] }}
            transition={{
              duration: 2.6, repeat: Infinity, ease: 'easeInOut',
              times: [0, 0.2, 0.45, 1],
            }}
          />

          {/* Shooting arm — extends to layup */}
          <motion.line
            x1={120} y1={72}
            stroke={C} strokeWidth={SW} strokeLinecap="round"
            animate={{ x2: [136, 140, 158, 136], y2: [80, 78, 44, 80] }}
            transition={{
              duration: 2.6, repeat: Infinity, ease: [0.4, 0, 0.6, 1],
              times: [0, 0.2, 0.45, 1],
            }}
          />

          {/* Legs — running stride then tuck for jump */}
          <motion.line
            x1={118} y1={100}
            stroke={C} strokeWidth={SW} strokeLinecap="round"
            animate={{ x2: [105, 138, 130, 105], y2: [156, 156, 140, 156] }}
            transition={{
              duration: 2.6, repeat: Infinity, ease: 'easeInOut',
              times: [0, 0.15, 0.35, 0.5],
            }}
          />
          <motion.line
            x1={118} y1={100}
            stroke={C} strokeWidth={SW} strokeLinecap="round"
            animate={{ x2: [132, 98, 108, 132], y2: [156, 156, 140, 156] }}
            transition={{
              duration: 2.6, repeat: Infinity, ease: 'easeInOut',
              times: [0, 0.15, 0.35, 0.5],
            }}
          />
        </motion.g>

        </motion.g>

      {/* Ball — independent trajectory for layup arc */}
      <motion.g
        animate={{
          x: [-40 + 16, -10 + 20, 20 + 38, 55 + 48, 55 + 48, -40 + 16],
          y: [82, 78, 14, 14, 82, 82],
        }}
        transition={{
          duration: 2.6, repeat: Infinity, ease: [0.4, 0, 0.6, 1],
          times: [0, 0.15, 0.42, 0.58, 0.72, 1],
        }}
      >
        <circle cx={120} cy={0} r={7} fill={C} />
      </motion.g>

      {/* Drive arrow */}
      <motion.g
        animate={{ opacity: [0, 0.5, 0], x: [0, 10, 0] }}
        transition={{ duration: 2.6, repeat: Infinity, times: [0, 0.1, 0.25] }}
      >
        <DirArrow x={50} y={78} rot={0} />
      </motion.g>
    </g>
  )
}

// ══════════════════════════════════════════════════════════════════════
// ANIMATION: conditioning — Jumping, arms pumping
// ══════════════════════════════════════════════════════════════════════
function ConditioningAnim() {
  return (
    <g>
      <motion.g
        animate={{ y: [0, -30, 0] }}
        transition={{ duration: 0.8, repeat: Infinity, ease: 'easeOut' }}
      >
        <Head cx={120} cy={46} />
        <line x1={120} y1={56} x2={120} y2={100} stroke={C} strokeWidth={SW} strokeLinecap="round" />

        {/* Arms — pump up and down */}
        <motion.line
          x1={120} y1={68}
          stroke={C} strokeWidth={SW} strokeLinecap="round"
          animate={{ x2: [98, 98, 102], y2: [82, 52, 82] }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'easeOut', times: [0, 0.4, 1] }}
        />
        <motion.line
          x1={120} y1={68}
          stroke={C} strokeWidth={SW} strokeLinecap="round"
          animate={{ x2: [142, 142, 138], y2: [52, 82, 52] }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'easeOut', times: [0, 0.4, 1] }}
        />

        {/* Legs — bend on landing, extend on jump */}
        <motion.line
          x1={120} y1={100}
          stroke={C} strokeWidth={SW} strokeLinecap="round"
          animate={{ x2: [106, 102, 106], y2: [156, 148, 156] }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'easeOut', times: [0, 0.4, 1] }}
        />
        <motion.line
          x1={120} y1={100}
          stroke={C} strokeWidth={SW} strokeLinecap="round"
          animate={{ x2: [134, 138, 134], y2: [156, 148, 156] }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'easeOut', times: [0, 0.4, 1] }}
        />
      </motion.g>

      {/* Impact rings on ground */}
      <motion.ellipse
        cx={120} cy={FY}
        rx={0} ry={0}
        fill="none" stroke={C} strokeWidth={1}
        animate={{ rx: [0, 25, 35], ry: [0, 4, 6], opacity: [0.5, 0.2, 0] }}
        transition={{ duration: 0.8, repeat: Infinity, ease: 'easeOut', times: [0.7, 0.85, 1] }}
      />

      {/* Up arrow */}
      <motion.g
        animate={{ opacity: [0.2, 0.6, 0.2], y: [0, -4, 0] }}
        transition={{ duration: 0.8, repeat: Infinity, ease: 'easeOut' }}
      >
        <DirArrow x={155} y={60} rot={-90} />
      </motion.g>
    </g>
  )
}

// ══════════════════════════════════════════════════════════════════════
// ANIMATION: default — Idle bounce
// ══════════════════════════════════════════════════════════════════════
function DefaultAnim() {
  return (
    <g>
      <motion.g
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Head cx={120} cy={48} />
        <line x1={120} y1={58} x2={120} y2={100} stroke={C} strokeWidth={SW} strokeLinecap="round" />
        <line x1={120} y1={70} x2={96} y2={86} stroke={C} strokeWidth={SW} strokeLinecap="round" />
        <line x1={120} y1={70} x2={144} y2={86} stroke={C} strokeWidth={SW} strokeLinecap="round" />
        <line x1={120} y1={100} x2={104} y2={156} stroke={C} strokeWidth={SW} strokeLinecap="round" />
        <line x1={120} y1={100} x2={136} y2={156} stroke={C} strokeWidth={SW} strokeLinecap="round" />
      </motion.g>
      <Basketball cx={148} cy={92} r={8} />
    </g>
  )
}

// ── Animation Router ─────────────────────────────────────────────────
function renderAnimation(category: string) {
  switch (category) {
    case 'pocket_ball':     return <PocketBallAnim />
    case 'shifty':          return <ShiftyAnim />
    case 'ball_handling':   return <BallHandlingAnim />
    case 'speed_change':    return <SpeedChangeAnim />
    case 'defense':         return <DefenseAnim />
    case 'shooting':        return <ShootingAnim />
    case 'footwork':        return <FootworkAnim />
    case 'finishing':       return <FinishingAnim />
    case 'conditioning':    return <ConditioningAnim />
    default:                return <DefaultAnim />
  }
}

// ── Main Component ────────────────────────────────────────────────────
export function DrillDemoAnimation({ category, className }: DrillDemoAnimationProps) {
  return (
    <div
      className={cn(
        'relative w-full overflow-hidden rounded-xl',
        'bg-gradient-to-b from-gray-900 to-gray-950',
        className,
      )}
    >
      <svg
        viewBox="0 0 240 180"
        className="block w-full"
        style={{ height: 200 }}
        aria-hidden="true"
      >
        <DemoBadge />
        <CourtFloor />
        {renderAnimation(category)}
      </svg>
    </div>
  )
}