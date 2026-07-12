'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/components/providers/supabase-auth-provider';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Camera,
  ChevronRight,
  Shield,
  Sparkles,
  Trophy,
  Zap,
  Flame,
  Target,
  TrendingUp,
  Play,
  Star,
  Activity,
  RefreshCw,
} from 'lucide-react';
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

// ── Animated background orbs ──────────────────────────────────────────────
function CourtOrbs() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      <motion.div
        animate={{ x: [0, 30, 0], y: [0, -20, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-32 -right-32 w-96 h-96 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.15) 0%, transparent 70%)' }}
      />
      <motion.div
        animate={{ x: [0, -20, 0], y: [0, 30, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
        className="absolute -bottom-40 -left-20 w-80 h-80 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(234,88,12,0.12) 0%, transparent 70%)' }}
      />
      <motion.div
        animate={{ x: [0, 15, 0], y: [0, -15, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 6 }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(251,146,60,0.06) 0%, transparent 70%)' }}
      />
    </div>
  );
}

// ── XP Gain Popup ─────────────────────────────────────────────────────────
function XpGainPopup({ xpGained, leveledUp, onDone }: { xpGained: number; leveledUp: boolean; onDone: () => void }) {
  const { td } = useTranslation();
  useEffect(() => { const t = setTimeout(onDone, 2800); return () => clearTimeout(t); }, [onDone]);
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -40, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="fixed inset-x-0 top-16 z-50 flex flex-col items-center pointer-events-none gap-2"
    >
      {leveledUp && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 500 }}
          className="px-6 py-3 rounded-2xl shadow-2xl"
          style={{ background: 'linear-gradient(135deg, #f97316, #ea580c, #f59e0b)', boxShadow: '0 0 40px rgba(249,115,22,0.6)' }}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-white" />
            <span className="text-lg font-black text-white tracking-widest uppercase">
              {td('NIVEAU SUPÉRIEUR !', 'LEVEL UP!')}
            </span>
            <Sparkles className="h-5 w-5 text-white" />
          </div>
        </motion.div>
      )}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl backdrop-blur-xl"
        style={{ background: 'rgba(249,115,22,0.9)', boxShadow: '0 0 30px rgba(249,115,22,0.5)' }}
      >
        <Zap className="h-5 w-5 text-white fill-white" />
        <span className="text-lg font-black text-white">+{xpGained} XP</span>
      </motion.div>
    </motion.div>
  );
}

// ── Stat Tile ─────────────────────────────────────────────────────────────
function StatTile({ icon: Icon, value, label, color, delay = 0 }: {
  icon: React.ElementType; value: string | number; label: string; color: string; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 300, damping: 22 }}
      className="relative overflow-hidden rounded-2xl p-4 flex flex-col gap-2"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', color)}>
        <Icon className="h-4.5 w-4.5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-black tabular-nums text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground font-medium mt-0.5">{label}</p>
      </div>
      <div className="absolute -bottom-4 -right-4 w-16 h-16 rounded-full opacity-10"
        style={{ background: color.includes('orange') ? '#f97316' : color.includes('amber') ? '#f59e0b' : '#ef4444' }} />
    </motion.div>
  );
}

// ── Drill Recommendation Card ─────────────────────────────────────────────
function DrillCard({ drill, index, onClick }: { drill: RecommendationDrill; index: number; onClick: () => void }) {
  const diffColor = drill.difficulty === 'beginner' ? '#22c55e' : drill.difficulty === 'intermediate' ? '#f97316' : '#ef4444';
  return (
    <motion.button
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.05 * index, type: 'spring', stiffness: 280, damping: 22 }}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="relative flex-shrink-0 w-52 rounded-2xl p-4 text-left overflow-hidden group"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.08), transparent)' }}
      />
      <div className="text-3xl mb-3">{drill.icon}</div>
      <div className="flex items-center gap-1.5 mb-1">
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: diffColor }} />
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: diffColor }}>
          {drill.difficulty}
        </span>
      </div>
      <p className="text-sm font-bold text-foreground leading-tight line-clamp-2">{drill.nameFr}</p>
      {drill.bestScore != null && (
        <div className="mt-2 flex items-center gap-1">
          <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
          <span className="text-xs text-muted-foreground">{Math.round(drill.bestScore)}%</span>
        </div>
      )}
      <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <Play className="h-4 w-4 text-orange-400 fill-orange-400" />
      </div>
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

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.06 * index, type: 'spring', stiffness: 280, damping: 24 }}
      className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 group"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-2 h-8 rounded-full flex-shrink-0" style={{ background: scoreColor, boxShadow: `0 0 8px ${scoreColor}60` }} />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{formattedDate}</p>
          <p className="text-xs text-muted-foreground">
            {session.totalDrills} exercice{session.totalDrills > 1 ? 's' : ''} · {session.totalReps} reps
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <span className="text-lg font-black tabular-nums" style={{ color: scoreColor }}>{score}</span>
        <span className="text-xs text-muted-foreground">pts</span>
      </div>
    </motion.div>
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
      <CourtOrbs />

      <AnimatePresence>
        {xpPopup && <XpGainPopup xpGained={xpPopup.xpGained} leveledUp={xpPopup.leveledUp} onDone={dismissXpPopup} />}
      </AnimatePresence>

      <PullToRefresh
        queryKeys={[['stats'], ['sessions'], ['recommendations'], ['player-xp']]}
        className="relative z-10 mx-auto max-w-lg md:max-w-2xl lg:max-w-4xl px-4 pb-28 pt-6"
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mb-6 flex items-center justify-between"
        >
          <div className="flex-1 min-w-0">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-500 mb-1"
            >
              CourtVision AI
            </motion.p>
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              {td('Bonjour', 'Hey')}, {userName} 👋
            </h1>
            {playerXpLoading ? (
              <Skeleton className="h-5 w-40 mt-2 rounded-full" />
            ) : levelInfo ? (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-2 flex items-center gap-2"
              >
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.25)' }}>
                  <Shield className="h-3 w-3 text-orange-500" />
                  <span className="text-xs font-bold text-orange-500">Niv. {levelInfo.currentLevel}</span>
                </div>
                {!levelInfo.isMaxLevel && (
                  <div className="flex items-center gap-1.5 flex-1 max-w-[140px]">
                    <div className="h-1.5 flex-1 rounded-full overflow-hidden" style={{ background: 'rgba(249,115,22,0.15)' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${levelInfo.progress * 100}%` }}
                        transition={{ delay: 0.4, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                        className="h-full rounded-full"
                        style={{ background: 'linear-gradient(90deg, #f97316, #f59e0b)' }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {levelInfo.xpInCurrentLevel}/{levelInfo.xpNeededForNextLevel}
                    </span>
                  </div>
                )}
              </motion.div>
            ) : null}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <ThemeToggle />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('profile')}
              className="w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-black text-white shadow-lg"
              style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)', boxShadow: '0 4px 20px rgba(249,115,22,0.4)' }}
              aria-label={t('home.viewProfile')}
            >
              {userInitial}
            </motion.button>
          </div>
        </motion.header>

        {/* ── Hero CTA Banner ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative mb-5 overflow-hidden rounded-3xl p-6"
          style={{
            background: 'linear-gradient(135deg, #1a0a00 0%, #2d1200 40%, #1a0a00 100%)',
            border: '1px solid rgba(249,115,22,0.3)',
            boxShadow: '0 0 60px rgba(249,115,22,0.15), inset 0 1px 0 rgba(255,255,255,0.05)',
          }}
        >
          {/* Court lines */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.07]" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <circle cx="200" cy="100" r="60" fill="none" stroke="#f97316" strokeWidth="2" />
            <line x1="200" y1="0" x2="200" y2="200" stroke="#f97316" strokeWidth="1.5" />
            <rect x="0" y="0" width="400" height="200" fill="none" stroke="#f97316" strokeWidth="2" />
            <rect x="0" y="50" width="80" height="100" fill="none" stroke="#f97316" strokeWidth="1.5" />
            <rect x="320" y="50" width="80" height="100" fill="none" stroke="#f97316" strokeWidth="1.5" />
            <circle cx="40" cy="100" r="20" fill="none" stroke="#f97316" strokeWidth="1.5" />
            <circle cx="360" cy="100" r="20" fill="none" stroke="#f97316" strokeWidth="1.5" />
          </svg>

          {/* Glow orb */}
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-30"
            style={{ background: 'radial-gradient(circle, #f97316, transparent)' }} />

          <div className="relative z-10 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-400 mb-2">
                {td('Prêt à dominer ?', 'Ready to dominate?')}
              </p>
              <h2 className="text-2xl font-black text-white leading-tight mb-1">
                {td('Lance ton', 'Start your')}<br />
                <span style={{ background: 'linear-gradient(90deg, #f97316, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  {td('entraînement', 'training')}
                </span>
              </h2>
              <p className="text-xs text-orange-200/60">
                {weekSessions.length} {td('session(s) cette semaine', 'session(s) this week')}
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('train-hub')}
              className="flex-shrink-0 flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm text-white"
              style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)', boxShadow: '0 4px 24px rgba(249,115,22,0.5)' }}
            >
              <Play className="h-4 w-4 fill-white" />
              {td('Démarrer', 'Start')}
            </motion.button>
          </div>
        </motion.div>

        {/* ── Stats Bento Grid ─────────────────────────────────────────── */}
        {statsLoading ? (
          <div className="grid grid-cols-2 gap-3 mb-5">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
        ) : stats ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-2 gap-3 mb-5"
          >
            <StatTile icon={Flame} value={stats.currentStreak} label={td('Jours consécutifs', 'Day streak')} color="bg-orange-500" delay={0.05} />
            <StatTile icon={Activity} value={stats.weekSessions} label={td('Sessions semaine', 'Week sessions')} color="bg-amber-500" delay={0.1} />
            <StatTile icon={Target} value={`${Math.round(stats.avgScore)}%`} label={td('Score moyen', 'Avg score')} color="bg-red-500" delay={0.15} />
            <StatTile icon={Trophy} value={stats.achievementCount} label={td('Succès débloqués', 'Achievements')} color="bg-orange-600" delay={0.2} />
          </motion.div>
        ) : null}

        {/* ── Quick Actions ─────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="grid grid-cols-3 gap-3 mb-6"
        >
          {[
            { icon: Camera, label: td('Caméra IA', 'AI Camera'), screen: 'camera-workout' as const, color: '#f97316' },
            { icon: TrendingUp, label: td('Stats', 'Stats'), screen: 'stats' as const, color: '#f59e0b' },
            { icon: Trophy, label: td('Classement', 'Leaderboard'), screen: 'leaderboard' as const, color: '#ef4444' },
          ].map((item, i) => (
            <motion.button
              key={item.screen}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.05, type: 'spring', stiffness: 300 }}
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => navigate(item.screen)}
              className="flex flex-col items-center gap-2 py-4 rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `${item.color}20`, border: `1px solid ${item.color}30` }}>
                <item.icon className="h-5 w-5" style={{ color: item.color }} />
              </div>
              <span className="text-xs font-semibold text-foreground">{item.label}</span>
            </motion.button>
          ))}
        </motion.div>

        {/* ── Recommended Drills ───────────────────────────────────────── */}
        {(recsLoading || (enrichedRecs.length > 0)) && (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mb-6"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(180deg, #f97316, #f59e0b)' }} />
                <h2 className="text-base font-black text-foreground">{td('Exercices recommandés', 'Recommended drills')}</h2>
              </div>
              <button onClick={() => navigate('train-hub')} className="flex items-center gap-1 text-xs font-semibold text-orange-500">
                {td('Voir tout', 'See all')} <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
            {recsLoading ? (
              <div className="flex gap-3 overflow-hidden">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 w-52 flex-shrink-0 rounded-2xl" />)}
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
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(180deg, #f97316, #f59e0b)' }} />
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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-3 py-10 rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)' }}
            >
              <div className="text-4xl">🏀</div>
              <p className="text-sm text-muted-foreground text-center">
                {td('Aucune session pour l\'instant.', 'No sessions yet.')}<br />
                <span className="text-orange-500 font-semibold">{td('Lance ton premier entraînement !', 'Start your first workout!')}</span>
              </p>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate('train-hub')}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}
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