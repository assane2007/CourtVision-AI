'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

// ── Types ────────────────────────────────────────────────────────────
interface Props {
  category: string
  className?: string
}

// ── Category metadata ────────────────────────────────────────────────
const META: Record<string, {
  title: string
  subtitle: string
  focus: string[]
  accent: string
  accentDim: string
}> = {
  pocket_ball: {
    title: 'Dribble Bas de Poche',
    subtitle: 'Ballon bas, contrôle total',
    focus: ['Dribble sous le genou', 'Stance large', 'Yeux levés'],
    accent: '#f59e0b',
    accentDim: '#f59e0b33',
  },
  shifty: {
    title: 'Démarquage',
    subtitle: 'Fakes & changements de direction',
    focus: ['Faux mouvement', 'Explosion latérale', 'Épaules trompeuses'],
    accent: '#06b6d4',
    accentDim: '#06b6d433',
  },
  ball_handling: {
    title: 'Maniement de Balle',
    subtitle: 'Figure 8, 2 ballons, contrôle',
    focus: ['Pattern en 8', 'Entre les jambes', 'Sans regarder'],
    accent: '#22c55e',
    accentDim: '#22c55e33',
  },
  speed_change: {
    title: 'Changement de Vitesse',
    subtitle: 'Ralentir puis exploser',
    focus: ['50% → 100%', 'Arrêt complet', 'Redémarrage explosif'],
    accent: '#eab308',
    accentDim: '#eab30833',
  },
  defense: {
    title: 'Posture Défensive',
    subtitle: 'Glissades latérales, mains hautes',
    focus: ['Stance basse', 'Mains actives', 'Pieds rapides'],
    accent: '#ef4444',
    accentDim: '#ef444433',
  },
  shooting: {
    title: 'Tir au Panier',
    subtitle: 'Forme BEEF, arc, follow-through',
    focus: ['B-Équilibre', 'E-Yeux', 'E-Coude', 'F-Suivi'],
    accent: '#a855f7',
    accentDim: '#a855f733',
  },
  footwork: {
    title: 'Placement de Pieds',
    subtitle: 'Pivots, jab steps, échelle',
    focus: ['Triple menace', 'Pivots', 'Pieds légers'],
    accent: '#14b8a6',
    accentDim: '#14b8a633',
  },
  finishing: {
    title: 'Finition au Panier',
    subtitle: 'Layups, floaters, renversés',
    focus: ['2 pas', 'Main haute', 'Utiliser le panneau'],
    accent: '#f97316',
    accentDim: '#f9731633',
  },
  conditioning: {
    title: 'Condition Physique',
    subtitle: 'Sprints, navettes, burpees',
    focus: ['Effort maximal', 'Récupération courte', 'Endurance'],
    accent: '#ec4899',
    accentDim: '#ec489933',
  },
}

const DEFAULT_META = {
  title: 'Exercice',
  subtitle: 'Entraînement basket',
  focus: ['Suivez les instructions'],
  accent: '#f97316',
  accentDim: '#f9731633',
}

// ══════════════════════════════════════════════════════════════════════
// SHARED SVG HELPERS
// ══════════════════════════════════════════════════════════════════════

function Ball({ cx, cy, r = 7 }: { cx: number; cy: number; r?: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="#f97316" />
      <line x1={cx} y1={cy - r} x2={cx} y2={cy + r} stroke="#9a3412" strokeWidth={0.6} />
      <line x1={cx - r} y1={cy} x2={cx + r} y2={cy} stroke="#9a3412" strokeWidth={0.6} />
      <path d={`M${cx - r * .6},${cy - r} Q${cx - r * .2},${cy} ${cx - r * .6},${cy + r}`} stroke="#9a3412" strokeWidth={0.5} fill="none" />
      <path d={`M${cx + r * .6},${cy - r} Q${cx + r * .2},${cy} ${cx + r * .6},${cy + r}`} stroke="#9a3412" strokeWidth={0.5} fill="none" />
    </g>
  )
}

function CourtFloor({ y = 175 }: { y?: number }) {
  return (
    <g>
      {/* Court surface */}
      <rect x={0} y={y} width={280} height={55} fill="#92400e" opacity={0.15} rx={0} />
      {/* Floor line */}
      <line x1={0} y1={y} x2={280} y2={y} stroke="#6b7280" strokeWidth={1.2} />
      {/* Court markings */}
      <line x1={0} y1={y + 1} x2={280} y2={y + 1} stroke="#9ca3af" strokeWidth={0.3} opacity={0.3} />
      {/* Wood grain hints */}
      {[10, 40, 70, 100, 130, 160, 190, 220, 250].map((x) => (
        <line key={x} x1={x} y1={y + 2} x2={x} y2={y + 54} stroke="#92400e" strokeWidth={0.3} opacity={0.08} />
      ))}
    </g>
  )
}

function Hoop({ x = 240, rimY = 60 }: { x?: number; rimY?: number }) {
  return (
    <g>
      {/* Backboard */}
      <rect x={x - 2} y={rimY - 22} width={8} height={30} rx={1} fill="none" stroke="#9ca3af" strokeWidth={1.5} />
      {/* Pole */}
      <line x1={x + 2} y1={rimY + 8} x2={x + 2} y2={175} stroke="#6b7280" strokeWidth={2.5} />
      {/* Rim */}
      <line x1={x - 18} y1={rimY} x2={x + 2} y2={rimY} stroke="#ef4444" strokeWidth={2.5} strokeLinecap="round" />
      {/* Net hint */}
      <line x1={x - 14} y1={rimY + 3} x2={x - 8} y2={rimY + 16} stroke="#9ca3af" strokeWidth={0.5} opacity={0.35} />
      <line x1={x - 6} y1={rimY + 3} x2={x - 2} y2={rimY + 16} stroke="#9ca3af" strokeWidth={0.5} opacity={0.35} />
    </g>
  )
}

function Cone({ x, y, color = '#ef4444' }: { x: number; y: number; color?: string }) {
  return (
    <g>
      <polygon points={`${x},${y - 14} ${x - 6},${y} ${x + 6},${y}`} fill={color} opacity={0.8} />
      <line x1={x - 4} y1={y - 5} x2={x + 4} y2={y - 5} stroke="white" strokeWidth={0.8} opacity={0.5} />
    </g>
  )
}

function Player({
  headX, headY, torsoAngle = 0, torsoLen = 38,
  leftArm, rightArm, leftLeg, rightLeg,
  color = '#f97316', strokeWidth = 2.5,
}: {
  headX: number; headY: number; torsoAngle?: number
  torsoLen?: number
  leftArm: { ex: number; ey: number; hx?: number; hy?: number }
  rightArm: { ex: number; ey: number; hx?: number; hy?: number }
  leftLeg: { kx: number; ky: number; fx: number; fy: number }
  rightLeg: { kx: number; ky: number; fx: number; fy: number }
  color?: string; strokeWidth?: number
}) {
  const hipX = headX + Math.sin((torsoAngle * Math.PI) / 180) * torsoLen
  const hipY = headY + Math.cos((torsoAngle * Math.PI) / 180) * torsoLen * 0.9
  const shoulderX = headX + Math.sin((torsoAngle * Math.PI) / 180) * 12
  const shoulderY = headY + 12

  return (
    <g>
      {/* Head */}
      <circle cx={headX} cy={headY} r={9} fill="none" stroke={color} strokeWidth={strokeWidth} />
      {/* Torso */}
      <line x1={shoulderX} y1={shoulderY} x2={hipX} y2={hipY} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      {/* Left arm (shoulder → elbow → hand) */}
      <line x1={shoulderX} y1={shoulderY} x2={leftArm.ex} y2={leftArm.ey} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      {leftArm.hx !== undefined && leftArm.hy !== undefined && (
        <line x1={leftArm.ex} y1={leftArm.ey} x2={leftArm.hx} y2={leftArm.hy} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      )}
      {/* Right arm */}
      <line x1={shoulderX} y1={shoulderY} x2={rightArm.ex} y2={rightArm.ey} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      {rightArm.hx !== undefined && rightArm.hy !== undefined && (
        <line x1={rightArm.ex} y1={rightArm.ey} x2={rightArm.hx} y2={rightArm.hy} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      )}
      {/* Left leg (hip → knee → foot) */}
      <line x1={hipX} y1={hipY} x2={leftLeg.kx} y2={leftLeg.ky} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1={leftLeg.kx} y1={leftLeg.ky} x2={leftLeg.fx} y2={leftLeg.fy} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      {/* Right leg */}
      <line x1={hipX} y1={hipY} x2={rightLeg.kx} y2={rightLeg.ky} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1={rightLeg.kx} y1={rightLeg.ky} x2={rightLeg.fx} y2={rightLeg.fy} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </g>
  )
}

function FocusLabel({ text, x, y, color, delay = 0 }: { text: string; x: number; y: number; color: string; delay?: number }) {
  return (
    <motion.g
      animate={{ opacity: [0, 1, 1, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', times: [0, 0.1 + delay, 0.8, 1], delay }}
    >
      <rect x={x - 2} y={y - 8} width={text.length * 5.5 + 6} height={16} rx={4} fill={color} fillOpacity={0.2} />
      <text x={x + 2} y={y + 3.5} fill="white" fontSize={7.5} fontWeight={600} fontFamily="system-ui" opacity={0.85}>
        {text}
      </text>
    </motion.g>
  )
}

function StepNumber({ num, x, y, color }: { num: number; x: number; y: number; color: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={7} fill={color} />
      <text x={x} y={y + 3} fill="white" fontSize={8} fontWeight={700} fontFamily="system-ui" textAnchor="middle">
        {num}
      </text>
    </g>
  )
}

function Arrow({ x1, y1, x2, y2, color, dashed = false }: { x1: number; y1: number; x2: number; y2: number; color: string; dashed?: boolean }) {
  const angle = Math.atan2(y2 - y1, x2 - x1)
  const headLen = 6
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={1.5} strokeLinecap="round"
        strokeDasharray={dashed ? '4 3' : 'none'} />
      <polygon
        points={`${x2},${y2} ${x2 - headLen * Math.cos(angle - 0.4)},${y2 - headLen * Math.sin(angle - 0.4)} ${x2 - headLen * Math.cos(angle + 0.4)},${y2 - headLen * Math.sin(angle + 0.4)}`}
        fill={color}
      />
    </g>
  )
}

// ══════════════════════════════════════════════════════════════════════
// 1. POCKET BALL — Low crouch, ball bouncing LOW between legs
// ══════════════════════════════════════════════════════════════════════
function PocketBallAnim({ accent, accentDim }: { accent: string; accentDim: string }) {
  return (
    <g>
      {/* Cones showing boundaries */}
      <Cone x={50} y={172} color={accent} />
      <Cone x={200} y={172} color={accent} />

      {/* "ZONE BASSE" bracket */}
      <motion.g animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ duration: 2, repeat: Infinity }}>
        <line x1={42} y1={138} x2={42} y2={172} stroke={accent} strokeWidth={1} strokeDasharray="3 2" />
        <line x1={42} y1={138} x2={208} y2={138} stroke={accent} strokeWidth={0.8} strokeDasharray="3 2" />
        <line x1={208} y1={138} x2={208} y2={172} stroke={accent} strokeWidth={1} strokeDasharray="3 2" />
        <text x={125} y={150} fill={accent} fontSize={8} fontWeight={700} fontFamily="system-ui" textAnchor="middle" opacity={0.8}>
          ZONE DE POCHE
        </text>
      </motion.g>

      {/* Player in LOW stance — wider, more bent */}
      <motion.g animate={{ x: [0, 0, 0] }}>
        {/* Head — low position */}
        <circle cx={125} cy={80} r={9} fill="none" stroke={accent} strokeWidth={2.5} />
        {/* Eyes looking up indicator */}
        <motion.g animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}>
          <text x={130} y={77} fill={accent} fontSize={8} fontFamily="system-ui" opacity={0.8}>👁️</text>
        </motion.g>

        {/* Torso — leaning forward, low */}
        <line x1={125} y1={89} x2={123} y2={120} stroke={accent} strokeWidth={2.5} strokeLinecap="round" />

        {/* Left arm reaching down to dribble left */}
        <motion.line x1={123} y1={96} x2={100} y2={128} stroke={accent} strokeWidth={2.5} strokeLinecap="round"
          animate={{ x2: [100, 150, 100], y2: [128, 130, 128] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.circle cx={100} cy={128} r={2.5} fill={accent}
          animate={{ cx: [100, 150, 100], cy: [128, 130, 128] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }} />

        {/* Right arm */}
        <motion.line x1={123} y1={96} x2={150} y2={130} stroke={accent} strokeWidth={2.5} strokeLinecap="round"
          animate={{ x2: [150, 100, 150], y2: [130, 128, 130] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.circle cx={150} cy={130} r={2.5} fill={accent}
          animate={{ cx: [150, 100, 150], cy: [130, 128, 130] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }} />

        {/* Left thigh — very bent */}
        <line x1={123} y1={120} x2={98} y2={145} stroke={accent} strokeWidth={2.5} strokeLinecap="round" />
        {/* Left shin */}
        <line x1={98} y1={145} x2={88} y2={172} stroke={accent} strokeWidth={2.5} strokeLinecap="round" />
        {/* Right thigh */}
        <line x1={123} y1={120} x2={148} y2={145} stroke={accent} strokeWidth={2.5} strokeLinecap="round" />
        {/* Right shin */}
        <line x1={148} y1={145} x2={158} y2={172} stroke={accent} strokeWidth={2.5} strokeLinecap="round" />
      </motion.g>

      {/* Ball — bouncing LOW (stays in pocket zone) */}
      <motion.g
        animate={{ x: [-25, 25, -25] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <motion.g
          animate={{ y: [0, -15, 0] }}
          transition={{ duration: 0.5, repeat: Infinity, ease: [0.33, 0, 0.67, 1] }}
        >
          <Ball cx={125} cy={155} r={7} />
        </motion.g>
      </motion.g>

      {/* Crossover direction arrows */}
      <motion.g animate={{ opacity: [0, 0.8, 0] }} transition={{ duration: 2, repeat: Infinity, times: [0, 0.15, 0.35] }}>
        <Arrow x1={75} y1={155} x2={55} y2={155} color={accent} />
        <text x={55} y={148} fill={accent} fontSize={7} fontWeight={600} fontFamily="system-ui" textAnchor="middle">GAUCHE</text>
      </motion.g>
      <motion.g animate={{ opacity: [0, 0.8, 0] }} transition={{ duration: 2, repeat: Infinity, times: [0.5, 0.65, 0.85] }}>
        <Arrow x1={175} y1={155} x2={195} y2={155} color={accent} />
        <text x={195} y={148} fill={accent} fontSize={7} fontWeight={600} fontFamily="system-ui" textAnchor="middle">DROITE</text>
      </motion.g>

      {/* Focus labels */}
      <FocusLabel text="Dribble SOUS le genou" x={15} y={50} color={accent} delay={0} />
      <FocusLabel text="Crossover entre les jambes" x={100} y={32} color={accent} delay={0.3} />

      {/* Step indicators */}
      <StepNumber num={1} x={70} y={110} color={accent} />
      <StepNumber num={2} x={180} y={110} color={accent} />
    </g>
  )
}

// ══════════════════════════════════════════════════════════════════════
// 2. SHIFTY — Head fake, lateral burst, change direction
// ══════════════════════════════════════════════════════════════════════
function ShiftyAnim({ accent, accentDim }: { accent: string; accentDim: string }) {
  return (
    <g>
      {/* Direction markers on floor */}
      <motion.g animate={{ opacity: [0.15, 0.4, 0.15] }} transition={{ duration: 2.5, repeat: Infinity }}>
        <text x={45} y={170} fill={accent} fontSize={20} textAnchor="middle" opacity={0.3}>←</text>
        <text x={200} y={170} fill={accent} fontSize={20} textAnchor="middle" opacity={0.3}>→</text>
      </motion.g>

      {/* Lateral path line */}
      <line x1={30} y1={175} x2={220} y2={175} stroke={accent} strokeWidth={1} strokeDasharray="6 4" opacity={0.3} />

      {/* Player — shifts laterally with head fake */}
      <motion.g
        animate={{ x: [-40, 12, -40] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', times: [0, 0.5, 1] }}
      >
        {/* Head with head fake lean */}
        <motion.g
          animate={{ x: [0, 16, -6, 0], rotate: [0, 8, -10, 0] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', times: [0, 0.15, 0.3, 0.45] }}
          style={{ originX: 140, originY: 70 }}
        >
          <circle cx={140} cy={62} r={9} fill="none" stroke={accent} strokeWidth={2.5} />
          {/* Head fake indicator */}
          <motion.text animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 2.8, repeat: Infinity, times: [0.1, 0.2, 0.3] }}
            x={156} y={56} fill={accent} fontSize={7} fontWeight={700} fontFamily="system-ui">FAKE!</motion.text>
        </motion.g>

        {/* Torso */}
        <motion.line x1={140} y1={71} x2={138} y2={110} stroke={accent} strokeWidth={2.5} strokeLinecap="round"
          animate={{ rotate: [0, -6, 6, 0] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', times: [0, 0.15, 0.5, 1] }}
          style={{ originX: 138, originY: 71 }} />

        {/* Arms — swing for balance */}
        <motion.line x1={138} y1={82} x2={110} y2={98} stroke={accent} strokeWidth={2.5} strokeLinecap="round"
          animate={{ x2: [110, 122, 110] }} transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.line x1={138} y1={82} x2={166} y2={98} stroke={accent} strokeWidth={2.5} strokeLinecap="round"
          animate={{ x2: [166, 154, 166] }} transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }} />

        {/* Legs — running/changing direction */}
        <motion.line x1={138} y1={110} x2={115} y2={170} stroke={accent} strokeWidth={2.5} strokeLinecap="round"
          animate={{ x2: [115, 148, 115] }} transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.line x1={138} y1={110} x2={160} y2={170} stroke={accent} strokeWidth={2.5} strokeLinecap="round"
          animate={{ x2: [160, 125, 160] }} transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }} />
      </motion.g>

      {/* Speed burst effect when exploding */}
      <motion.g animate={{ opacity: [0, 0.6, 0] }}
        transition={{ duration: 2.8, repeat: Infinity, times: [0.25, 0.4, 0.55] }}>
        {[0, 8, 16].map((dy, i) => (
          <line key={i} x1={85} y1={65 + dy} x2={65} y2={65 + dy} stroke={accent} strokeWidth={1.2} strokeLinecap="round" opacity={0.4} />
        ))}
      </motion.g>

      {/* "EXPLOSE" label during burst */}
      <motion.g animate={{ opacity: [0, 1, 0], x: [0, 15, 30] }}
        transition={{ duration: 2.8, repeat: Infinity, times: [0.25, 0.35, 0.5] }}>
        <rect x={145} y={42} width={60} height={16} rx={4} fill={accent} fillOpacity={0.9} />
        <text x={175} y={53} fill="white" fontSize={8} fontWeight={700} fontFamily="system-ui" textAnchor="middle">EXPLOSE! 💥</text>
      </motion.g>

      {/* Focus labels */}
      <FocusLabel text="Faux mouvement de tête" x={15} y={50} color={accent} delay={0} />
      <FocusLabel text="Explosion dans l'autre sens" x={15} y={70} color={accent} delay={0.3} />
    </g>
  )
}

// ══════════════════════════════════════════════════════════════════════
// 3. BALL HANDLING — Figure 8, two balls, pound dribble
// ══════════════════════════════════════════════════════════════════════
function BallHandlingAnim({ accent, accentDim }: { accent: string; accentDim: string }) {
  return (
    <g>
      {/* Figure-8 path guide — very visible */}
      <motion.path
        d="M100,140 Q125,105 150,140 Q125,175 100,140"
        fill="none" stroke={accent} strokeWidth={1.2} strokeDasharray="4 3"
        animate={{ opacity: [0.15, 0.4, 0.15] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <text x={125} y={135} fill={accent} fontSize={10} fontWeight={800} fontFamily="system-ui" textAnchor="middle" opacity={0.4}>∞</text>

      {/* Player — standing, legs apart for figure 8 */}
      <g>
        {/* Head */}
        <circle cx={125} cy={68} r={9} fill="none" stroke={accent} strokeWidth={2.5} />
        {/* "NO LOOK" indicator */}
        <motion.g animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}>
          <text x={138} y={65} fill={accent} fontSize={7} fontWeight={700} fontFamily="system-ui">🔍 SANS REGARDER</text>
        </motion.g>
        {/* Torso */}
        <line x1={125} y1={77} x2={125} y2={115} stroke={accent} strokeWidth={2.5} strokeLinecap="round" />

        {/* Arms follow the ball */}
        <motion.line x1={125} y1={88}
          stroke={accent} strokeWidth={2.5} strokeLinecap="round"
          animate={{ x2: [100, 150, 100], y2: [108, 100, 108] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.circle r={2.5} fill={accent}
          animate={{ cx: [100, 150, 100], cy: [108, 100, 108] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }} />

        <motion.line x1={125} y1={88}
          stroke={accent} strokeWidth={2.5} strokeLinecap="round"
          animate={{ x2: [150, 100, 150], y2: [100, 108, 100] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.circle r={2.5} fill={accent}
          animate={{ cx: [150, 100, 150], cy: [100, 108, 100] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }} />

        {/* Legs — spread for the ball path */}
        <line x1={125} y1={115} x2={100} y2={172} stroke={accent} strokeWidth={2.5} strokeLinecap="round" />
        <line x1={125} y1={115} x2={150} y2={172} stroke={accent} strokeWidth={2.5} strokeLinecap="round" />
      </g>

      {/* Ball — figure 8 motion */}
      <motion.g
        animate={{
          cx: [100, 125, 150, 125, 100],
          cy: [140, 110, 140, 170, 140],
        }}
        transition={{
          duration: 2.4, repeat: Infinity, ease: 'easeInOut',
          times: [0, 0.25, 0.5, 0.75, 1],
        }}
      >
        <Ball cx={0} cy={0} r={7} />
      </motion.g>

      {/* Directional arrows along path */}
      <motion.g animate={{ opacity: [0, 0.6, 0] }} transition={{ duration: 2.4, repeat: Infinity, times: [0, 0.2, 0.4] }}>
        <Arrow x1={108} y1={128} x2={118} y2={115} color={accent} />
      </motion.g>
      <motion.g animate={{ opacity: [0, 0.6, 0] }} transition={{ duration: 2.4, repeat: Infinity, times: [0.5, 0.7, 0.9] }}>
        <Arrow x1={142} y1={128} x2={132} y2={115} color={accent} />
      </motion.g>

      {/* Focus labels */}
      <FocusLabel text="Pattern en 8 entre les jambes" x={15} y={48} color={accent} delay={0} />
      <FocusLabel text="Main gauche ↔ Main droite" x={15} y={68} color={accent} delay={0.3} />
    </g>
  )
}

// ══════════════════════════════════════════════════════════════════════
// 4. SPEED CHANGE — Sprint → Stop → Sprint
// ══════════════════════════════════════════════════════════════════════
function SpeedChangeAnim({ accent, accentDim }: { accent: string; accentDim: string }) {
  return (
    <g>
      {/* Speed zones on floor */}
      <motion.g animate={{ opacity: [0.1, 0.3, 0.1] }} transition={{ duration: 3.5, repeat: Infinity }}>
        <rect x={15} y={168} width={70} height={8} rx={2} fill={accent} opacity={0.15} />
        <text x={50} y={174} fill={accent} fontSize={6.5} fontWeight={700} fontFamily="system-ui" textAnchor="middle">50%</text>
        <rect x={95} y={168} width={90} height={8} rx={2} fill={accent} opacity={0.4} />
        <text x={140} y={174} fill="white" fontSize={6.5} fontWeight={700} fontFamily="system-ui" textAnchor="middle">100% ⚡</text>
      </motion.g>

      {/* Runner — side view */}
      <motion.g
        animate={{ x: [-55, -55, 60, 60, -55] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'linear', times: [0, 0.08, 0.35, 0.55, 0.9] }}
      >
        {/* More forward lean during sprint */}
        <motion.g
          animate={{ rotate: [0, 0, -15, -15, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, times: [0, 0.08, 0.35, 0.55, 0.9] }}
          style={{ originX: 140, originY: 60 }}
        >
          <circle cx={140} cy={50} r={9} fill="none" stroke={accent} strokeWidth={2.5} />
          <line x1={140} y1={59} x2={137} y2={100} stroke={accent} strokeWidth={2.5} strokeLinecap="round" />
        </motion.g>

        {/* Arms pump */}
        <motion.line x1={138} y1={72} x2={118} y2={95} stroke={accent} strokeWidth={2.5} strokeLinecap="round"
          animate={{ x2: [118, 158, 118], y2: [95, 80, 95] }}
          transition={{ duration: 0.55, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.line x1={138} y1={72} x2={158} y2={80} stroke={accent} strokeWidth={2.5} strokeLinecap="round"
          animate={{ x2: [158, 118, 158], y2: [80, 95, 80] }}
          transition={{ duration: 0.55, repeat: Infinity, ease: 'easeInOut' }} />

        {/* Legs stride */}
        <motion.line x1={137} y1={100} x2={115} y2={170} stroke={accent} strokeWidth={2.5} strokeLinecap="round"
          animate={{ x2: [115, 158, 115] }} transition={{ duration: 0.55, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.line x1={137} y1={100} x2={160} y2={170} stroke={accent} strokeWidth={2.5} strokeLinecap="round"
          animate={{ x2: [160, 118, 160] }} transition={{ duration: 0.55, repeat: Infinity, ease: 'easeInOut' }} />
      </motion.g>

      {/* Speed lines during sprint */}
      <motion.g animate={{ opacity: [0, 0.5, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, times: [0.1, 0.25, 0.35] }}>
        {[{ y: 55 }, { y: 75 }, { y: 95 }].map((p, i) => (
          <line key={i} x1={80} y1={p.y} x2={55} y2={p.y} stroke={accent} strokeWidth={1.5} strokeLinecap="round" opacity={0.35} />
        ))}
        <text x={55} y={48} fill={accent} fontSize={9} fontWeight={800} fontFamily="system-ui">VITE!</text>
      </motion.g>

      {/* STOP indicator */}
      <motion.g animate={{ opacity: [0, 1, 0], scale: [0.8, 1.1, 0.8] }}
        transition={{ duration: 3.5, repeat: Infinity, times: [0.35, 0.42, 0.5] }}
        style={{ originX: 200, originY: 90 }}>
        <rect x={180} y={78} width={45} height={20} rx={4} fill="#ef4444" />
        <text x={202} y={92} fill="white" fontSize={8.5} fontWeight={800} fontFamily="system-ui" textAnchor="middle">STOP 🛑</text>
      </motion.g>

      {/* Decel marks */}
      <motion.g animate={{ opacity: [0, 0.5, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, times: [0.36, 0.44, 0.52] }}>
        {[0, 5, 10].map((dx, i) => (
          <line key={i} x1={175 + dx} y1={170} x2={175 + dx} y2={176} stroke={accent} strokeWidth={1} opacity={0.4} />
        ))}
      </motion.g>

      {/* Focus labels */}
      <FocusLabel text="Ralentis → Arrête → Explose" x={15} y={48} color={accent} delay={0} />
    </g>
  )
}

// ══════════════════════════════════════════════════════════════════════
// 5. DEFENSE — Low wide stance, hands up, lateral slides
// ══════════════════════════════════════════════════════════════════════
function DefenseAnim({ accent, accentDim }: { accent: string; accentDim: string }) {
  return (
    <g>
      <Hoop x={255} rimY={55} />

      {/* Defensive coverage zone */}
      <motion.ellipse cx={130} cy={135} rx={50} ry={30} fill="none"
        stroke={accent} strokeWidth={1} strokeDasharray="5 4" opacity={0.2}
        animate={{ rx: [50, 44, 50] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }} />
      <text x={130} y={165} fill={accent} fontSize={6.5} fontWeight={600} fontFamily="system-ui" textAnchor="middle" opacity={0.35}>ZONE DÉFENSIVE</text>

      {/* Slide direction arrows */}
      <motion.g animate={{ opacity: [0, 0.7, 0] }} transition={{ duration: 2.8, repeat: Infinity, times: [0, 0.2, 0.4] }}>
        <Arrow x1={50} y1={135} x2={30} y2={135} color={accent} />
      </motion.g>
      <motion.g animate={{ opacity: [0, 0.7, 0] }} transition={{ duration: 2.8, repeat: Infinity, times: [0.5, 0.7, 0.9] }}>
        <Arrow x1={210} y1={135} x2={230} y2={135} color={accent} />
      </motion.g>

      {/* Defensive player — LOW, wide, hands UP */}
      <motion.g
        animate={{ x: [-30, 30, -30] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', times: [0, 0.5, 1] }}
      >
        {/* Head */}
        <circle cx={130} cy={82} r={9} fill="none" stroke={accent} strokeWidth={2.5} />

        {/* Torso — upright, low center */}
        <line x1={130} y1={91} x2={130} y2={118} stroke={accent} strokeWidth={2.5} strokeLinecap="round" />

        {/* Arms — HIGH and WIDE, active hands */}
        <motion.line x1={130} y1={96} x2={100} y2={72} stroke={accent} strokeWidth={2.5} strokeLinecap="round"
          animate={{ y2: [72, 76, 72], x2: [100, 95, 100] }}
          transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }} />
        {/* Left hand */}
        <motion.circle r={4} fill={accent} opacity={0.5}
          animate={{ cx: [100, 95, 100], cy: [72, 76, 72] }}
          transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }} />

        <motion.line x1={130} y1={96} x2={160} y2={72} stroke={accent} strokeWidth={2.5} strokeLinecap="round"
          animate={{ y2: [72, 68, 72], x2: [160, 165, 160] }}
          transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }} />
        {/* Right hand */}
        <motion.circle r={4} fill={accent} opacity={0.5}
          animate={{ cx: [160, 165, 160], cy: [72, 68, 72] }}
          transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }} />

        {/* "HANDS UP" label */}
        <motion.g animate={{ opacity: [0.4, 0.9, 0.4] }} transition={{ duration: 1.2, repeat: Infinity }}>
          <text x={130} y={62} fill={accent} fontSize={7} fontWeight={700} fontFamily="system-ui" textAnchor="middle">✋ MAINS HAUTES</text>
        </motion.g>

        {/* Thighs — very bent, wide */}
        <line x1={130} y1={118} x2={102} y2={142} stroke={accent} strokeWidth={2.5} strokeLinecap="round" />
        <line x1={130} y1={118} x2={158} y2={142} stroke={accent} strokeWidth={2.5} strokeLinecap="round" />
        {/* Shins */}
        <line x1={102} y1={142} x2={90} y2={172} stroke={accent} strokeWidth={2.5} strokeLinecap="round" />
        <line x1={158} y1={142} x2={170} y2={172} stroke={accent} strokeWidth={2.5} strokeLinecap="round" />
      </motion.g>

      {/* Focus labels */}
      <FocusLabel text="Stance basse & large" x={15} y={48} color={accent} delay={0} />
      <FocusLabel text="Glissades latérales rapides" x={15} y={68} color={accent} delay={0.3} />
    </g>
  )
}

// ══════════════════════════════════════════════════════════════════════
// 6. SHOOTING — BEEF form, raise ball, arc, follow-through
// ══════════════════════════════════════════════════════════════════════
function ShootingAnim({ accent, accentDim }: { accent: string; accentDim: string }) {
  return (
    <g>
      <Hoop x={248} rimY={62} />

      {/* BEEF letters along the arc */}
      <motion.g animate={{ opacity: [0.1, 0.4, 0.1] }} transition={{ duration: 3, repeat: Infinity }}>
        <text x={50} y={165} fill={accent} fontSize={8} fontWeight={800} fontFamily="system-ui" opacity={0.4}>B</text>
        <text x={68} y={155} fill={accent} fontSize={8} fontWeight={800} fontFamily="system-ui" opacity={0.4}>E</text>
        <text x={90} y={148} fill={accent} fontSize={8} fontWeight={800} fontFamily="system-ui" opacity={0.4}>E</text>
        <text x={115} y={144} fill={accent} fontSize={8} fontWeight={800} fontFamily="system-ui" opacity={0.4}>F</text>
      </motion.g>

      {/* Trajectory arc guide */}
      <motion.path
        d="M75,120 Q150,10 232,62"
        fill="none" stroke={accent} strokeWidth={1.2} strokeDasharray="4 3"
        animate={{ opacity: [0.15, 0.4, 0.15] }}
        transition={{ duration: 2.4, repeat: Infinity }}
      />
      <text x={155} y={38} fill={accent} fontSize={6.5} fontWeight={600} fontFamily="system-ui" textAnchor="middle" opacity={0.5}>TRAJECTOIRE ARC</text>

      {/* Shooter — side view, faces right toward hoop */}
      <g>
        {/* Head */}
        <circle cx={75} cy={70} r={9} fill="none" stroke={accent} strokeWidth={2.5} />
        {/* Eyes on target */}
        <motion.g animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}>
          <text x={88} y={67} fill={accent} fontSize={7} fontWeight={700} fontFamily="system-ui">👁️ CIBLE</text>
        </motion.g>
        {/* Torso */}
        <line x1={75} y1={79} x2={72} y2={118} stroke={accent} strokeWidth={2.5} strokeLinecap="round" />

        {/* Shooting arm — raise and extend */}
        <motion.line x1={75} y1={90}
          stroke={accent} strokeWidth={2.5} strokeLinecap="round"
          animate={{ x2: [60, 75, 95, 90], y2: [100, 78, 65, 58] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', times: [0, 0.2, 0.4, 0.55] }} />
        {/* Forearm/hand */}
        <motion.line x1={75} y1={78}
          stroke={accent} strokeWidth={2.5} strokeLinecap="round"
          animate={{ x1: [60, 75, 95, 90], y1: [100, 78, 65, 58], x2: [60, 88, 108, 100], y2: [92, 68, 50, 44] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', times: [0, 0.2, 0.4, 0.55] }} />

        {/* Follow-through wrist flick */}
        <motion.g animate={{ opacity: [0, 0, 0.7, 0.3, 0] }}
          transition={{ duration: 2.8, repeat: Infinity, times: [0, 0.35, 0.45, 0.55, 0.75] }}>
          <text x={104} y={38} fill={accent} fontSize={7} fontWeight={700} fontFamily="system-ui">✋ WRIST!</text>
        </motion.g>

        {/* Guide hand */}
        <motion.line x1={75} y1={90} x2={60} y2={98} stroke={accent} strokeWidth={2} strokeLinecap="round"
          animate={{ x2: [60, 65, 60], y2: [98, 85, 98] }}
          transition={{ duration: 2.8, repeat: Infinity, times: [0, 0.4, 0.55] }} />

        {/* Legs — knee bend then extend */}
        <motion.line x1={72} y1={118} x2={58} y2={172} stroke={accent} strokeWidth={2.5} strokeLinecap="round"
          animate={{ y2: [172, 166, 172] }}
          transition={{ duration: 2.8, repeat: Infinity, times: [0, 0.4, 0.55] }} />
        <motion.line x1={72} y1={118} x2={86} y2={172} stroke={accent} strokeWidth={2.5} strokeLinecap="round"
          animate={{ y2: [172, 166, 172] }}
          transition={{ duration: 2.8, repeat: Infinity, times: [0, 0.4, 0.55] }} />
      </g>

      {/* Ball — arc from hand to hoop */}
      <motion.g
        animate={{
          cx: [60, 75, 130, 200, 232],
          cy: [100, 78, 28, 42, 62],
          opacity: [1, 1, 1, 1, 0],
        }}
        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', times: [0.2, 0.3, 0.45, 0.55, 0.65] }}
      >
        <Ball cx={0} cy={0} r={7} />
      </motion.g>

      {/* SWISH text when ball goes in */}
      <motion.g animate={{ opacity: [0, 0, 1, 1, 0], scale: [0.5, 0.5, 1.2, 1, 0.8] }}
        transition={{ duration: 2.8, repeat: Infinity, times: [0, 0.6, 0.65, 0.75, 0.85] }}
        style={{ originX: 232, originY: 50 }}>
        <text x={232} y={50} fill="#22c55e" fontSize={10} fontWeight={800} fontFamily="system-ui" textAnchor="middle">SWISH!</text>
      </motion.g>

      {/* Focus labels */}
      <FocusLabel text="B=Équilibre E=Yeux E=Coude F=Suivi" x={15} y={38} color={accent} delay={0} />
    </g>
  )
}

// ══════════════════════════════════════════════════════════════════════
// 7. FOOTWORK — Ladder drill, quick feet, pivots
// ══════════════════════════════════════════════════════════════════════
function FootworkAnim({ accent, accentDim }: { accent: string; accentDim: string }) {
  const rungYs = [75, 100, 125, 150]
  return (
    <g>
      {/* Ladder outline */}
      <rect x={65} y={60} width={130} height={108} rx={3} fill="none" stroke={accent} strokeWidth={1.5} opacity={0.5} />
      {rungYs.map((y) => (
        <line key={y} x1={65} y1={y} x2={195} y2={y} stroke={accent} strokeWidth={1} opacity={0.35} />
      ))}
      <text x={130} y={55} fill={accent} fontSize={7} fontWeight={700} fontFamily="system-ui" textAnchor="middle" opacity={0.6}>ÉCHELLE D'AGILITÉ</text>

      {/* Direction arrow */}
      <polygon points="130,52 125,46 135,46" fill={accent} opacity={0.5} />

      {/* Left foot — in/out pattern */}
      <motion.ellipse rx={9} ry={13} fill={accent} opacity={0.3}
        animate={{
          cx: [55, 85, 55, 110, 55, 135, 55, 160, 55, 135, 55, 110, 55, 85, 55],
          cy: [75, 87, 100, 112, 125, 137, 150, 162, 150, 137, 125, 112, 100, 87, 75],
        }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut',
          times: [0, .07, .14, .21, .28, .35, .42, .5, .57, .64, .71, .78, .85, .92, 1] }}
      />
      <text x={55} y={78} fill="white" fontSize={6} fontWeight={700} fontFamily="system-ui" textAnchor="middle" opacity={0.6}>G</text>

      {/* Right foot — mirror pattern */}
      <motion.ellipse rx={9} ry={13} fill={accent} opacity={0.5}
        animate={{
          cx: [205, 175, 205, 150, 205, 125, 205, 100, 205, 125, 205, 150, 205, 175, 205],
          cy: [87, 100, 112, 125, 137, 150, 162, 150, 137, 125, 112, 100, 87, 75, 87],
        }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut',
          times: [0, .07, .14, .21, .28, .35, .42, .5, .57, .64, .71, .78, .85, .92, 1] }}
      />
      <text x={205} y={90} fill="white" fontSize={6} fontWeight={700} fontFamily="system-ui" textAnchor="middle" opacity={0.6}>D</text>

      {/* "QUICK FEET" pulsing text */}
      <motion.g animate={{ opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 0.8, repeat: Infinity }}>
        <text x={130} y={182} fill={accent} fontSize={8} fontWeight={800} fontFamily="system-ui" textAnchor="middle">🦶 PIEDS RAPIDES!</text>
      </motion.g>

      {/* Focus labels */}
      <FocusLabel text="Un pied par case" x={15} y={75} color={accent} delay={0} />
      <FocusLabel text="Restez léger sur les pieds" x={15} y={95} color={accent} delay={0.3} />
    </g>
  )
}

// ══════════════════════════════════════════════════════════════════════
// 8. FINISHING — Drive, 2 steps, layup at rim
// ══════════════════════════════════════════════════════════════════════
function FinishingAnim({ accent, accentDim }: { accent: string; accentDim: string }) {
  return (
    <g>
      <Hoop x={250} rimY={65} />

      {/* 2-STEP markers on floor */}
      <motion.g animate={{ opacity: [0.15, 0.4, 0.15] }} transition={{ duration: 3.2, repeat: Infinity }}>
        <circle cx={110} cy={172} r={10} fill="none" stroke={accent} strokeWidth={1.5} strokeDasharray="3 2" />
        <text x={110} y={175} fill={accent} fontSize={8} fontWeight={800} fontFamily="system-ui" textAnchor="middle">1</text>
        <circle cx={160} cy={172} r={10} fill="none" stroke={accent} strokeWidth={1.5} strokeDasharray="3 2" />
        <text x={160} y={175} fill={accent} fontSize={8} fontWeight={800} fontFamily="system-ui" textAnchor="middle">2</text>
        <text x={135} y={185} fill={accent} fontSize={7} fontWeight={600} fontFamily="system-ui" textAnchor="middle">2 PAS</text>
      </motion.g>

      {/* Drive path arrow */}
      <motion.path
        d="M40,172 L100,172 L155,172 L200,140"
        fill="none" stroke={accent} strokeWidth={1.5} strokeDasharray="6 4"
        animate={{ opacity: [0.15, 0.4, 0.15] }}
        transition={{ duration: 2, repeat: Infinity }}
      />

      {/* Player — drives from left, 2 steps, jump, layup */}
      <motion.g
        animate={{ x: [-60, -25, 35, 65, 35, -60] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut',
          times: [0, 0.2, 0.38, 0.48, 0.62, 1] }}
      >
        <motion.g
          animate={{ y: [0, 0, 0, -35, 0, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut',
            times: [0, 0.2, 0.38, 0.48, 0.62, 1] }}
        >
          {/* Head */}
          <circle cx={120} cy={55} r={9} fill="none" stroke={accent} strokeWidth={2.5} />
          {/* Torso */}
          <motion.line x1={120} y1={64} x2={117} y2={105} stroke={accent} strokeWidth={2.5} strokeLinecap="round"
            animate={{ rotate: [0, -5, -10, -6, 0, 0] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', times: [0, 0.2, 0.38, 0.48, 0.62, 1] }}
            style={{ originX: 117, originY: 64 }} />

          {/* Ball hand — brings ball up for layup */}
          <motion.line x1={117} y1={78}
            stroke={accent} strokeWidth={2.5} strokeLinecap="round"
            animate={{ x2: [98, 108, 135, 155, 135, 98], y2: [88, 82, 60, 48, 62, 88] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut',
              times: [0, 0.2, 0.38, 0.5, 0.62, 1] }} />
          {/* Off hand for protection */}
          <motion.line x1={117} y1={78}
            x2={138} y2={88} stroke={accent} strokeWidth={2.5} strokeLinecap="round"
            animate={{ x2: [138, 130, 120, 115, 130, 138] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut',
              times: [0, 0.2, 0.38, 0.5, 0.62, 1] }} />

          {/* Legs */}
          <motion.line x1={117} y1={105} x2={95} y2={170} stroke={accent} strokeWidth={2.5} strokeLinecap="round"
            animate={{ y2: [170, 170, 170, 190, 170, 170], x2: [95, 110, 135, 145, 135, 95] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', times: [0, 0.2, 0.38, 0.5, 0.62, 1] }} />
          <motion.line x1={117} y1={105} x2={140} y2={170} stroke={accent} strokeWidth={2.5} strokeLinecap="round"
            animate={{ y2: [170, 170, 170, 190, 170, 170], x2: [140, 125, 105, 95, 105, 140] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', times: [0, 0.2, 0.38, 0.5, 0.62, 1] }} />
        </motion.g>
      </motion.g>

      {/* Ball — releases and arcs to hoop */}
      <motion.g
        animate={{ cx: [70, 95, 160, 195, 232], cy: [88, 82, 48, 55, 65], opacity: [1, 1, 1, 1, 0] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', times: [0.42, 0.5, 0.58, 0.64, 0.72] }}
      >
        <Ball cx={0} cy={0} r={7} />
      </motion.g>

      {/* BACKBOARD text hint */}
      <motion.g animate={{ opacity: [0, 0, 0.8, 0.8, 0] }}
        transition={{ duration: 3.2, repeat: Infinity, times: [0, 0.55, 0.65, 0.75, 0.85] }}>
        <text x={250} y={48} fill={accent} fontSize={6.5} fontWeight={700} fontFamily="system-ui" textAnchor="middle">PANNEAU ↗</text>
      </motion.g>

      {/* Focus labels */}
      <FocusLabel text="Conduite → 2 pas → Layup" x={15} y={48} color={accent} delay={0} />
      <FocusLabel text="Main haute au panneau" x={15} y={68} color={accent} delay={0.3} />
    </g>
  )
}

// ══════════════════════════════════════════════════════════════════════
// 9. CONDITIONING — Sprints, shuttle, burpees
// ══════════════════════════════════════════════════════════════════════
function ConditioningAnim({ accent, accentDim }: { accent: string; accentDim: string }) {
  return (
    <g>
      {/* Court lines for sprint */}
      <motion.g animate={{ opacity: [0.2, 0.4, 0.2] }} transition={{ duration: 2, repeat: Infinity }}>
        <line x1={30} y1={172} x2={30} y2={178} stroke={accent} strokeWidth={2} />
        <text x={30} y={188} fill={accent} fontSize={6} fontWeight={600} fontFamily="system-ui" textAnchor="middle">DÉPART</text>
        <line x1={130} y1={172} x2={130} y2={178} stroke={accent} strokeWidth={2} />
        <text x={130} y={188} fill={accent} fontSize={6} fontWeight={600} fontFamily="system-ui" textAnchor="middle">MIDI</text>
        <line x1={235} y1={172} x2={235} y2={178} stroke={accent} strokeWidth={2} />
        <text x={235} y={188} fill={accent} fontSize={6} fontWeight={600} fontFamily="system-ui" textAnchor="middle">BUT</text>
      </motion.g>

      {/* Sprint lines */}
      <line x1={30} y1={175} x2={235} y2={175} stroke={accent} strokeWidth={0.8} strokeDasharray="6 4" opacity={0.2} />

      {/* Sprinting figure */}
      <motion.g
        animate={{ x: [-20, -20, 140, 140, -20] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'linear', times: [0, 0.05, 0.35, 0.55, 0.9] }}
      >
        {/* Forward lean */}
        <motion.g
          animate={{ rotate: [0, 0, -18, -18, 0] }}
          transition={{ duration: 3, repeat: Infinity, times: [0, 0.05, 0.35, 0.55, 0.9] }}
          style={{ originX: 140, originY: 55 }}
        >
          <circle cx={140} cy={48} r={9} fill="none" stroke={accent} strokeWidth={2.5} />
          <line x1={140} y1={57} x2={136} y2={100} stroke={accent} strokeWidth={2.5} strokeLinecap="round" />
        </motion.g>

        {/* Arms pumping hard */}
        <motion.line x1={138} y1={70} x2={115} y2={95} stroke={accent} strokeWidth={2.5} strokeLinecap="round"
          animate={{ x2: [115, 162, 115], y2: [95, 75, 95] }}
          transition={{ duration: 0.5, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.line x1={138} y1={70} x2={162} y2={75} stroke={accent} strokeWidth={2.5} strokeLinecap="round"
          animate={{ x2: [162, 115, 162], y2: [75, 95, 75] }}
          transition={{ duration: 0.5, repeat: Infinity, ease: 'easeInOut' }} />

        {/* Legs — full stride */}
        <motion.line x1={136} y1={100} x2={112} y2={170} stroke={accent} strokeWidth={2.5} strokeLinecap="round"
          animate={{ x2: [112, 162, 112] }} transition={{ duration: 0.5, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.line x1={136} y1={100} x2={162} y2={170} stroke={accent} strokeWidth={2.5} strokeLinecap="round"
          animate={{ x2: [162, 112, 162] }} transition={{ duration: 0.5, repeat: Infinity, ease: 'easeInOut' }} />
      </motion.g>

      {/* Speed lines */}
      <motion.g animate={{ opacity: [0, 0.6, 0] }}
        transition={{ duration: 3, repeat: Infinity, times: [0.08, 0.25, 0.35] }}>
        {[{ y: 50 }, { y: 68 }, { y: 86 }].map((p, i) => (
          <line key={i} x1={85} y1={p.y} x2={60} y2={p.y} stroke={accent} strokeWidth={1.5} strokeLinecap="round" opacity={0.4} />
        ))}
      </motion.g>

      {/* "MAX EFFORT" pulsing */}
      <motion.g animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 0.8, repeat: Infinity }}>
        <rect x={150} y={35} width={95} height={20} rx={5} fill={accent} fillOpacity={0.2} />
        <text x={197} y={49} fill={accent} fontSize={8.5} fontWeight={800} fontFamily="system-ui" textAnchor="middle">💪 MAX EFFORT!</text>
      </motion.g>

      {/* Heart rate indicator */}
      <motion.g animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 0.6, repeat: Infinity, ease: 'easeInOut' }}
        style={{ originX: 20, originY: 55 }}>
        <text x={20} y={60} fill={accent} fontSize={16}>❤️</text>
        <text x={32} y={60} fill={accent} fontSize={7} fontWeight={700} fontFamily="system-ui">BPM ↑</text>
      </motion.g>

      {/* Focus labels */}
      <FocusLabel text="Sprint ligne de fond → fond" x={15} y={90} color={accent} delay={0} />
    </g>
  )
}

// ══════════════════════════════════════════════════════════════════════
// DEFAULT — gentle bounce with ball
// ══════════════════════════════════════════════════════════════════════
function DefaultAnim({ accent, accentDim }: { accent: string; accentDim: string }) {
  return (
    <g>
      <motion.g animate={{ y: [0, -6, 0] }} transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}>
        <circle cx={140} cy={62} r={9} fill="none" stroke={accent} strokeWidth={2.5} />
        <line x1={140} y1={71} x2={140} y2={110} stroke={accent} strokeWidth={2.5} strokeLinecap="round" />
        <line x1={140} y1={84} x2={115} y2={100} stroke={accent} strokeWidth={2.5} strokeLinecap="round" />
        <line x1={140} y1={84} x2={165} y2={100} stroke={accent} strokeWidth={2.5} strokeLinecap="round" />
        <line x1={140} y1={110} x2={120} y2={170} stroke={accent} strokeWidth={2.5} strokeLinecap="round" />
        <line x1={140} y1={110} x2={160} y2={170} stroke={accent} strokeWidth={2.5} strokeLinecap="round" />
      </motion.g>
      <Ball cx={168} cy={108} r={7} />
      <FocusLabel text="Suivez les instructions" x={60} y={48} color={accent} delay={0} />
    </g>
  )
}

// ══════════════════════════════════════════════════════════════════════
// ANIMATION MAP + MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════
type AnimFn = (props: { accent: string; accentDim: string }) => React.JSX.Element

const ANIMS: Record<string, AnimFn> = {
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
  const meta = META[category] ?? DEFAULT_META
  const AnimFn = ANIMS[category] ?? DefaultAnim
  const showFloor = category !== 'footwork'

  return (
    <div className={cn('relative w-full overflow-hidden rounded-2xl', className)}
      style={{ background: `linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)` }}>

      {/* Header bar with category title */}
      <div className="px-4 pt-3 pb-1 flex items-center justify-between">
        <div>
          <h3 className="text-white font-bold text-sm tracking-tight">{meta.title}</h3>
          <p className="text-white/50 text-[11px]">{meta.subtitle}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: meta.accent }} />
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: meta.accent }}>
            Démo
          </span>
        </div>
      </div>

      {/* Main SVG animation */}
      <svg viewBox="0 0 280 200" className="block w-full" style={{ maxHeight: 240 }}>
        {/* Subtle accent glow */}
        <defs>
          <radialGradient id={`glow-${category}`} cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor={meta.accent} stopOpacity={0.08} />
            <stop offset="100%" stopColor={meta.accent} stopOpacity={0} />
          </radialGradient>
        </defs>
        <rect x={0} y={0} width={280} height={200} fill={`url(#glow-${category})`} />

        {showFloor && <CourtFloor y={175} />}
        <AnimFn accent={meta.accent} accentDim={meta.accentDim} />
      </svg>

      {/* Focus points footer */}
      <div className="px-4 py-2.5 flex flex-wrap gap-1.5 border-t border-white/5">
        {meta.focus.map((f, i) => (
          <motion.span
            key={f}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.1, duration: 0.3 }}
            className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{ backgroundColor: meta.accentDim, color: meta.accent }}
          >
            <span className="w-1 h-1 rounded-full" style={{ backgroundColor: meta.accent }} />
            {f}
          </motion.span>
        ))}
      </div>
    </div>
  )
}