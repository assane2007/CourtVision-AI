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
import { Search, Heart, Clock, Target, Filter, Plus, RefreshCw, Loader2, X, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '@/components/providers/language-provider';

interface Drill {
  id: string; name: string; nameFr: string; category: string; difficulty: string;
  description: string; descriptionFr: string; instructions: string; instructionsFr: string;
  durationSec: number; targetReps: number; icon: string;
}

const difficultyConfig: Record<string, { color: string; glow: string; label: string; bg: string }> = {
  beginner:     { color: '#22c55e', glow: 'rgba(34,197,94,0.35)',   label: 'Débutant',      bg: 'rgba(34,197,94,0.08)' },
  intermediate: { color: '#f97316', glow: 'rgba(249,115,22,0.35)',  label: 'Intermédiaire', bg: 'rgba(249,115,22,0.08)' },
  advanced:     { color: '#ef4444', glow: 'rgba(239,68,68,0.35)',   label: 'Avancé',        bg: 'rgba(239,68,68,0.08)' },
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
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      whileHover={{ y: -5, scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className="relative rounded-2xl overflow-hidden cursor-pointer group"
      style={{
        background: hovered
          ? `linear-gradient(145deg, ${diff.bg}, rgba(255,255,255,0.04))`
          : 'rgba(255,255,255,0.03)',
        border: `1px solid ${hovered ? diff.color + '35' : 'rgba(255,255,255,0.07)'}`,
        boxShadow: hovered
          ? `0 12px 40px rgba(0,0,0,0.3), 0 0 0 1px ${diff.color}20`
          : '0 4px 16px rgba(0,0,0,0.2)',
        transition: 'all 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
      }}
      onClick={onCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onCardClick(); } }}
      aria-label={getDrillName(drill, language)}
    >
      {/* Difficulty accent line — animated on hover */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
        animate={{ opacity: hovered ? 1 : 0.6, scaleX: hovered ? 1 : 0.7 }}
        style={{
          background: `linear-gradient(90deg, ${diff.color}, ${diff.color}40)`,
          boxShadow: hovered ? `0 0 12px ${diff.glow}` : 'none',
          transformOrigin: 'left',
          transition: 'all 0.3s ease',
        }}
      />

      {/* Glow blob */}
      <motion.div
        className="absolute -bottom-8 -right-8 w-28 h-28 rounded-full pointer-events-none"
        animate={{ opacity: hovered ? 0.12 : 0.04, scale: hovered ? 1.2 : 1 }}
        style={{ background: diff.color, transition: 'all 0.4s ease' }}
      />

      {/* Favorite button */}
      <motion.button
        whileHover={{ scale: 1.15 }}
        whileTap={{ scale: 0.9 }}
        onClick={onToggleFav}
        className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-xl"
        style={{
          background: isFav ? `${diff.color}20` : 'rgba(0,0,0,0.35)',
          backdropFilter: 'blur(8px)',
          border: isFav ? `1px solid ${diff.color}40` : '1px solid rgba(255,255,255,0.08)',
        }}
        aria-label={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      >
        <Heart className={`h-3.5 w-3.5 transition-all duration-200 ${isFav ? 'fill-orange-500 text-orange-500 scale-110' : 'text-white/40'}`} />
      </motion.button>

      <div className="p-4 pb-5">
        {/* Icon */}
        <motion.div
          animate={{ rotate: hovered ? -8 : 0, scale: hovered ? 1.12 : 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-3"
          style={{
            background: `${diff.color}12`,
            border: `1px solid ${diff.color}20`,
            boxShadow: hovered ? `0 4px 20px ${diff.glow}` : 'none',
          }}
        >
          {drill.icon}
        </motion.div>

        <h3 className="font-black text-sm text-foreground leading-snug pr-8 line-clamp-2 mb-2.5">
          {getDrillName(drill, language)}
        </h3>

        <div className="flex items-center gap-1.5 mb-3 flex-wrap">
          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
            style={{ color: diff.color, background: `${diff.color}15`, border: `1px solid ${diff.color}25` }}>
            {diff.label}
          </span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-muted-foreground"
            style={{ background: 'rgba(255,255,255,0.05)' }}>
            {tc(drill.category)}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Clock className="h-3 w-3" style={{ color: diff.color }} />{drill.durationSec}s
          </span>
          <span className="flex items-center gap-1.5">
            <Target className="h-3 w-3" style={{ color: diff.color }} />{drill.targetReps} reps
          </span>
        </div>
      </div>

      {/* Hover CTA */}
      <motion.div
        animate={{ opacity: hovered ? 1 : 0, y: hovered ? 0 : 4 }}
        transition={{ duration: 0.2 }}
        className="absolute bottom-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black text-white"
        style={{ background: `linear-gradient(135deg, ${diff.color}, ${diff.color}cc)`, boxShadow: `0 4px 12px ${diff.glow}` }}
      >
        <Zap className="h-2.5 w-2.5 fill-white" />
        {td('Go', 'Go')}
      </motion.div>
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
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div
          animate={{ x: [0, 30, 0], y: [0, -20, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-32 -left-32 w-80 h-80 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.1) 0%, transparent 65%)' }}
        />
        <motion.div
          animate={{ x: [0, -20, 0], y: [0, 30, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut', delay: 5 }}
          className="absolute bottom-20 -right-20 w-72 h-72 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(234,88,12,0.08) 0%, transparent 65%)' }}
        />
        {/* Grid lines */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: 'linear-gradient(rgba(249,115,22,1) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />
      </div>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 backdrop-blur-2xl" style={{
        background: 'rgba(9,5,0,0.88)',
        borderBottom: '1px solid rgba(249,115,22,0.1)',
        boxShadow: '0 4px 32px rgba(0,0,0,0.4)',
      }}>
        <div className="max-w-4xl lg:max-w-6xl mx-auto px-4 pt-5 pb-3">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-500 mb-0.5">
                {td('Centre d\'Entraînement', 'Training Center')}
              </p>
              <h1 className="text-2xl font-black tracking-tight text-foreground">
                {td('Maîtrise chaque', 'Master every')}{' '}
                <span style={{
                  background: 'linear-gradient(90deg, #f97316, #f59e0b)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>
                  {td('exercice', 'drill')}
                </span>
              </h1>
            </div>

            <Dialog open={createOpen} onOpenChange={handleCreateOpenChange}>
              <DialogTrigger asChild>
                <motion.button
                  whileHover={{ scale: 1.06, y: -1 }}
                  whileTap={{ scale: 0.94 }}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-black text-white relative overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, #f97316, #ea580c)',
                    boxShadow: '0 4px 20px rgba(249,115,22,0.45)',
                  }}
                >
                  <motion.div
                    className="absolute inset-0"
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear', repeatDelay: 4 }}
                    style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)' }}
                  />
                  <Plus className="h-4 w-4 relative z-10" />
                  <span className="hidden sm:inline relative z-10">{t('train.createExercise')}</span>
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
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => setShowFavoritesOnly(v => !v)}
              className="w-10 h-10 flex items-center justify-center rounded-xl transition-all"
              style={{
                background: showFavoritesOnly ? 'linear-gradient(135deg, #f97316, #ea580c)' : 'rgba(255,255,255,0.05)',
                border: showFavoritesOnly ? 'none' : '1px solid rgba(255,255,255,0.08)',
                boxShadow: showFavoritesOnly ? '0 4px 16px rgba(249,115,22,0.4)' : 'none',
              }}
              aria-label={t('train.filterFavorites')}
            >
              <Heart className={`h-4 w-4 transition-all ${showFavoritesOnly ? 'fill-white text-white scale-110' : 'text-muted-foreground'}`} />
            </motion.button>
            <AnimatePresence>
              {activeFilterCount > 0 && (
                <motion.button
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={clearAllFilters}
                  className="w-10 h-10 flex items-center justify-center rounded-xl text-muted-foreground relative"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <X className="h-4 w-4" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-black text-white flex items-center justify-center"
                    style={{ background: '#f97316' }}>
                    {activeFilterCount}
                  </span>
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Difficulty pills */}
          <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 mb-2">
            <button
              onClick={() => setSelectedDifficulty('')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all"
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
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all"
                  style={{
                    background: isActive ? `${cfg?.color}20` : 'rgba(255,255,255,0.04)',
                    border: isActive ? `1px solid ${cfg?.color}50` : '1px solid rgba(255,255,255,0.07)',
                    color: isActive ? cfg?.color : undefined,
                    boxShadow: isActive ? `0 0 12px ${cfg?.glow}` : 'none',
                  }}
                >
                  <motion.span
                    animate={{ scale: isActive ? [1, 1.4, 1] : 1 }}
                    transition={{ duration: 0.4 }}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: cfg?.color }}
                  />
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
                <motion.button
                  key={cat.key}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setActiveCategory(cat.key)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all"
                  style={{
                    background: isActive ? 'linear-gradient(135deg, #f97316, #ea580c)' : 'rgba(255,255,255,0.04)',
                    border: isActive ? 'none' : '1px solid rgba(255,255,255,0.07)',
                    color: isActive ? 'white' : undefined,
                    boxShadow: isActive ? '0 4px 16px rgba(249,115,22,0.4)' : 'none',
                  }}
                >
                  <span className="text-sm leading-none">{cat.icon}</span>
                  <span>{tc(cat.key)}</span>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black"
                    style={{ background: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)' }}>
                    {count}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </header>

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <main className="relative z-10 flex-1 max-w-4xl lg:max-w-6xl w-full mx-auto px-4 py-4 pb-28">
        <motion.p
          key={filteredDrills.length}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-muted-foreground mb-4 font-semibold"
        >
          {td(
            `${filteredDrills.length} exercice${filteredDrills.length !== 1 ? 's' : ''} trouvé${filteredDrills.length !== 1 ? 's' : ''}`,
            `${filteredDrills.length} drill${filteredDrills.length !== 1 ? 's' : ''} found`
          )}
        </motion.p>

        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="h-48 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.04)', animation: 'pulse 2s infinite' }}
              />
            ))}
          </div>
        )}

        {!isLoading && filteredDrills.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="text-6xl mb-5"
            >
              🔍
            </motion.div>
            <h3 className="text-lg font-black text-foreground">{td('Aucun exercice trouvé', 'No drills found')}</h3>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-xs">
              {td('Essayez de modifier vos filtres', 'Try adjusting your filters')}
            </p>
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.96 }}
              onClick={clearAllFilters}
              className="mt-5 px-6 py-2.5 rounded-xl text-sm font-black text-white"
              style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)', boxShadow: '0 4px 20px rgba(249,115,22,0.4)' }}
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
            variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } }}
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
          <div className="flex justify-center pt-10">
            <motion.button
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.96 }}
              onClick={loadMore}
              disabled={isLoadingMore}
              className="flex items-center gap-2.5 px-7 py-3 rounded-xl text-sm font-black relative overflow-hidden"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
              }}
            >
              {isLoadingMore
                ? <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                : <Zap className="h-4 w-4 text-orange-500 fill-orange-500" />
              }
              {t('action.loadMore')}
            </motion.button>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}