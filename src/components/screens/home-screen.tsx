'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/components/providers/supabase-auth-provider';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Camera, ChevronRight, Sparkles, Trophy, Zap, Flame, Target, TrendingUp, Play, Star, Activity, RefreshCw, Crown,  } from 'lucide-react';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/stores/app';
import { cn, apiFetch, formatLocaleDate } from '@/lib/utils';
import { getLevelInfo } from '@/lib/xp';
import { useTranslation } from '@/components/providers/language-provider';
import { BottomNav } from '@/components/shared/bottom-nav';
import { PullToRefresh } from '@/components/shared/pull-to-refresh';

interface DailyStat { date: string; sessions: number; reps: number; score: number }
interface StatsResponse {
  totalSessions: number; totalReps: number; avgScore: number; weekSessions: number;
  dailyStats: DailyStat[]; currentStreak: number; bestStreak: number; achievementCount: number;
  weeklyTrainingHours: number; drillsCompleted: number;
}
interface RecommendationDrill {
  id: string; name: string; nameFr: string; category: string; difficulty: string;
  icon: string; reasonFr: string; bestScore?: number;
}
interface SessionDrill { drill: { id: string; nameFr: string; icon: string }; score: number; reps: number }
interface Session {
  id: string; startedAt: string; totalScore: number; totalReps: number;
  totalDrills: number; drills: SessionDrill[];
}
interface PlayerXpData { xp: number; xpLevel: number }
interface FullPlayerData { xp?: number; xpLevel?: number; [key: string]: unknown }

// ── Animated Court Background ─────────────────────────────────────────────
function CourtBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Deep gradient base */}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse 120% 80% at 50% -20%, rgba(249,115,22,0.08) 0%, transparent 60%), radial-gradient(ellipse 80% 60% at 80% 100%, rgba(234,88,12,0.06) 0%, transparent 50%)',
      }} />

      {/* Animated orb 1 */}
      <motion.div
        animate={{ x: [0, 40, 0], y: [0, -30, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.12) 0%, transparent 65%)' }}
      />
      {/* Animated orb 2 */}
      <motion.div
        animate={{ x: [0, -30, 0], y: [0, 40, 0], scale: [1, 1.2, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
        className="absolute -bottom-60 -left-32 w-[450px] h-[450px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(234,88,12,0.1) 0%, transparent 65%)' }}
      />
      {/* Animated orb 3 — center pulse */}
      <motion.div
        animate={{ scale: [1, 1.3, 1], opacity: [0.04, 0.08, 0.04] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(251,146,60,1) 0%, transparent 70%)' }}
      />

      {/* Court lines SVG — subtle */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.025]" viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <circle cx="195" cy="422" r="120" fill="none" stroke="#f97316" strokeWidth="1.5" />
        <line x1="195" y1="0" x2="195" y2="844" stroke="#f97316" strokeWidth="1" />
        <rect x="20" y="20" width="350" height="804" fill="none" stroke="#f97316" strokeWidth="1.5" />
        <rect x="20" y="20" width="120" height="200" fill="none" stroke="#f97316" strokeWidth="1" />
        <rect x="250" y="20" width="120" height="200" fill="none" stroke="#f97316" strokeWidth="1" />
        <circle cx="80" cy="120" r="40" fill="none" stroke="#f97316" strokeWidth="1" />
        <circle cx="310" cy="120" r="40" fill="none" stroke="#f97316" strokeWidth="1" />
        <rect x="20" y="624" width="120" height="200" fill="none" stroke="#f97316" strokeWidth="1" />
        <rect x="250" y="624" width="120" height="200" fill="none" stroke="#f97316" strokeWidth="1" />
      </svg>

      {/* Noise grain overlay */}
      <div className="absolute inset-0 opacity-[0.015]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat',
        backgroundSize: '128px',
      }} />
    </div>
  );
}

// ── XP Gain Popup ─────────────────────────────────────────────────────────
function XpGainPopup({ xpGained, leveledUp, onDone }: { xpGained: number; leveledUp: boolean; onDone: () => void }) {
  const { td } = useTranslation();
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  return (
    <motion.div
      initial={{ opacity: 0, y: 60, scale: 0.7 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -40, scale: 0.85 }}
      transition={{ type: 'spring', stiffness: 500, damping: 28 }}
      className="fixed inset-x-0 top-16 z-50 flex flex-col items-center pointer-events-none gap-3"
    >
      {leveledUp && (
        <motion.div
          initial={{ opacity: 0, scale: 0.4, rotate: -15 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 600, damping: 20 }}
          className="px-8 py-3.5 rounded-2xl shadow-2xl"
          style={{
            background: 'linear-gradient(135deg, #f97316 0%, #ea580c 50%, #f59e0b 100%)',
            boxShadow: '0 0 60px rgba(249,115,22,0.7), 0 0 120px rgba(249,115,22,0.3)',
          }}
        >
          <div className="flex items-center gap-3">
            <motion.div animate={{ rotate: [0, 20, -20, 0] }} transition={{ duration: 0.5, delay: 0.3 }}>
              <Sparkles className="h-6 w-6 text-white" />
            </motion.div>
            <span className="text-xl font-black text-white tracking-widest uppercase">
              {td('NIVEAU SUPÉRIEUR !', 'LEVEL UP!')}
            </span>
            <motion.div animate={{ rotate: [0, -20, 20, 0] }} transition={{ duration: 0.5, delay: 0.3 }}>
              <Sparkles className="h-6 w-6 text-white" />
            </motion.div>
          </div>
        </motion.div>
      )}
      <motion.div
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.15, type: 'spring', stiffness: 500, damping: 25 }}
        className="flex items-center gap-2.5 px-6 py-3 rounded-2xl"
        style={{
          background: 'rgba(249,115,22,0.95)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 0 40px rgba(249,115,22,0.6), 0 8px 32px rgba(0,0,0,0.4)',
          border: '1px solid rgba(255,255,255,0.2)',
        }}
      >
        <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 0.6, delay: 0.2 }}>
          <Zap className="h-5 w-5 text-white fill-white" />
        </motion.div>
        <span className="text-xl font-black text-white tracking-tight">+{xpGained} XP</span>
      </motion.div>
    </motion.div>
  );
}

// ── Bento Stat Card ───────────────────────────────────────────────────────
function BentoStatCard({ icon: Icon, value, label, color, accentColor, delay = 0, large = false }: {
  icon: React.ElementType; value: string | number; label: string;
  color: string; accentColor: string; delay?: number; large?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 350, damping: 25 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className={cn('relative overflow-hidden rounded-2xl p-4 flex flex-col gap-2 cursor-default', large && 'col-span-2')}
      style={{
        background: hovered
          ? `linear-gradient(135deg, ${accentColor}12, rgba(255,255,255,0.04))`
          : 'rgba(255,255,255,0.03)',
        border: `1px solid ${hovered ? accentColor + '30' : 'rgba(255,255,255,0.07)'}`,
        transition: 'all 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
        boxShadow: hovered ? `0 8px 32px ${accentColor}20` : '0 2px 8px rgba(0,0,0,0.2)',
      }}
    >
      {/* Background accent blob */}
      <motion.div
        animate={{ scale: hovered ? 1.2 : 1, opacity: hovered ? 0.15 : 0.06 }}
        transition={{ duration: 0.4 }}
        className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full"
        style={{ background: accentColor }}
      />

      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${accentColor}20`, border: `1px solid ${accentColor}30` }}>
        <Icon className="h-5 w-5" style={{ color: accentColor }} />
      </div>

      <div className="relative z-10">
        <motion.p
          key={String(value)}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn('font-black tabular-nums text-foreground', large ? 'text-3xl' : 'text-2xl')}
        >
          {value}
        </motion.p>
        <p className="text-xs text-muted-foreground font-medium mt-0.5 leading-tight">{label}</p>
      </div>
    </motion.div>
  );
}

// ── Drill Recommendation Card ─────────────────────────────────────────────
function DrillCard({ drill, index, onClick }: { drill: RecommendationDrill; index: number; onClick: () => void }) {
  const diffColor = drill.difficulty === 'beginner' ? '#22c55e' : drill.difficulty === 'intermediate' ? '#f97316' : '#ef4444';
  const [pressed, setPressed] = useState(false);

  return (
    <motion.button
      initial={{ opacity: 0, x: 30, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ delay: 0.06 * index, type: 'spring', stiffness: 300, damping: 24 }}
      whileHover={{ scale: 1.03, y: -4 }}
      whileTap={{ scale: 0.96 }}
      onTapStart={() => setPressed(true)}
      onTap={() => setPressed(false)}
      onTapCancel={() => setPressed(false)}
      onClick={onClick}
      className="relative flex-shrink-0 w-52 rounded-2xl p-4 text-left overflow-hidden group"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
      }}
    >
      {/* Hover gradient */}
      <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none"
        style={{ background: `linear-gradient(135deg, ${diffColor}10, transparent 60%)` }}
      />
      {/* Top accent */}
      <div className="absolute top-0 left-0 right-0 h-px"
        style={{ background: `linear-gradient(90deg, ${diffColor}80, transparent)` }} />

      <motion.div
        whileHover={{ scale: 1.15, rotate: -8 }}
        transition={{ type: 'spring', stiffness: 400, damping: 15 }}
        className="text-3xl mb-3 inline-block"
      >
        {drill.icon}
      </motion.div>

      <div className="flex items-center gap-1.5 mb-2">
        <motion.div
          animate={{ scale: [1, 1.4, 1] }}
          transition={{ duration: 2, repeat: Infinity, delay: index * 0.3 }}
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: diffColor }}
        />
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: diffColor }}>
          {drill.difficulty}
        </span>
      </div>

      <p className="text-sm font-bold text-foreground leading-tight line-clamp-2 mb-2">{drill.nameFr}</p>

      {drill.bestScore != null && (
        <div className="flex items-center gap-1">
          <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
          <span className="text-xs text-muted-foreground font-medium">{Math.round(drill.bestScore)}%</span>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, x: -4 }}
        whileHover={{ opacity: 1, x: 0 }}
        className="absolute bottom-3 right-3"
      >
        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)', boxShadow: '0 4px 12px rgba(249,115,22,0.5)' }}>
          <Play className="h-3.5 w-3.5 text-white fill-white ml-0.5" />
        </div>
      </motion.div>
    </motion.button>
  );
}

// ── Session Row ───────────────────────────────────────────────────────────
function SessionRow({ session, index }: { session: Session; index: number }) {
  const { language } = useTranslation();
  const date = new Date(session.startedAt);
  const formattedDate = formatLocaleDate(date, language, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const score = Math.round(session.totalScore);
  const scoreColor = score > 80 ? '#22c55e' : score > 50 ? '#f97316' : '#ef4444';
  const scoreGlow = score > 80 ? 'rgba(34,197,94,0.3)' : score > 50 ? 'rgba(249,115,22,0.3)' : 'rgba(239,68,68,0.3)';

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.07 * index, type: 'spring', stiffness: 300, damping: 26 }}
      whileHover={{ x: 4 }}
      className="flex items-center justify-between gap-3 rounded-xl px-4 py-3.5 group cursor-default"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        transition: 'all 0.2s ease',
      }}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <motion.div
          whileHover={{ scaleY: 1.2 }}
          className="w-1.5 h-10 rounded-full flex-shrink-0"
          style={{ background: `linear-gradient(180deg, ${scoreColor}, ${scoreColor}60)`, boxShadow: `0 0 10px ${scoreGlow}` }}
        />
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground truncate">{formattedDate}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {session.totalDrills} drill{session.totalDrills > 1 ? 's' : ''} · {session.totalReps} reps
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <span className="text-xl font-black tabular-nums" style={{ color: scoreColor, textShadow: `0 0 20px ${scoreGlow}` }}>
          {score}
        </span>
        <span className="text-xs text-muted-foreground font-medium">pts</span>
      </div>
    </motion.div>
  );
}

// ── Quick Action Button ───────────────────────────────────────────────────
function QuickAction({ icon: Icon, label, color, delay, onClick }: {
  icon: React.ElementType; label: string; color: string; delay: number; onClick: () => void;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 16, scale: 0.85 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 350, damping: 24 }}
      whileHover={{ scale: 1.06, y: -3 }}
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      className="flex flex-col items-center gap-2.5 py-4 rounded-2xl relative overflow-hidden group"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: `radial-gradient(circle at 50% 50%, ${color}12, transparent 70%)` }}
      />
      <motion.div
        whileHover={{ rotate: -8, scale: 1.1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 15 }}
        className="w-11 h-11 rounded-xl flex items-center justify-center relative z-10"
        style={{ background: `${color}18`, border: `1px solid ${color}28` }}
      >
        <Icon className="h-5 w-5" style={{ color }} />
      </motion.div>
      <span className="text-xs font-bold text-foreground relative z-10 px-1 text-center leading-tight">{label}</span>
    </motion.button>
  );
}

// ── Main Component ────────────────────────────────────────────────────────
export default function HomeScreen() {
  const { user } = useAuth();
  const navigate = useAppStore(s => s.navigate);
  const selectDrill = useAppStore(s => s.selectDrill);
  const workoutResult = useAppStore(s => s.workoutResult);
  const xpAwarded = useAppStore(s => s.xpAwarded);
  const clearWorkoutState = useAppStore(s => s.clearWorkoutState);
  const setWorkoutResult = useAppStore(s => s.setWorkoutResult);
  const queryClient = useQueryClient();
  const hasAwardedRef = useRef(false);
  const { t, td, language } = useTranslation();

  const userName = user?.name ?? td('Joueur', 'Player');
  const userInitial = userName.charAt(0).toUpperCase();

  const { data: playerXp, isLoading: playerXpLoading } = useQuery({
    queryKey: ['player-xp'],
    queryFn: () => apiFetch<FullPlayerData>('/api/player'),
    staleTime: 1000 * 60 * 2,
    select: (data: FullPlayerData): PlayerXpData => ({ xp: data.xp ?? 0, xpLevel: data.xpLevel ?? 1 }),
  });

  const levelInfo = playerXp ? getLevelInfo(playerXp.xp) : null;

  const { data: stats, isLoading: statsLoading, isError: statsError, refetch: refetchStats } = useQuery<StatsResponse>({
    queryKey: ['stats'],
    queryFn: () => apiFetch('/api/stats'),
    staleTime: 1000 * 60 * 2,
  });

  const { data: recommendations, isLoading: recsLoading } = useQuery<RecommendationDrill[]>({
    queryKey: ['recommendations'],
    queryFn: () => apiFetch('/api/recommendations'),
    staleTime: 1000 * 60 * 5,
  });

  const { data: sessionsData, isLoading: sessionsLoading } = useQuery<{ sessions: Session[] }>({
    queryKey: ['sessions'],
    queryFn: () => apiFetch<{ sessions: Session[] }>('/api/sessions'),
    staleTime: 1000 * 60 * 2,
  });

  const sessions = sessionsData?.sessions;
  const [xpPopup, setXpPopup] = useState<{ xpGained: number; leveledUp: boolean } | null>(null);

  useEffect(() => {
    if (xpAwarded && !hasAwardedRef.current) {
      hasAwardedRef.current = true;
      queueMicrotask(() => {
        setXpPopup({ xpGained: xpAwarded.xpGained, leveledUp: xpAwarded.leveledUp });
        queryClient.invalidateQueries({ queryKey: ['player-xp'] });
        clearWorkoutState();
      });
    }
  }, [xpAwarded, clearWorkoutState, queryClient]);

  const dailyRewardClaimed = useRef(false);
  useEffect(() => {
    if (dailyRewardClaimed.current || !user?.id) return;
    dailyRewardClaimed.current = true;
    fetch('/api/daily-reward', { method: 'POST' })
      .then(r => r.json())
      .then((data: { awarded: boolean; xp: number }) => {
        if (data.awarded) {
          toast.success(`🎁 ${td('Récompense quotidienne', 'Daily reward')} +${data.xp} XP!`, { duration: 3000 });
          queryClient.invalidateQueries({ queryKey: ['player-xp'] });
        }
      }).catch(() => {});
  }, [user?.id, queryClient, td]);

  useEffect(() => {
    if (workoutResult && !xpAwarded) {
      const timer = setTimeout(() => setWorkoutResult(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [workoutResult, xpAwarded, setWorkoutResult]);

  const dismissXpPopup = useCallback(() => setXpPopup(null), []);

  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - mondayOffset);
  startOfWeek.setHours(0, 0, 0, 0);

  const weekSessions = sessions?.filter(s => new Date(s.startedAt) >= startOfWeek) ?? [];
  const recentSessions = sessions?.slice(0, 5) ?? [];

  const drillBestScores = sessions
    ? sessions.reduce<Record<string, number>>((acc, s) => {
        for (const d of s.drills) {
          const prev = acc[d.drill.id];
          if (prev == null || d.score > prev) acc[d.drill.id] = d.score;
        }
        return acc;
      }, {})
    : {};

  const enrichedRecs = (recommendations ?? []).map(r => ({ ...r, bestScore: drillBestScores[r.id] ?? undefined }));
  const handleSelectDrill = (drillId: string) => { selectDrill(drillId); navigate('drill-detail'); };

  if (statsError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 px-4 min-h-screen">
        <p className="text-sm text-muted-foreground">{t('error.loadFailed')}</p>
        <Button variant="outline" size="sm" onClick={() => refetchStats()}>
          <RefreshCw className="h-4 w-4 mr-2" />{t('action.retry')}
        </Button>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background overflow-x-hidden">
      <CourtBackground />

      <AnimatePresence>
        {xpPopup && <XpGainPopup xpGained={xpPopup.xpGained} leveledUp={xpPopup.leveledUp} onDone={dismissXpPopup} />}
      </AnimatePresence>

      <PullToRefresh
        queryKeys={[['stats'], ['sessions'], ['recommendations'], ['player-xp']]}
        className="relative z-10 mx-auto max-w-lg md:max-w-2xl lg:max-w-4xl px-4 pb-28 pt-6"
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <motion.header
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-7 flex items-center justify-between"
        >
          <div className="flex-1 min-w-0">
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-2 mb-1"
            >
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity, delay: 2 }}
                className="text-base"
              >
                🏀
              </motion.div>
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-500">
                CourtVision AI
              </span>
            </motion.div>

            <h1 className="text-[1.65rem] font-black tracking-tight text-foreground leading-tight">
              {td('Bonjour', 'Hey')},{' '}
              <span style={{
                background: 'linear-gradient(90deg, #f97316 0%, #f59e0b 50%, #fb923c 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                {userName}
              </span>{' '}
              <motion.span
                animate={{ rotate: [0, 20, 0, 20, 0] }}
                transition={{ duration: 1.5, delay: 0.8, repeat: 1 }}
                className="inline-block"
              >
                👋
              </motion.span>
            </h1>

            {playerXpLoading ? (
              <Skeleton className="h-5 w-44 mt-2 rounded-full" />
            ) : levelInfo ? (
              <motion.div
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 }}
                className="mt-2.5 flex items-center gap-2.5"
              >
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.25)' }}>
                  <Crown className="h-3 w-3 text-orange-500" />
                  <span className="text-xs font-black text-orange-500">Niv. {levelInfo.currentLevel}</span>
                </div>
                {!levelInfo.isMaxLevel && (
                  <div className="flex items-center gap-2 flex-1 max-w-[160px]">
                    <div className="h-1.5 flex-1 rounded-full overflow-hidden" style={{ background: 'rgba(249,115,22,0.12)' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${levelInfo.progress * 100}%` }}
                        transition={{ delay: 0.5, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                        className="h-full rounded-full"
                        style={{
                          background: 'linear-gradient(90deg, #f97316, #f59e0b, #fb923c)',
                          boxShadow: '0 0 8px rgba(249,115,22,0.6)',
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground tabular-nums font-medium">
                      {levelInfo.xpInCurrentLevel}/{levelInfo.xpNeededForNextLevel}
                    </span>
                  </div>
                )}
              </motion.div>
            ) : null}
          </div>

          <div className="flex items-center gap-2.5 flex-shrink-0">
            <ThemeToggle />
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => navigate('profile')}
              className="relative w-12 h-12 rounded-2xl flex items-center justify-center text-base font-black text-white shadow-xl overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #f97316, #ea580c)',
                boxShadow: '0 4px 24px rgba(249,115,22,0.45)',
              }}
              aria-label={t('home.viewProfile')}
            >
              <motion.div
                className="absolute inset-0 opacity-0 hover:opacity-100"
                style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.2), transparent)' }}
              />
              {userInitial}
            </motion.button>
          </div>
        </motion.header>

        {/* ── Hero CTA Banner ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.18, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative mb-5 overflow-hidden rounded-3xl"
          style={{
            background: 'linear-gradient(135deg, #0f0500 0%, #1e0900 35%, #120600 70%, #0a0300 100%)',
            border: '1px solid rgba(249,115,22,0.25)',
            boxShadow: '0 0 80px rgba(249,115,22,0.12), 0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
          }}
        >
          {/* Court lines */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.06]" viewBox="0 0 400 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <circle cx="200" cy="90" r="55" fill="none" stroke="#f97316" strokeWidth="1.5" />
            <line x1="200" y1="0" x2="200" y2="180" stroke="#f97316" strokeWidth="1" />
            <rect x="2" y="2" width="396" height="176" fill="none" stroke="#f97316" strokeWidth="1.5" rx="4" />
            <rect x="2" y="40" width="70" height="100" fill="none" stroke="#f97316" strokeWidth="1" />
            <rect x="328" y="40" width="70" height="100" fill="none" stroke="#f97316" strokeWidth="1" />
            <circle cx="37" cy="90" r="18" fill="none" stroke="#f97316" strokeWidth="1" />
            <circle cx="363" cy="90" r="18" fill="none" stroke="#f97316" strokeWidth="1" />
          </svg>

          {/* Animated glow orbs */}
          <motion.div
            animate={{ x: [0, 20, 0], y: [0, -10, 0], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -top-16 -right-16 w-48 h-48 rounded-full"
            style={{ background: 'radial-gradient(circle, #f97316, transparent)' }}
          />
          <motion.div
            animate={{ x: [0, -15, 0], y: [0, 15, 0], opacity: [0.15, 0.25, 0.15] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
            className="absolute -bottom-10 left-10 w-32 h-32 rounded-full"
            style={{ background: 'radial-gradient(circle, #f59e0b, transparent)' }}
          />

          <div className="relative z-10 p-6 flex items-end justify-between gap-4">
            <div>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-400 mb-2"
              >
                {td('Prêt à dominer ?', 'Ready to dominate?')}
              </motion.p>
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="text-2xl font-black text-white leading-tight mb-1.5"
              >
                {td('Lance ton', 'Start your')}{' '}
                <span style={{
                  background: 'linear-gradient(90deg, #f97316, #f59e0b)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>
                  {td('entraînement', 'training')}
                </span>
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-xs text-orange-200/50 font-medium"
              >
                {weekSessions.length} {td('session(s) cette semaine', 'session(s) this week')}
              </motion.p>
            </div>

            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.45, type: 'spring', stiffness: 400, damping: 20 }}
              whileHover={{ scale: 1.08, y: -2 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => navigate('train-hub')}
              className="flex-shrink-0 flex items-center gap-2 px-5 py-3.5 rounded-2xl font-black text-sm text-white relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #f97316, #ea580c)',
                boxShadow: '0 6px 28px rgba(249,115,22,0.55)',
              }}
            >
              <motion.div
                className="absolute inset-0"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'linear', repeatDelay: 3 }}
                style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)' }}
              />
              <Play className="h-4 w-4 fill-white relative z-10" />
              <span className="relative z-10">{td('Démarrer', 'Start')}</span>
            </motion.button>
          </div>
        </motion.div>

        {/* ── Stats Bento Grid ─────────────────────────────────────────── */}
        {statsLoading ? (
          <div className="grid grid-cols-2 gap-3 mb-5">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
          </div>
        ) : stats ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.22 }}
            className="grid grid-cols-2 gap-3 mb-5"
          >
            <BentoStatCard icon={Flame} value={stats.currentStreak} label={td('Jours consécutifs', 'Day streak')} color="bg-orange-500" accentColor="#f97316" delay={0.06} />
            <BentoStatCard icon={Activity} value={`${stats.weeklyTrainingHours}h`} label={td('Heures semaine', 'Weekly hours')} color="bg-amber-500" accentColor="#f59e0b" delay={0.1} />
            <BentoStatCard icon={Target} value={stats.drillsCompleted} label={td('Exercices maîtrisés', 'Drills completed')} color="bg-red-500" accentColor="#ef4444" delay={0.14} />
            <BentoStatCard icon={Trophy} value={stats.achievementCount} label={td('Succès débloqués', 'Achievements')} color="bg-orange-600" accentColor="#ea580c" delay={0.18} />
          </motion.div>
        ) : null}

        {/* ── Quick Actions ─────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.28 }}
          className="grid grid-cols-3 gap-3 mb-7"
        >
          <QuickAction icon={Camera} label={td('Caméra IA', 'AI Camera')} color="#f97316" delay={0.3} onClick={() => navigate('camera-workout')} />
          <QuickAction icon={TrendingUp} label={td('Stats', 'Stats')} color="#f59e0b" delay={0.34} onClick={() => navigate('stats')} />
          <QuickAction icon={Trophy} label={td('Classement', 'Leaderboard')} color="#ef4444" delay={0.38} onClick={() => navigate('leaderboard')} />
        </motion.div>

        {/* ── Recommended Drills ───────────────────────────────────────── */}
        {(recsLoading || enrichedRecs.length > 0) && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.38 }}
            className="mb-7"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-1 h-6 rounded-full" style={{ background: 'linear-gradient(180deg, #f97316, #f59e0b)' }} />
                <h2 className="text-base font-black text-foreground">{td('Exercices recommandés', 'Recommended drills')}</h2>
              </div>
              <motion.button
                whileHover={{ x: 3 }}
                onClick={() => navigate('train-hub')}
                className="flex items-center gap-1 text-xs font-bold text-orange-500"
              >
                {td('Voir tout', 'See all')} <ChevronRight className="h-3.5 w-3.5" />
              </motion.button>
            </div>
            {recsLoading ? (
              <div className="flex gap-3 overflow-hidden">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-44 w-52 flex-shrink-0 rounded-2xl" />)}
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4">
                {enrichedRecs.slice(0, 6).map((drill, i) => (
                  <DrillCard key={drill.id} drill={drill} index={i} onClick={() => handleSelectDrill(drill.id)} />
                ))}
              </div>
            )}
          </motion.section>
        )}

        {/* ── Recent Sessions ──────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.44 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-1 h-6 rounded-full" style={{ background: 'linear-gradient(180deg, #f97316, #f59e0b)' }} />
              <h2 className="text-base font-black text-foreground">{td('Sessions récentes', 'Recent sessions')}</h2>
            </div>
          </div>

          {sessionsLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
            </div>
          ) : recentSessions.length > 0 ? (
            <div className="space-y-2">
              {recentSessions.map((session, i) => (
                <SessionRow key={session.id} session={session} index={i} />
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-4 py-12 rounded-2xl"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px dashed rgba(249,115,22,0.15)',
              }}
            >
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="text-5xl"
              >
                🏀
              </motion.div>
              <div className="text-center">
                <p className="text-sm font-bold text-foreground">
                  {td('Aucune session pour l\'instant.', 'No sessions yet.')}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {td('Lance ton premier entraînement !', 'Start your first workout!')}
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => navigate('train-hub')}
                className="px-6 py-2.5 rounded-xl text-sm font-black text-white relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)', boxShadow: '0 4px 20px rgba(249,115,22,0.4)' }}
              >
                {td('Commencer', 'Get started')}
              </motion.button>
            </motion.div>
          )}
        </motion.section>
      </PullToRefresh>

      <BottomNav />
    </div>
  );
}