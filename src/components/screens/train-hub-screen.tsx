'use client';
import { useState, useMemo, useCallback } from 'react';
import { useAppStore } from '@/stores/app';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { BottomNav } from '@/components/shared/bottom-nav';
import { apiFetch, getDrillName } from '@/lib/utils';
import { CATEGORIES_LIST, DIFFICULTIES, getCategoryLabel } from '@/lib/constants';
import { Search, Heart, Clock, Target, Filter, Plus, RefreshCw, Loader2, X, Zap,  } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '@/components/providers/language-provider';

interface Drill {
  id: string; name: string; nameFr: string; category: string; difficulty: string;
  description: string; descriptionFr: string; instructions: string; instructionsFr: string;
  durationSec: number; targetReps: number; icon: string;
}

const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
};

const difficultyConfig: Record<string, { color: string; glow: string; label: string }> = {
  beginner: { color: '#22c55e', glow: 'rgba(34,197,94,0.3)', label: 'Débutant' },
  intermediate: { color: '#f97316', glow: 'rgba(249,115,22,0.3)', label: 'Intermédiaire' },
  advanced: { color: '#ef4444', glow: 'rgba(239,68,68,0.3)', label: 'Avancé' },
};

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

// ── Drill Card ─────────────────────────────────────────────────────────────
function DrillCard({
  drill, isFav, onCardClick, onToggleFav, language, td, tc,
}: {
  drill: Drill; isFav: boolean;
  onCardClick: () => void; onToggleFav: (e: React.MouseEvent) => void;
  language: string; td: (fr: string, en?: string) => string; tc: (key: string) => string;
}) {
  const diff = difficultyConfig[drill.difficulty] ?? difficultyConfig.beginner;

  return (
    <motion.div
      variants={cardVariants}
      layout
      exit="exit"
      whileHover={{ y: -3, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      className="relative rounded-2xl overflow-hidden cursor-pointer group"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
      }}
      onClick={onCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onCardClick(); } }}
      aria-label={getDrillName(drill, language)}
    >
      {/* Hover glow */}
      <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ background: `linear-gradient(135deg, ${diff.color}08, transparent)` }}
      />

      {/* Difficulty accent line */}
      <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
        style={{ background: diff.color, boxShadow: `0 0 8px ${diff.glow}` }} />

      {/* Favorite button */}
      <button
        onClick={onToggleFav}
        className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-xl transition-all"
        style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)' }}
        aria-label={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      >
        <Heart className={`h-3.5 w-3.5 transition-colors ${isFav ? 'fill-orange-500 text-orange-500' : 'text-white/50'}`} />
      </button>

      <div className="p-4 pb-5">
        {/* Icon */}
        <motion.div
          whileHover={{ scale: 1.1, rotate: -5 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-3"
          style={{ background: `${diff.color}15`, border: `1px solid ${diff.color}25` }}
        >
          {drill.icon}
        </motion.div>

        <h3 className="font-bold text-sm text-foreground leading-snug pr-8 line-clamp-2 mb-2">
          {getDrillName(drill, language)}
        </h3>

        <div className="flex items-center gap-1.5 mb-3 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
            style={{ color: diff.color, background: `${diff.color}15`, border: `1px solid ${diff.color}25` }}>
            {diff.label}
          </span>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full text-muted-foreground"
            style={{ background: 'rgba(255,255,255,0.05)' }}>
            {tc(drill.category)}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />{drill.durationSec}s
          </span>
          <span className="flex items-center gap-1">
            <Target className="h-3 w-3" />{drill.targetReps} reps
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function TrainHubScreen() {
  const navigate = useAppStore(s => s.navigate);
  const selectDrill = useAppStore(s => s.selectDrill);
  const { t, tc, td, language } = useTranslation();
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    nameFr: '', category: '', difficulty: '', descriptionFr: '',
    instructionsFr: '', durationSec: 30, targetReps: 10, icon: '🏀',
  });
  const [createError, setCreateError] = useState('');
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [allDrills, setAllDrills] = useState<Drill[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery<{
    drills: Drill[]; favoriteIds: string[]; nextCursor: string | null; total?: number;
  }>({
    queryKey: ['drills'],
    queryFn: () => apiFetch('/api/drills?limit=20'),
  });

  useMemo(() => {
    if (data) { setAllDrills(data.drills); setNextCursor(data.nextCursor); }
  }, [data]);

  const drills = allDrills;
  const favoriteIds = useMemo(() => data?.favoriteIds ?? [] as string[], [data]);

  const drillCountsByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const d of drills) counts[d.category] = (counts[d.category] ?? 0) + 1;
    return counts;
  }, [drills]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const res = await apiFetch<{ drills: Drill[]; nextCursor: string | null }>(
        `/api/drills?limit=20&cursor=${encodeURIComponent(nextCursor)}`
      );
      setAllDrills(prev => [...prev, ...res.drills]);
      setNextCursor(res.nextCursor);
    } catch {} finally { setIsLoadingMore(false); }
  }, [nextCursor, isLoadingMore]);

  const favoriteMutation = useMutation({
    mutationFn: async (drillId: string) =>
      apiFetch<{ favorited: boolean }>('/api/drills/favorite', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drillId }),
      }),
    onMutate: async (drillId) => {
      await queryClient.cancelQueries({ queryKey: ['drills'] });
      const previous = queryClient.getQueryData<{ drills: Drill[]; favoriteIds: string[] }>(['drills']);
      const isFav = favoriteIds.includes(drillId);
      queryClient.setQueryData(['drills'], {
        ...previous,
        favoriteIds: isFav ? favoriteIds.filter(id => id !== drillId) : [...favoriteIds, drillId],
      });
      return { previous };
    },
    onError: (_err, _drillId, context) => {
      if (context?.previous) queryClient.setQueryData(['drills'], context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['drills'] }),
  });

  const createMutation = useMutation({
    mutationFn: async () => apiFetch('/api/drills/create', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createForm),
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['drills'] }); setCreateOpen(false); resetCreateForm(); },
    onError: (err) => setCreateError(err.message),
  });

  const resetCreateForm = useCallback(() => {
    setCreateForm({ nameFr: '', category: '', difficulty: '', descriptionFr: '', instructionsFr: '', durationSec: 30, targetReps: 10, icon: '🏀' });
    setCreateError('');
  }, []);

  const handleCreateOpenChange = useCallback((open: boolean) => {
    setCreateOpen(open);
    if (!open) resetCreateForm();
  }, [resetCreateForm]);

  const DIFFICULTY_LABELS: Record<string, string> = {
    beginner: td('Débutant', 'Beginner'),
    intermediate: td('Intermédiaire', 'Intermediate'),
    advanced: td('Avancé', 'Advanced'),
  };

  const filteredDrills = useMemo(() => {
    let result = drills;
    if (activeCategory !== 'all') result = result.filter(d => d.category === activeCategory);
    if (selectedDifficulty) result = result.filter(d => d.difficulty === selectedDifficulty);
    if (showFavoritesOnly) result = result.filter(d => favoriteIds.includes(d.id));
    if (search.trim()) {
      const q = normalize(search.trim());
      const words = q.split(/\s+/);
      result = result.filter(d => {
        const searchable = [d.nameFr, d.name, getCategoryLabel(d.category), d.category, d.descriptionFr, d.description, DIFFICULTY_LABELS[d.difficulty] ?? d.difficulty].map(normalize).join(' ');
        return words.every(w => searchable.includes(w));
      });
    }
    return result;
  }, [drills, activeCategory, selectedDifficulty, search, showFavoritesOnly, favoriteIds]);

  const handleCardClick = (drill: Drill) => { selectDrill(drill.id); navigate('drill-detail'); };
  const handleToggleFavorite = (e: React.MouseEvent, drillId: string) => { e.stopPropagation(); favoriteMutation.mutate(drillId); };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (activeCategory !== 'all') count++;
    if (selectedDifficulty) count++;
    if (showFavoritesOnly) count++;
    return count;
  }, [activeCategory, selectedDifficulty, showFavoritesOnly]);

  const clearAllFilters = useCallback(() => {
    setSearch(''); setActiveCategory('all'); setSelectedDifficulty(''); setShowFavoritesOnly(false);
  }, []);

  const isCreateFormValid = createForm.nameFr.trim() !== '' && createForm.category !== '' && createForm.difficulty !== '';

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 px-4 min-h-screen">
        <p className="text-sm text-muted-foreground">{t('error.loadFailed')}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />{t('action.retry')}
        </Button>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col bg-background">
      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #f97316, transparent)' }} />
        <div className="absolute bottom-20 -right-20 w-60 h-60 rounded-full opacity-8"
          style={{ background: 'radial-gradient(circle, #ea580c, transparent)' }} />
      </div>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 backdrop-blur-xl" style={{ background: 'rgba(var(--background-rgb, 13,10,0),0.85)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-4xl lg:max-w-6xl mx-auto px-4 pt-5 pb-3">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-500 mb-0.5">
                {td('Centre d\'Entraînement', 'Training Center')}
              </p>
              <h1 className="text-2xl font-black tracking-tight text-foreground">
                {td('Maîtrise chaque', 'Master every')}{' '}
                <span style={{ background: 'linear-gradient(90deg, #f97316, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  {td('exercice', 'drill')}
                </span>
              </h1>
            </div>

            <Dialog open={createOpen} onOpenChange={handleCreateOpenChange}>
              <DialogTrigger asChild>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)', boxShadow: '0 4px 16px rgba(249,115,22,0.4)' }}
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('train.createExercise')}</span>
                </motion.button>
              </DialogTrigger>

              <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <span className="text-xl">✨</span>{t('train.createExercise')}
                  </DialogTitle>
                  <DialogDescription>{t('train.createDesc')}</DialogDescription>
                </DialogHeader>
                <Separator className="my-1" />
                {createError && (
                  <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{createError}</p>
                )}
                <div className="grid gap-4 py-2">
                  <div className="grid gap-2">
                    <Label htmlFor="drill-name">{t('train.drillName')}</Label>
                    <Input id="drill-name" placeholder={t('train.drillNamePlaceholder')} value={createForm.nameFr}
                      onChange={e => setCreateForm(f => ({ ...f, nameFr: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label>{t('train.category')}</Label>
                      <Select value={createForm.category} onValueChange={v => setCreateForm(f => ({ ...f, category: v }))}>
                        <SelectTrigger><SelectValue placeholder={t('train.choose')} /></SelectTrigger>
                        <SelectContent>
                          {CATEGORIES_LIST.filter(c => c.key !== 'all').map(cat => (
                            <SelectItem key={cat.key} value={cat.key}>
                              <span className="flex items-center gap-2"><span>{cat.icon}</span>{cat.label}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>{t('train.difficulty')}</Label>
                      <Select value={createForm.difficulty} onValueChange={v => setCreateForm(f => ({ ...f, difficulty: v }))}>
                        <SelectTrigger><SelectValue placeholder={t('train.choose')} /></SelectTrigger>
                        <SelectContent>
                          {DIFFICULTIES.map(d => (
                            <SelectItem key={d.key} value={d.key}>
                              <span className="flex items-center gap-2">
                                <span className={`h-2 w-2 rounded-full ${d.color}`} />{d.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="drill-desc">{t('train.description')}</Label>
                    <Input id="drill-desc" placeholder={t('train.descriptionPlaceholder')} value={createForm.descriptionFr}
                      onChange={e => setCreateForm(f => ({ ...f, descriptionFr: e.target.value }))} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="drill-instructions">{t('train.instructions')}</Label>
                    <Textarea id="drill-instructions" placeholder={t('train.instructionsPlaceholder')} value={createForm.instructionsFr}
                      onChange={e => setCreateForm(f => ({ ...f, instructionsFr: e.target.value }))} rows={4} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor="drill-duration">{td('Durée (sec)', 'Duration (sec)')}</Label>
                      <Input id="drill-duration" type="number" min={10} max={300} value={createForm.durationSec}
                        onChange={e => setCreateForm(f => ({ ...f, durationSec: Number(e.target.value) || 30 }))} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="drill-reps">{t('train.targetReps')}</Label>
                      <Input id="drill-reps" type="number" min={1} max={100} value={createForm.targetReps}
                        onChange={e => setCreateForm(f => ({ ...f, targetReps: Number(e.target.value) || 10 }))} />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="drill-icon">{t('train.icon')}</Label>
                    <Input id="drill-icon" placeholder="🏀" value={createForm.icon}
                      onChange={e => setCreateForm(f => ({ ...f, icon: e.target.value }))}
                      className="w-20 text-center text-2xl" maxLength={4} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateOpen(false)} className="rounded-full">{t('action.cancel')}</Button>
                  <Button onClick={() => createMutation.mutate()} disabled={!isCreateFormValid || createMutation.isPending}
                    className="rounded-full bg-orange-500 hover:bg-orange-600 text-white gap-2">
                    {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    {td("Créer l'exercice", 'Create drill')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Search + Filters */}
          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('train.searchPlaceholder')}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-10 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowFavoritesOnly(v => !v)}
              className="w-10 h-10 flex items-center justify-center rounded-xl transition-all"
              style={{
                background: showFavoritesOnly ? 'linear-gradient(135deg, #f97316, #ea580c)' : 'rgba(255,255,255,0.05)',
                border: showFavoritesOnly ? 'none' : '1px solid rgba(255,255,255,0.08)',
                boxShadow: showFavoritesOnly ? '0 4px 16px rgba(249,115,22,0.4)' : 'none',
              }}
              aria-label={t('train.filterFavorites')}
            >
              <Heart className={`h-4 w-4 ${showFavoritesOnly ? 'fill-white text-white' : 'text-muted-foreground'}`} />
            </motion.button>
            {activeFilterCount > 0 && (
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileTap={{ scale: 0.9 }}
                onClick={clearAllFilters}
                className="w-10 h-10 flex items-center justify-center rounded-xl text-muted-foreground"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <X className="h-4 w-4" />
              </motion.button>
            )}
          </div>

          {/* Difficulty pills */}
          <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 mb-2">
            <button
              onClick={() => setSelectedDifficulty('')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all"
              style={{
                background: !selectedDifficulty ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.04)',
                border: !selectedDifficulty ? '1px solid rgba(249,115,22,0.4)' : '1px solid rgba(255,255,255,0.07)',
                color: !selectedDifficulty ? '#f97316' : undefined,
              }}
            >
              <Filter className="h-3 w-3" />{tc('all')}
            </button>
            {DIFFICULTIES.map(diff => {
              const cfg = difficultyConfig[diff.key];
              const isActive = selectedDifficulty === diff.key;
              return (
                <button
                  key={diff.key}
                  onClick={() => setSelectedDifficulty(prev => prev === diff.key ? '' : diff.key)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all"
                  style={{
                    background: isActive ? `${cfg?.color}20` : 'rgba(255,255,255,0.04)',
                    border: isActive ? `1px solid ${cfg?.color}50` : '1px solid rgba(255,255,255,0.07)',
                    color: isActive ? cfg?.color : undefined,
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg?.color }} />
                  {td(diff.key)}
                </button>
              );
            })}
          </div>

          {/* Category pills */}
          <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
            {CATEGORIES_LIST.map(cat => {
              const isActive = activeCategory === cat.key;
              let count = cat.key === 'all' ? drills.length : drillCountsByCategory[cat.key] ?? 0;
              return (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(cat.key)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all"
                  style={{
                    background: isActive ? 'linear-gradient(135deg, #f97316, #ea580c)' : 'rgba(255,255,255,0.04)',
                    border: isActive ? 'none' : '1px solid rgba(255,255,255,0.07)',
                    color: isActive ? 'white' : undefined,
                    boxShadow: isActive ? '0 4px 12px rgba(249,115,22,0.35)' : 'none',
                  }}
                >
                  <span className="text-sm leading-none">{cat.icon}</span>
                  <span>{tc(cat.key)}</span>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ background: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)' }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <main className="relative z-10 flex-1 max-w-4xl lg:max-w-6xl w-full mx-auto px-4 py-4 pb-28">
        <p className="text-xs text-muted-foreground mb-4 font-medium">
          {td(`${filteredDrills.length} exercice${filteredDrills.length !== 1 ? 's' : ''} trouvé${filteredDrills.length !== 1 ? 's' : ''}`,
            `${filteredDrills.length} drill${filteredDrills.length !== 1 ? 's' : ''} found`)}
        </p>

        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-44 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
            ))}
          </div>
        )}

        {!isLoading && filteredDrills.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-lg font-bold text-foreground">{td('Aucun exercice trouvé', 'No drills found')}</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
              {td('Essayez de modifier vos filtres', 'Try adjusting your filters')}
            </p>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={clearAllFilters}
              className="mt-4 px-5 py-2 rounded-xl text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}
            >
              {t('train.resetFilters')}
            </motion.button>
          </motion.div>
        )}

        {!isLoading && filteredDrills.length > 0 && (
          <motion.div
            key={`${activeCategory}-${selectedDifficulty}-${search}`}
            initial="hidden"
            animate="visible"
            variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.04 } } }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            <AnimatePresence mode="popLayout">
              {filteredDrills.map(drill => (
                <DrillCard
                  key={drill.id}
                  drill={drill}
                  isFav={favoriteIds.includes(drill.id)}
                  onCardClick={() => handleCardClick(drill)}
                  onToggleFav={(e) => handleToggleFavorite(e, drill.id)}
                  language={language}
                  td={td}
                  tc={tc}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {!isLoading && filteredDrills.length > 0 && nextCursor && (
          <div className="flex justify-center pt-8">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={loadMore}
              disabled={isLoadingMore}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              {isLoadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4 text-orange-500" />}
              {t('action.loadMore')}
            </motion.button>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}