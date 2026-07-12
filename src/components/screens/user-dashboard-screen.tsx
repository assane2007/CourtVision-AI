'use client';
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { BarChart3, Trophy, History, Settings, Flame, Dumbbell, Clock, Star, Lock, ChevronRight, RefreshCw, Filter, Calendar, Activity, Target, Sun, Moon, Monitor, Bell, Volume2, Eye, Globe, Loader2, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

import { useAppStore } from '@/stores/app';
import { BottomNav } from '@/components/shared/bottom-nav';
import { AnimatedNumber } from '@/components/shared/animated-number';
import { apiFetch, cn, formatLocaleDate } from '@/lib/utils';
import { containerVariants, itemVariants } from '@/lib/animations';
import { useTranslation } from '@/components/providers/language-provider';
import { useAuth } from '@/components/providers/supabase-auth-provider';
import { getLevelInfo } from '@/lib/xp';

// ── Types ────────────────────────────────────────────────────────────────────

interface StatsData {
  totalSessions: number;
  totalReps: number;
  avgScore: number;
  weekSessions: number;
  currentStreak: number;
  bestStreak: number;
  achievementCount: number;
  weeklyTrainingHours: number;
  drillsCompleted: number;
}

interface Achievement {
  type: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt: string | null;
  progress: number;
}

interface SessionEntry {
  id: string;
  startedAt: string;
  totalScore: number;
  totalReps: number;
  totalDrills: number;
  drills?: Array<{ drill: { name?: string; nameFr: string } }>;
}

interface UserSettings {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  language: 'fr' | 'en';
  notifStreak: boolean;
  notifChallenge: boolean;
  notifAchievement: boolean;
  notifPush: boolean;
  profilePublic: boolean;
  showOnLeaderboard: boolean;
  showActivity: boolean;
  weeklyGoalSessions: number;
  [key: string]: unknown;
}

const DEFAULT_SETTINGS: UserSettings = {
  soundEnabled: true,
  hapticsEnabled: true,
  language: 'fr',
  notifStreak: true,
  notifChallenge: true,
  notifAchievement: true,
  notifPush: false,
  profilePublic: true,
  showOnLeaderboard: true,
  showActivity: true,
  weeklyGoalSessions: 3,
};

// ── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  unit,
  accent = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  unit?: string;
  accent?: boolean;
}) {
  return (
    <motion.div variants={itemVariants}>
      <Card
        className={cn(
          'relative overflow-hidden border',
          accent
            ? 'border-orange-500/30 bg-orange-500/5' :'border-border bg-card'
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg',
                accent ? 'bg-orange-500/20' : 'bg-muted'
              )}
            >
              <Icon
                className={cn(
                  'h-4 w-4',
                  accent ? 'text-orange-500' : 'text-muted-foreground'
                )}
              />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold tabular-nums">
              {typeof value === 'number' ? (
                <AnimatedNumber value={value} />
              ) : (
                value
              )}
            </span>
            {unit && (
              <span className="text-xs text-muted-foreground">{unit}</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 leading-tight">
            {label}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Stats Tab ────────────────────────────────────────────────────────────────

function StatsTab({ userId }: { userId: string }) {
  const { t, td } = useTranslation();

  const { data: stats, isLoading, isError, refetch } = useQuery<StatsData>({
    queryKey: ['dashboard-stats', userId],
    queryFn: () => apiFetch('/api/stats'),
    enabled: !!userId,
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <p className="text-sm text-muted-foreground">{t('error.loadFailed')}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          {t('action.retry')}
        </Button>
      </div>
    );
  }

  const levelInfo = getLevelInfo(0); // placeholder for XP display

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4"
    >
      {/* Primary stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={Dumbbell}
          label={td('Séances totales', 'Total sessions')}
          value={stats?.totalSessions ?? 0}
          accent
        />
        <StatCard
          icon={Flame}
          label={td('Série actuelle', 'Current streak')}
          value={stats?.currentStreak ?? 0}
          unit={td('jours', 'days')}
          accent
        />
        <StatCard
          icon={Activity}
          label={td('Répétitions totales', 'Total reps')}
          value={stats?.totalReps ?? 0}
        />
        <StatCard
          icon={Star}
          label={td('Score moyen', 'Avg score')}
          value={stats?.avgScore ?? 0}
          unit="pts"
        />
        <StatCard
          icon={Clock}
          label={td('Heures cette semaine', 'Hours this week')}
          value={stats?.weeklyTrainingHours ?? 0}
          unit="h"
        />
        <StatCard
          icon={Target}
          label={td('Exercices maîtrisés', 'Drills mastered')}
          value={stats?.drillsCompleted ?? 0}
        />
      </div>

      {/* Streak comparison */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" />
            {td('Séries', 'Streaks')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {td('Série actuelle', 'Current streak')}
            </span>
            <span className="font-bold text-orange-500">
              {stats?.currentStreak ?? 0} {td('jours', 'days')}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {td('Meilleure série', 'Best streak')}
            </span>
            <span className="font-bold">{stats?.bestStreak ?? 0} {td('jours', 'days')}</span>
          </div>
          {(stats?.bestStreak ?? 0) > 0 && (
            <Progress
              value={((stats?.currentStreak ?? 0) / (stats?.bestStreak ?? 1)) * 100}
              className="h-1.5"
            />
          )}
        </CardContent>
      </Card>

      {/* Weekly overview */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Calendar className="h-4 w-4 text-orange-500" />
            {td('Cette semaine', 'This week')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {td('Séances', 'Sessions')}
            </span>
            <span className="font-bold">{stats?.weekSessions ?? 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {td('Heures d\'entraînement', 'Training hours')}
            </span>
            <span className="font-bold">{stats?.weeklyTrainingHours ?? 0}h</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {td('Succès débloqués', 'Achievements unlocked')}
            </span>
            <span className="font-bold text-orange-500">{stats?.achievementCount ?? 0}</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Achievements Tab ─────────────────────────────────────────────────────────

function AchievementsTab({ userId }: { userId: string }) {
  const { t, td } = useTranslation();
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

  const { data, isLoading, isError, refetch } = useQuery<{
    achievements: Achievement[];
    totalUnlocked: number;
    totalAchievements: number;
  }>({
    queryKey: ['dashboard-achievements', userId],
    queryFn: () => apiFetch('/api/achievements'),
    enabled: !!userId,
    staleTime: 60_000,
  });

  const achievements = data?.achievements ?? [];
  const totalUnlocked = data?.totalUnlocked ?? 0;
  const totalAchievements = data?.totalAchievements ?? 0;
  const progressPct =
    totalAchievements > 0 ? (totalUnlocked / totalAchievements) * 100 : 0;

  const filtered = achievements.filter((a) => {
    if (filter === 'unlocked') return a.unlocked;
    if (filter === 'locked') return !a.unlocked;
    return true;
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <p className="text-sm text-muted-foreground">{t('error.loadFailed')}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          {t('action.retry')}
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4"
    >
      {/* Progress summary */}
      <motion.div variants={itemVariants}>
        <Card className="border-orange-500/20 bg-orange-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-orange-500" />
                <span className="font-semibold text-sm">
                  {td('Progression', 'Progress')}
                </span>
              </div>
              <Badge
                variant="secondary"
                className="bg-orange-500/10 text-orange-500 border-orange-500/20"
              >
                {totalUnlocked}/{totalAchievements}
              </Badge>
            </div>
            <Progress value={progressPct} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1.5">
              {Math.round(progressPct)}% {td('complété', 'completed')}
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Filter buttons */}
      <motion.div variants={itemVariants} className="flex gap-2">
        {(['all', 'unlocked', 'locked'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'flex-1 rounded-lg py-1.5 text-xs font-medium transition-all',
              filter === f
                ? 'bg-orange-500 text-white' :'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            {f === 'all' ? td('Tous', 'All')
              : f === 'unlocked' ? td('Débloqués', 'Unlocked')
              : td('Verrouillés', 'Locked')}
          </button>
        ))}
      </motion.div>

      {/* Achievement list */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {filtered.map((achievement) => (
            <motion.div
              key={achievement.type}
              variants={itemVariants}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Card
                className={cn(
                  'border transition-all',
                  achievement.unlocked
                    ? 'border-orange-500/20 bg-orange-500/5' :'border-border opacity-60'
                )}
              >
                <CardContent className="p-3 flex items-center gap-3">
                  <div
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl',
                      achievement.unlocked ? 'bg-orange-500/15' : 'bg-muted'
                    )}
                  >
                    {achievement.unlocked ? (
                      achievement.icon
                    ) : (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {achievement.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {achievement.description}
                    </p>
                    {achievement.unlocked && achievement.unlockedAt && (
                      <p className="text-xs text-orange-500 mt-0.5">
                        {formatLocaleDate(achievement.unlockedAt, 'fr')}
                      </p>
                    )}
                    {!achievement.unlocked && achievement.progress > 0 && (
                      <Progress
                        value={achievement.progress}
                        className="h-1 mt-1.5"
                      />
                    )}
                  </div>
                  {achievement.unlocked && (
                    <CheckCircle2 className="h-4 w-4 text-orange-500 shrink-0" />
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">
            {td('Aucun résultat', 'No results')}
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ── Training History Tab ─────────────────────────────────────────────────────

type HistoryFilter = 'all' | 'week' | 'month' | '3months';

function HistoryTab({ userId }: { userId: string }) {
  const { td } = useTranslation();
  const [timeFilter, setTimeFilter] = useState<HistoryFilter>('week');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useQuery<{
    sessions: SessionEntry[];
    total?: number;
    hasMore?: boolean;
  }>({
    queryKey: ['dashboard-sessions', userId, page],
    queryFn: () => apiFetch(`/api/sessions?page=${page}&limit=20`),
    enabled: !!userId,
    staleTime: 30_000,
  });

  const sessions = data?.sessions ?? [];
  const hasMore = data?.hasMore ?? false;

  const filterDate = useCallback((): Date => {
    const now = new Date();
    if (timeFilter === 'week') {
      now.setDate(now.getDate() - 7);
    } else if (timeFilter === 'month') {
      now.setMonth(now.getMonth() - 1);
    } else if (timeFilter === '3months') {
      now.setMonth(now.getMonth() - 3);
    } else {
      return new Date(0);
    }
    return now;
  }, [timeFilter]);

  const filteredSessions = sessions.filter(
    (s) => new Date(s.startedAt) >= filterDate()
  );

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-orange-500';
    return 'text-red-400';
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <p className="text-sm text-muted-foreground">{td('Erreur de chargement', 'Load failed')}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          {td('Réessayer', 'Retry')}
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4"
    >
      {/* Filter row */}
      <motion.div variants={itemVariants} className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="flex gap-1.5 flex-wrap">
          {(
            [
              { key: 'week', label: td('7j', '7d') },
              { key: 'month', label: td('30j', '30d') },
              { key: '3months', label: td('3 mois', '3 months') },
              { key: 'all', label: td('Tout', 'All') },
            ] as { key: HistoryFilter; label: string }[]
          ).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTimeFilter(key)}
              className={cn(
                'rounded-lg px-3 py-1 text-xs font-medium transition-all',
                timeFilter === key
                  ? 'bg-orange-500 text-white' :'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Summary row */}
      <motion.div variants={itemVariants} className="flex gap-3">
        <Card className="flex-1 border-border">
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold">{filteredSessions.length}</p>
            <p className="text-xs text-muted-foreground">{td('Séances', 'Sessions')}</p>
          </CardContent>
        </Card>
        <Card className="flex-1 border-border">
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold">
              {filteredSessions.reduce((s, x) => s + x.totalReps, 0)}
            </p>
            <p className="text-xs text-muted-foreground">{td('Reps', 'Reps')}</p>
          </CardContent>
        </Card>
        <Card className="flex-1 border-border">
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold">
              {filteredSessions.length > 0
                ? Math.round(
                    filteredSessions.reduce((s, x) => s + x.totalScore, 0) /
                      filteredSessions.length
                  )
                : 0}
            </p>
            <p className="text-xs text-muted-foreground">{td('Score moy.', 'Avg score')}</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Session list */}
      {filteredSessions.length === 0 ? (
        <motion.div variants={itemVariants} className="text-center py-12">
          <History className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {td('Aucune séance sur cette période', 'No sessions in this period')}
          </p>
        </motion.div>
      ) : (
        <div className="space-y-2">
          {filteredSessions.map((session, idx) => (
            <motion.div
              key={session.id}
              variants={itemVariants}
              custom={idx}
            >
              <Card className="border-border hover:border-orange-500/20 transition-colors">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                    <Dumbbell className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">
                        {session.totalDrills} {td('exercice(s)', 'drill(s)')}
                      </p>
                      <span
                        className={cn(
                          'text-sm font-bold',
                          getScoreColor(session.totalScore)
                        )}
                      >
                        {session.totalScore} pts
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        {formatLocaleDate(session.startedAt, 'fr')}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {session.totalReps} {td('reps', 'reps')}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Load more */}
      {hasMore && (
        <motion.div variants={itemVariants} className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
          >
            {td('Charger plus', 'Load more')}
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}

// ── Settings Tab ─────────────────────────────────────────────────────────────

function SettingsTab({ userId }: { userId: string }) {
  const { td, setLanguage: setI18nLanguage } = useTranslation();
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();

  const { data: settingsData, isLoading } = useQuery<{ settings: UserSettings }>({
    queryKey: ['dashboard-settings', userId],
    queryFn: () => apiFetch('/api/settings'),
    staleTime: 60_000,
  });

  const settings = { ...DEFAULT_SETTINGS, ...settingsData?.settings };

  const saveMutation = useMutation({
    mutationFn: (patch: Partial<UserSettings>) =>
      apiFetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      }),
    onSuccess: () => {
      toast.success(td('Préférences sauvegardées', 'Preferences saved'));
      queryClient.invalidateQueries({ queryKey: ['dashboard-settings', userId] });
    },
    onError: () => toast.error(td('Erreur de sauvegarde', 'Save error')),
  });

  const patch = useCallback(
    (data: Partial<UserSettings>) => saveMutation.mutate(data),
    [saveMutation]
  );

  const SavingSpinner = saveMutation.isPending ? (
    <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-500" />
  ) : null;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4"
    >
      {/* Appearance */}
      <motion.div variants={itemVariants}>
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Sun className="h-4 w-4 text-orange-500" />
              {td('Apparence', 'Appearance')}
              {SavingSpinner}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              {(
                [
                  { value: 'light', icon: Sun, label: td('Clair', 'Light') },
                  { value: 'dark', icon: Moon, label: td('Sombre', 'Dark') },
                  { value: 'system', icon: Monitor, label: td('Système', 'System') },
                ] as const
              ).map(({ value, icon: Icon, label }) => (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  className={cn(
                    'flex-1 flex flex-col items-center gap-1 rounded-xl py-2.5 text-xs font-medium transition-all border',
                    theme === value
                      ? 'border-orange-500 bg-orange-500/10 text-orange-500' :'border-border text-muted-foreground hover:border-orange-500/30'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Language */}
      <motion.div variants={itemVariants}>
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Globe className="h-4 w-4 text-orange-500" />
              {td('Langue', 'Language')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={settings.language}
              onValueChange={(val) => {
                patch({ language: val as 'fr' | 'en' });
                setI18nLanguage(val as 'fr' | 'en');
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fr">🇫🇷 Français</SelectItem>
                <SelectItem value="en">🇬🇧 English</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </motion.div>

      {/* Notifications */}
      <motion.div variants={itemVariants}>
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Bell className="h-4 w-4 text-orange-500" />
              {td('Notifications', 'Notifications')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(
              [
                {
                  key: 'notifStreak',
                  label: td('Rappels de série', 'Streak reminders'),
                },
                {
                  key: 'notifChallenge',
                  label: td('Mises à jour défis', 'Challenge updates'),
                },
                {
                  key: 'notifAchievement',
                  label: td('Succès débloqués', 'Achievement unlocks'),
                },
              ] as { key: keyof UserSettings; label: string }[]
            ).map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <Label className="text-sm cursor-pointer">{label}</Label>
                <Switch
                  checked={!!settings[key]}
                  onCheckedChange={(checked) => patch({ [key]: checked })}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* Training preferences */}
      <motion.div variants={itemVariants}>
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-orange-500" />
              {td('Entraînement', 'Training')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm cursor-pointer">
                {td('Son activé', 'Sound enabled')}
              </Label>
              <Switch
                checked={settings.soundEnabled}
                onCheckedChange={(checked) => patch({ soundEnabled: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm cursor-pointer">
                {td('Vibrations', 'Haptics')}
              </Label>
              <Switch
                checked={settings.hapticsEnabled}
                onCheckedChange={(checked) => patch({ hapticsEnabled: checked })}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Privacy */}
      <motion.div variants={itemVariants}>
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Eye className="h-4 w-4 text-orange-500" />
              {td('Confidentialité', 'Privacy')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm cursor-pointer">
                {td('Profil public', 'Public profile')}
              </Label>
              <Switch
                checked={settings.profilePublic}
                onCheckedChange={(checked) => patch({ profilePublic: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm cursor-pointer">
                {td('Visible classement', 'Show on leaderboard')}
              </Label>
              <Switch
                checked={settings.showOnLeaderboard}
                onCheckedChange={(checked) =>
                  patch({ showOnLeaderboard: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm cursor-pointer">
                {td('Activité visible', 'Show activity')}
              </Label>
              <Switch
                checked={settings.showActivity}
                onCheckedChange={(checked) => patch({ showActivity: checked })}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────────

export function UserDashboardScreen() {
  const navigate = useAppStore((s) => s.navigate);
  const { user } = useAuth();
  const { td } = useTranslation();
  const [activeTab, setActiveTab] = useState('stats');

  const userId = user?.id ?? '';

  const tabs = [
    { id: 'stats', icon: BarChart3, label: td('Stats', 'Stats') },
    { id: 'achievements', icon: Trophy, label: td('Succès', 'Achievements') },
    { id: 'history', icon: History, label: td('Historique', 'History') },
    { id: 'settings', icon: Settings, label: td('Réglages', 'Settings') },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b">
        <div className="max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto px-4 py-3">
          {/* User info row */}
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="h-10 w-10 shrink-0">
              {user?.avatar && (
                <AvatarImage src={user.avatar} alt={user.name ?? ''} />
              )}
              <AvatarFallback className="bg-orange-500/10 text-orange-600 font-bold text-sm">
                {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate">
                {user?.name ?? td('Joueur', 'Player')}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email ?? ''}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 text-xs text-muted-foreground"
              onClick={() => navigate('profile')}
            >
              {td('Profil', 'Profile')}
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 bg-muted/50 rounded-xl p-1">
            {tabs.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  'flex-1 flex flex-col items-center gap-0.5 rounded-lg py-1.5 text-[10px] font-medium transition-all',
                  activeTab === id
                    ? 'bg-background text-orange-500 shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:block">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto px-4 pt-4">
        <AnimatePresence mode="wait">
          {activeTab === 'stats' && (
            <motion.div
              key="stats"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <StatsTab userId={userId} />
            </motion.div>
          )}
          {activeTab === 'achievements' && (
            <motion.div
              key="achievements"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <AchievementsTab userId={userId} />
            </motion.div>
          )}
          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <HistoryTab userId={userId} />
            </motion.div>
          )}
          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <SettingsTab userId={userId} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <BottomNav />
    </div>
  );
}
