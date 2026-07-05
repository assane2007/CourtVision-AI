'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

// ── Types ────────────────────────────────────────────────────────────
interface Props {
  category: string
  className?: string
}

// ── Palette ──────────────────────────────────────────────────────────
const SKIN = '#f97316'    // stick figure
const BALL = '#f97316'    // basketball
const SEAM = '#9a3412'    // ball seam
const FLOOR = '#374151'
const GUIDE = '#f973163d' // faint guide

// ══════════════════════════════════════════════════════════════════════
// SHARED ELEMENTS
// ══════════════════════════════════════════════════════════════════════

function Ball({ cx, cy, r = 7 }: { cx: number; cy: number; r?: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={BALL} />
      <line x1={cx} y1={cy - r} x2={cx} y2={cy + r} stroke={SEAM} strokeWidth={0.6} />
      <line x1={cx - r} y1={cy} x2={cx + r} y2={cy} stroke={SEAM} strokeWidth={0.6} />
      <path d={`M${cx - r * .6},${cy - r} Q${cx - r * .2},${cy} ${cx - r * .6},${cy + r}`} stroke={SEAM} strokeWidth={0.5} fill="none" />
      <path d={`M${cx + r * .6},${cy - r} Q${cx + r * .2},${cy} ${cx + r * .6},${cy + r}`} stroke={SEAM} strokeWidth={0.5} fill="none" />
    </g>
  )
}

function Floor({ y = 155 }: { y?: number }) {
  return (
    <g>
      <line x1={10} y1={y} x2={230} y2={y} stroke={FLOOR} strokeWidth={1} />
      <line x1={10} y1={y + 1} x2={230} y2={y + 1} stroke={FLOOR} strokeWidth={0.3} opacity={0.4} />
    </g>
  )
}

function Badge() {
  return (
    <g>
      <rect x={8} y={6} width={36} height={15} rx={3} fill="white" fillOpacity={0.08} />
      <text x={26} y={16.5} fill="white" fontSize={7.5} fontWeight={700} fontFamily="system-ui" textAnchor="middle" opacity={0.6}>
        DÉMO
      </text>
    </g>
  )
}

function Shadow({ cx, w = 28 }: { cx: number; w?: number }) {
  return <ellipse cx={cx} cy={158} rx={w} ry={3} fill="black" opacity={0.18} />
}

function Hoop({ x = 195, rimY = 55 }: { x?: number; rimY?: number }) {
  return (
    <g>
      <line x1={x + 3} y1={rimY - 14} x2={x + 3} y2={155} stroke="#4b5563" strokeWidth={2} />
      <rect x={x - 3} y={rimY - 18} width={12} height={22} rx={1.5} fill="none" stroke="#6b7280" strokeWidth={1.5} />
      <line x1={x - 15} y1={rimY + 2} x2={x + 3} y2={rimY + 2} stroke="#ef4444" strokeWidth={2} strokeLinecap="round" />
      <line x1={x - 12} y1={rimY + 5} x2={x - 7} y2={rimY + 14} stroke="#9ca3af" strokeWidth={0.4} opacity={0.4} />
      <line x1={x - 5} y1={rimY + 5} x2={x - 1} y2={rimY + 14} stroke="#9ca3af" strokeWidth={0.4} opacity={0.4} />
    </g>
  )
}

// ══════════════════════════════════════════════════════════════════════
// 1. POCKET BALL — Wide stance, LOW dribble, crossover between legs
// ══════════════════════════════════════════════════════════════════════
function PocketBallAnim() {
  return (
    <g>
      <Shadow cx={120} w={36} />
      {/* Body — low athletic crouch, knees bent */}
      <motion.g animate={{ x: [0, 0, 0] }}>
        {/* Head */}
        <circle cx={120} cy={62} r={9} fill="none" stroke={SKIN} strokeWidth={2.2} />
        {/* Torso — leaning forward */}
        <motion.line x1={120} y1={71} x2={118} y2={100} stroke={SKIN} strokeWidth={2.2} strokeLinecap="round" />

        {/* Left arm — reaches down to dribble */}
        <motion.line x1={120} y1={80}
          x2={96} y2={110} stroke={SKIN} strokeWidth={2.2} strokeLinecap="round"
          animate={{ x2: [96, 144, 96], y2: [110, 112, 110] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Right arm — reaches down to dribble */}
        <motion.line x1={120} y1={80}
          x2={144} y2={112} stroke={SKIN} strokeWidth={2.2} strokeLinecap="round"
          animate={{ x2: [144, 96, 144], y2: [112, 110, 112] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Left leg — wide, knee bent */}
        <motion.line x1={118} y1={100} x2={98} y2={124} stroke={SKIN} strokeWidth={2.2} strokeLinecap="round"
          animate={{ x2: [98, 100, 98] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.line x1={98} y1={124} x2={88} y2={154} stroke={SKIN} strokeWidth={2.2} strokeLinecap="round" />

        {/* Right leg — wide, knee bent */}
        <motion.line x1={118} y1={100} x2={138} y2={124} stroke={SKIN} strokeWidth={2.2} strokeLinecap="round"
          animate={{ x2: [138, 136, 138] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.line x1={138} y1={124} x2={148} y2={154} stroke={SKIN} strokeWidth={2.2} strokeLinecap="round" />
      </motion.g>

      {/* Ball — bounces LOW between legs with crossover */}
      <motion.g
        animate={{ x: [-18, 18, -18] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', times: [0, 0.5, 1] }}
      >
        <motion.g
          animate={{ y: [0, -22, 0] }}
          transition={{ duration: 0.45, repeat: Infinity, ease: [0.33, 0, 0.67, 1] }}
        >
          <Ball cx={120} cy={142} />
        </motion.g>
      </motion.g>

      {/* Crossover arrow hints */}
      <motion.g animate={{ opacity: [0, 0.5, 0], x: [0, -8, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}>
        <polygon points="-4,-3 4,0 -4,3" fill={SKIN} opacity={0.6} transform="translate(74,136) rotate(180)" />
      </motion.g>
      <motion.g animate={{ opacity: [0, 0.5, 0], x: [0, 8, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }}>
        <polygon points="-4,-3 4,0 -4,3" fill={SKIN} opacity={0.6} transform="translate(166,136)" />
      </motion.g>
    </g>
  )
}

// ══════════════════════════════════════════════════════════════════════
// 2. SHIFTY — Lateral burst steps, head fake, change of direction
// ══════════════════════════════════════════════════════════════════════
function ShiftyAnim() {
  return (
    <g>
      <Shadow cx={120} w={24} />
      {/* Full body shifts laterally with head fake */}
      <motion.g
        animate={{ x: [-35, 8, -35] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', times: [0, 0.45, 1] }}
      >
        {/* Head — with head fake lean */}
        <motion.g
          animate={{ x: [0, 14, -4, 0], rotate: [0, 6, -8, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', times: [0, 0.2, 0.35, 0.5] }}
          style={{ originX: 120, originY: 55 }}
        >
          <circle cx={120} cy={50} r={9} fill="none" stroke={SKIN} strokeWidth={2.2} />
        </motion.g>

        {/* Torso */}
        <motion.line x1={120} y1={59} x2={119} y2={98} stroke={SKIN} strokeWidth={2.2} strokeLinecap="round"
          animate={{ rotate: [0, -5, 5, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', times: [0, 0.2, 0.45, 1] }}
          style={{ originX: 119, originY: 59 }}
        />

        {/* Arms — swing opposite to legs */}
        <motion.line x1={119} y1={72} x2={90} y2={86} stroke={SKIN} strokeWidth={2.2} strokeLinecap="round"
          animate={{ x2: [90, 100, 90] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.line x1={119} y1={72} x2={148} y2={86} stroke={SKIN} strokeWidth={2.2} strokeLinecap="round"
          animate={{ x2: [148, 138, 148] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }} />

        {/* Legs — running stride */}
        <motion.line x1={119} y1={98} x2={100} y2={154} stroke={SKIN} strokeWidth={2.2} strokeLinecap="round"
          animate={{ x2: [100, 130, 100] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.line x1={119} y1={98} x2={138} y2={154} stroke={SKIN} strokeWidth={2.2} strokeLinecap="round"
          animate={{ x2: [138, 108, 138] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }} />
      </motion.g>

      {/* Speed trail when bursting */}
      <motion.g animate={{ opacity: [0, 0.3, 0], x: [-20, -40, -20] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut', times: [0, 0.15, 0.3] }}>
        <line x1={120} y1={58} x2={120} y2={100} stroke={SKIN} strokeWidth={1.5} strokeLinecap="round" opacity={0.2} />
        <line x1={120} y1={70} x2={100} y2={84} stroke={SKIN} strokeWidth={1.5} strokeLinecap="round" opacity={0.2} />
        <line x1={120} y1={70} x2={140} y2={84} stroke={SKIN} strokeWidth={1.5} strokeLinecap="round" opacity={0.2} />
      </motion.g>

      {/* Floor markers showing lateral path */}
      <line x1={60} y1={162} x2={180} y2={162} stroke={GUIDE} strokeWidth={1} strokeDasharray="4 3" />
    </g>
  )
}

// ══════════════════════════════════════════════════════════════════════
// 3. BALL HANDLING — Standing figure-8 dribble between legs
// ══════════════════════════════════════════════════════════════════════
function BallHandlingAnim() {
  return (
    <g>
      <Shadow cx={120} w={30} />
      {/* Front-facing figure, legs apart */}
      <circle cx={120} cy={50} r={9} fill="none" stroke={SKIN} strokeWidth={2.2} />
      <line x1={120} y1={59} x2={120} y2={98} stroke={SKIN} strokeWidth={2.2} strokeLinecap="round" />

      {/* Left arm — follows ball left */}
      <motion.line x1={120} y1={70}
        stroke={SKIN} strokeWidth={2.2} strokeLinecap="round"
        animate={{ x2: [96, 144, 96], y2: [92, 85, 92] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', times: [0, 0.5, 1] }}
      />

      {/* Right arm — follows ball right */}
      <motion.line x1={120} y1={70}
        stroke={SKIN} strokeWidth={2.2} strokeLinecap="round"
        animate={{ x2: [144, 96, 144], y2: [85, 92, 85] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', times: [0, 0.5, 1] }}
      />

      {/* Legs — spread for figure-8 path */}
      <line x1={120} y1={98} x2={100} y2={155} stroke={SKIN} strokeWidth={2.2} strokeLinecap="round" />
      <line x1={120} y1={98} x2={140} y2={155} stroke={SKIN} strokeWidth={2.2} strokeLinecap="round" />

      {/* Figure-8 path guide */}
      <path d="M98,115 Q120,100 142,115 Q120,130 98,115" fill="none" stroke={GUIDE} strokeWidth={0.8} strokeDasharray="3 2" />

      {/* Ball — figure-8 path through legs */}
      <motion.g
        animate={{
          x: [-20, 0, 20, 0, -20],
          y: [0, -18, 0, 12, 0],
        }}
        transition={{
          duration: 2.2, repeat: Infinity, ease: 'easeInOut',
          times: [0, 0.25, 0.5, 0.75, 1],
        }}
      >
        <Ball cx={120} cy={115} />
      </motion.g>
    </g>
  )
}

// ══════════════════════════════════════════════════════════════════════
// 4. SPEED CHANGE — Sprint, decelerate, sprint again (SIDE VIEW)
// ══════════════════════════════════════════════════════════════════════
function SpeedChangeAnim() {
  return (
    <g>
      <Shadow cx={120} w={20} />
      {/* Running figure — side view */}
      <motion.g
        animate={{ x: [-45, -45, 50, 50, -45] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'linear', times: [0, 0.1, 0.4, 0.55, 0.9] }}
      >
        {/* Lean forward more during sprint */}
        <motion.g
          animate={{ rotate: [0, 0, -12, -12, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', times: [0, 0.1, 0.4, 0.55, 0.9] }}
          style={{ originX: 120, originY: 58 }}
        >
          <circle cx={120} cy={48} r={9} fill="none" stroke={SKIN} strokeWidth={2.2} />
          <line x1={120} y1={57} x2={118} y2={96} stroke={SKIN} strokeWidth={2.2} strokeLinecap="round" />
        </motion.g>

        {/* Arms — pump while running */}
        <motion.line x1={119} y1={68} x2={102} y2={90} stroke={SKIN} strokeWidth={2.2} strokeLinecap="round"
          animate={{ x2: [102, 136, 102], y2: [90, 78, 90] }}
          transition={{ duration: 0.6, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.line x1={119} y1={68} x2={136} y2={78} stroke={SKIN} strokeWidth={2.2} strokeLinecap="round"
          animate={{ x2: [136, 102, 136], y2: [78, 90, 78] }}
          transition={{ duration: 0.6, repeat: Infinity, ease: 'easeInOut' }} />

        {/* Legs — running stride */}
        <motion.line x1={118} y1={96} x2={98} y2={154} stroke={SKIN} strokeWidth={2.2} strokeLinecap="round"
          animate={{ x2: [98, 135, 98] }}
          transition={{ duration: 0.6, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.line x1={118} y1={96} x2={140} y2={154} stroke={SKIN} strokeWidth={2.2} strokeLinecap="round"
          animate={{ x2: [140, 100, 140] }}
          transition={{ duration: 0.6, repeat: Infinity, ease: 'easeInOut' }} />
      </motion.g>

      {/* Speed lines during sprint phase */}
      <motion.g animate={{ opacity: [0, 0.5, 0] }}
        transition={{ duration: 3.2, repeat: Infinity, times: [0.1, 0.25, 0.4] }}>
        {[{ y: 50 }, { y: 70 }, { y: 90 }].map((p, i) => (
          <motion.line key={i}
            x1={75} y1={p.y} x2={55} y2={p.y}
            stroke={SKIN} strokeWidth={1.2} strokeLinecap="round"
            animate={{ x1: [75, 95, 75], x2: [55, 75, 55] }}
            transition={{ duration: 0.3, repeat: Infinity, ease: 'easeOut', delay: i * 0.08 }}
          />
        ))}
      </motion.g>

      {/* Deceleration marks */}
      <motion.g animate={{ opacity: [0, 0.3, 0] }}
        transition={{ duration: 3.2, repeat: Infinity, times: [0.4, 0.5, 0.55] }}>
        {[0, 6, 12].map((dx, i) => (
          <line key={i} x1={170 + dx} y1={155} x2={170 + dx} y2={160} stroke={SKIN} strokeWidth={0.8} opacity={0.3} />
        ))}
      </motion.g>
    </g>
  )
}

// ══════════════════════════════════════════════════════════════════════
// 5. DEFENSE — LOW wide stance, hands up, lateral slides (FRONT VIEW)
// ══════════════════════════════════════════════════════════════════════
function DefenseAnim() {
  return (
    <g>
      <Shadow cx={120} w={40} />
      <Hoop x={200} rimY={45} />

      {/* Low defensive stance — slides side to side */}
      <motion.g
        animate={{ x: [-25, 25, -25] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut', times: [0, 0.5, 1] }}
      >
        {/* Head */}
        <circle cx={120} cy={68} r={9} fill="none" stroke={SKIN} strokeWidth={2.2} />
        {/* Torso — very upright, low */}
        <line x1={120} y1={77} x2={120} y2={105} stroke={SKIN} strokeWidth={2.2} strokeLinecap="round" />

        {/* Arms — HIGH and WIDE, active hands */}
        <motion.line x1={120} y1={84} x2={92} y2={64} stroke={SKIN} strokeWidth={2.2} strokeLinecap="round"
          animate={{ y2: [64, 68, 64], x2: [92, 88, 92] }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.line x1={120} y1={84} x2={148} y2={64} stroke={SKIN} strokeWidth={2.2} strokeLinecap="round"
          animate={{ y2: [64, 60, 64], x2: [148, 152, 148] }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }} />

        {/* Hands — small circles for active hands */}
        <motion.circle cx={92} cy={64} r={3} fill={SKIN} opacity={0.5}
          animate={{ cy: [64, 68, 64] }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.circle cx={148} cy={64} r={3} fill={SKIN} opacity={0.5}
          animate={{ cy: [64, 60, 64] }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }} />

        {/* Thighs — very bent, wide */}
        <line x1={120} y1={105} x2={96} y2={130} stroke={SKIN} strokeWidth={2.2} strokeLinecap="round" />
        <line x1={120} y1={105} x2={144} y2={130} stroke={SKIN} strokeWidth={2.2} strokeLinecap="round" />
        {/* Shins */}
        <line x1={96} y1={130} x2={86} y2={155} stroke={SKIN} strokeWidth={2.2} strokeLinecap="round" />
        <line x1={144} y1={130} x2={154} y2={155} stroke={SKIN} strokeWidth={2.2} strokeLinecap="round" />
      </motion.g>

      {/* Defensive coverage zone */}
      <motion.ellipse cx={120} cy={120} rx={42} ry={20} fill="none"
        stroke={SKIN} strokeWidth={0.6} strokeDasharray="4 3" opacity={0.15}
        animate={{ rx: [42, 38, 42] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
      />
    </g>
  )
}

// ══════════════════════════════════════════════════════════════════════
// 6. SHOOTING — SIDE VIEW: raise ball, extend, follow-through at hoop
// ══════════════════════════════════════════════════════════════════════
function ShootingAnim() {
  return (
    <g>
      <Shadow cx={80} w={22} />
      <Hoop x={195} rimY={58} />

      {/* Shooter — side view, faces right */}
      <g>
        {/* Head */}
        <circle cx={80} cy={52} r={9} fill="none" stroke={SKIN} strokeWidth={2.2} />
        {/* Torso */}
        <line x1={80} y1={61} x2={78} y2={100} stroke={SKIN} strokeWidth={2.2} strokeLinecap="round" />

        {/* Shooting arm — raise up and extend */}
        <motion.line x1={80} y1={72}
          stroke={SKIN} strokeWidth={2.2} strokeLinecap="round"
          animate={{
            x2: [68, 78, 92, 88],
            y2: [82, 68, 52, 48],
          }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', times: [0, 0.25, 0.45, 0.6] }}
        />
        {/* Forearm — follow through */}
        <motion.line x1={78} y1={68}
          stroke={SKIN} strokeWidth={2.2} strokeLinecap="round"
          animate={{
            x1: [78, 78, 92, 88],
            y1: [68, 68, 52, 48],
            x2: [68, 90, 100, 96],
            y2: [74, 56, 42, 38],
          }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', times: [0, 0.25, 0.45, 0.6] }}
        />
        {/* Wrist flick indicator */}
        <motion.g animate={{ opacity: [0, 0, 0.6, 0.3, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, times: [0, 0.4, 0.5, 0.6, 0.8] }}>
          <line x1={96} y1={38} x2={100} y2={30} stroke={SKIN} strokeWidth={1} strokeLinecap="round" opacity={0.5} />
        </motion.g>

        {/* Guide hand */}
        <motion.line x1={80} y1={72}
          x2={68} y2={80} stroke={SKIN} strokeWidth={2.2} strokeLinecap="round"
          animate={{ x2: [68, 72, 68], y2: [80, 70, 80] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', times: [0, 0.45, 0.6] }}
        />

        {/* Legs — slight knee bend then extend */}
        <motion.line x1={78} y1={100} x2={66} y2={154} stroke={SKIN} strokeWidth={2.2} strokeLinecap="round"
          animate={{ y2: [154, 150, 154] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', times: [0, 0.45, 0.6] }} />
        <motion.line x1={78} y1={100} x2={90} y2={154} stroke={SKIN} strokeWidth={2.2} strokeLinecap="round"
          animate={{ y2: [154, 150, 154] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', times: [0, 0.45, 0.6] }} />
      </g>

      {/* Ball — arc from hand to hoop */}
      <motion.g
        animate={{
          cx: [68, 78, 120, 170, 182],
          cy: [74, 56, 30, 38, 58],
          opacity: [1, 1, 1, 1, 0],
          r: [7, 7, 7, 7, 5],
        }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', times: [0.25, 0.35, 0.5, 0.6, 0.7] }}
      >
        <Ball cx={0} cy={0} r={0} />
      </motion.g>

      {/* Trajectory arc guide */}
      <path d="M78,56 Q130,15 182,58" fill="none" stroke={GUIDE} strokeWidth={0.7} strokeDasharray="3 3" />
    </g>
  )
}

// ══════════════════════════════════════════════════════════════════════
// 7. FOOTWORK — TOP-DOWN VIEW: ladder drill, quick feet in/out
// ══════════════════════════════════════════════════════════════════════
function FootworkAnim() {
  // Ladder rungs (top-down view)
  const rungs = [70, 95, 120, 145, 170]
  return (
    <g>
      {/* Ladder outline */}
      <rect x={60} y={55} width={120} height={130} rx={2} fill="none" stroke="#4b5563" strokeWidth={1.2} />
      {rungs.map((y) => (
        <line key={y} x1={60} y1={y} x2={180} y2={y} stroke="#4b5563" strokeWidth={0.8} />
      ))}

      {/* Left foot — steps in/out pattern */}
      <motion.ellipse rx={8} ry={12} fill={SKIN} opacity={0.35}
        animate={{
          cx: [50, 85, 50, 105, 50, 125, 50, 145, 50, 125, 50, 105, 50, 85, 50],
          cy: [70, 82, 95, 107, 120, 132, 145, 155, 145, 132, 120, 107, 95, 82, 70],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut',
          times: [0, .07, .14, .21, .28, .35, .42, .5, .57, .64, .71, .78, .85, .92, 1] }}
      />

      {/* Right foot — mirror pattern */}
      <motion.ellipse rx={8} ry={12} fill={SKIN} opacity={0.6}
        animate={{
          cx: [190, 155, 190, 135, 190, 115, 190, 95, 190, 115, 190, 135, 190, 155, 190],
          cy: [82, 95, 107, 120, 132, 145, 155, 145, 132, 120, 107, 95, 82, 70, 82],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut',
          times: [0, .07, .14, .21, .28, .35, .42, .5, .57, .64, .71, .78, .85, .92, 1] }}
      />

      {/* Direction arrow */}
      <polygon points="120,45 115,38 125,38" fill={SKIN} opacity={0.4} />
    </g>
  )
}

// ══════════════════════════════════════════════════════════════════════
// 8. FINISHING — SIDE VIEW: drive, two steps, jump, layup at rim
// ══════════════════════════════════════════════════════════════════════
function FinishingAnim() {
  return (
    <g>
      <Shadow cx={120} w={18} />
      <Hoop x={195} rimY={62} />

      {/* Runner — drives from left, 2 steps, jump, layup */}
      <motion.g
        animate={{ x: [-50, -20, 30, 60, 30, -50] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut',
          times: [0, 0.2, 0.35, 0.45, 0.6, 1] }}
      >
        <motion.g
          animate={{ y: [0, 0, 0, -30, 0, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut',
            times: [0, 0.2, 0.35, 0.45, 0.6, 1] }}
        >
          {/* Head */}
          <circle cx={120} cy={48} r={9} fill="none" stroke={SKIN} strokeWidth={2.2} />
          {/* Torso — leans forward during drive */}
          <motion.line x1={120} y1={57} x2={118} y2={96} stroke={SKIN} strokeWidth={2.2} strokeLinecap="round"
            animate={{ rotate: [0, -4, -8, -5, 0, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', times: [0, 0.2, 0.35, 0.45, 0.6, 1] }}
            style={{ originX: 118, originY: 57 }}
          />

          {/* Ball hand — brings ball up for layup */}
          <motion.line x1={118} y1={68}
            stroke={SKIN} strokeWidth={2.2} strokeLinecap="round"
            animate={{
              x2: [100, 108, 130, 148, 130, 100],
              y2: [80, 76, 56, 46, 60, 80],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut',
              times: [0, 0.2, 0.35, 0.48, 0.6, 1] }}
          />
          {/* Off hand */}
          <line x1={118} y1={68} x2={136} y2={80} stroke={SKIN} strokeWidth={2.2} strokeLinecap="round" />

          {/* Legs — running then jump */}
          <motion.line x1={118} y1={96} x2={98} y2={154} stroke={SKIN} strokeWidth={2.2} strokeLinecap="round"
            animate={{ y2: [154, 154, 154, 170, 154, 154], x2: [98, 110, 130, 140, 130, 98] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', times: [0, 0.2, 0.35, 0.48, 0.6, 1] }}
          />
          <motion.line x1={118} y1={96} x2={140} y2={154} stroke={SKIN} strokeWidth={2.2} strokeLinecap="round"
            animate={{ y2: [154, 154, 154, 170, 154, 154], x2: [140, 128, 108, 100, 108, 140] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', times: [0, 0.2, 0.35, 0.48, 0.6, 1] }}
          />
        </motion.g>
      </motion.g>

      {/* Ball — separate from hand at release, arcs to hoop */}
      <motion.g
        animate={{
          cx: [70, 88, 150, 178],
          cy: [80, 76, 42, 60],
          opacity: [1, 1, 1, 0],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', times: [0.4, 0.48, 0.58, 0.68] }}
      >
        <Ball cx={0} cy={0} />
      </motion.g>

      {/* Drive path */}
      <line x1={50} y1={162} x2={185} y2={162} stroke={GUIDE} strokeWidth={0.8} strokeDasharray="5 4" />
    </g>
  )
}

// ══════════════════════════════════════════════════════════════════════
// 9. CONDITIONING — JUMP squats, continuous up/down
// ══════════════════════════════════════════════════════════════════════
function ConditioningAnim() {
  return (
    <g>
      <motion.g animate={{ y: [0, -28, 0] }}
        transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}>
        <Shadow cx={120} w={28} />

        {/* Head */}
        <circle cx={120} cy={50} r={9} fill="none" stroke={SKIN} strokeWidth={2.2} />
        {/* Torso */}
        <motion.line x1={120} y1={59} x2={120} y2={96} stroke={SKIN} strokeWidth={2.2} strokeLinecap="round"
          animate={{ y2: [96, 94, 96] }}
          transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }} />

        {/* Arms — pump up during jump */}
        <motion.line x1={120} y1={70}
          x2={96} y2={88} stroke={SKIN} strokeWidth={2.2} strokeLinecap="round"
          animate={{ x2: [96, 90, 96], y2: [88, 58, 88] }}
          transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.line x1={120} y1={70}
          x2={144} y2={88} stroke={SKIN} strokeWidth={2.2} strokeLinecap="round"
          animate={{ x2: [144, 150, 144], y2: [88, 58, 88] }}
          transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }} />

        {/* Legs — squat then extend */}
        <motion.line x1={120} y1={96}
          x2={100} y2={154} stroke={SKIN} strokeWidth={2.2} strokeLinecap="round"
          animate={{ x2: [100, 108, 100], y2: [154, 154, 154] }}
          transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.line x1={120} y1={96}
          x2={140} y2={154} stroke={SKIN} strokeWidth={2.2} strokeLinecap="round"
          animate={{ x2: [140, 132, 140], y2: [154, 154, 154] }}
          transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }} />
      </motion.g>

      {/* Impact rings at ground */}
      <motion.circle cx={120} cy={158} r={4} fill="none" stroke={SKIN} strokeWidth={0.8}
        animate={{ r: [4, 30], opacity: [0.4, 0] }}
        transition={{ duration: 0.9, repeat: Infinity, ease: 'easeOut' }} />
      <motion.circle cx={120} cy={158} r={4} fill="none" stroke={SKIN} strokeWidth={0.6}
        animate={{ r: [4, 24], opacity: [0.25, 0] }}
        transition={{ duration: 0.9, repeat: Infinity, ease: 'easeOut', delay: 0.08 }} />

      {/* Upward energy arrow */}
      <motion.g animate={{ opacity: [0, 0.4, 0], y: [0, -15, -25] }}
        transition={{ duration: 0.9, repeat: Infinity, ease: 'easeOut', times: [0.05, 0.3, 0.5] }}>
        <polygon points="120,30 115,40 125,40" fill={SKIN} opacity={0.5} />
      </motion.g>
    </g>
  )
}

// ══════════════════════════════════════════════════════════════════════
// DEFAULT — gentle bounce
// ══════════════════════════════════════════════════════════════════════
function DefaultAnim() {
  return (
    <g>
      <Shadow cx={120} w={24} />
      <motion.g animate={{ y: [0, -6, 0] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}>
        <circle cx={120} cy={52} r={9} fill="none" stroke={SKIN} strokeWidth={2.2} />
        <line x1={120} y1={61} x2={120} y2={100} stroke={SKIN} strokeWidth={2.2} strokeLinecap="round" />
        <line x1={120} y1={74} x2={96} y2={90} stroke={SKIN} strokeWidth={2.2} strokeLinecap="round" />
        <line x1={120} y1={74} x2={144} y2={90} stroke={SKIN} strokeWidth={2.2} strokeLinecap="round" />
        <line x1={120} y1={100} x2={102} y2={154} stroke={SKIN} strokeWidth={2.2} strokeLinecap="round" />
        <line x1={120} y1={100} x2={138} y2={154} stroke={SKIN} strokeWidth={2.2} strokeLinecap="round" />
      </motion.g>
      <Ball cx={148} cy={100} r={7} />
    </g>
  )
}

// ══════════════════════════════════════════════════════════════════════
// ROUTER + MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════
const ANIMS: Record<string, () => React.JSX.Element> = {
  pocket_ball: PocketBallAnim,
  shifty: ShiftyAnim,
  ball_handling: BallHandlingAnim,
  speed_change: SpeedChangeAnim,
  defense: DefenseAnim,
  shooting: ShootingAnim,
  footwork: FootworkAnim,
  finishing: FinishingAnim,
  conditioning: ConditioningAnim,
}

export function DrillDemoAnimation({ category, className }: Props) {
  const Anim = ANIMS[category] ?? DefaultAnim
  const showFloor = category !== 'footwork'
  const showHoop = category === 'shooting' || category === 'defense' || category === 'finishing'

  return (
    <div className={cn('relative w-full overflow-hidden rounded-xl bg-gradient-to-b from-gray-900 to-gray-950', className)}>
      <svg viewBox="0 0 240 170" className="block w-full" style={{ maxHeight: 200 }}>
        <Badge />
        {showFloor && <Floor />}
        {showHoop && category === 'shooting' && <Hoop x={195} rimY={58} />}
        {showHoop && category === 'defense' && <Hoop x={200} rimY={45} />}
        {showHoop && category === 'finishing' && <Hoop x={195} rimY={62} />}
        <Anim />
      </svg>
    </div>
  )
}