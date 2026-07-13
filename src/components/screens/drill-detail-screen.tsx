'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Camera, Heart, Clock, Target, Zap, ChevronRight, ListOrdered, RefreshCw, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/stores/app';
import { BottomNav } from '@/components/shared/bottom-nav';
import { SwipeToGoBack } from '@/components/shared/swipe-back';
import { apiFetch, getDrillName } from '@/lib/utils';
import { toast } from 'sonner';
import { useTranslation } from '@/components/providers/language-provider';

// ── Exercise video map by category ────────────────────────────────────────
const CATEGORY_VIDEOS: Record<string, { id: string; title: string; channel: string; duration: string }[]> = {
  shooting: [
    { id: 'kFMJFMoFMBM', title: 'Technique de tir parfaite — NBA Level', channel: 'Basketball Training', duration: '8:24' },
    { id: 'Oy7jxMSBBiA', title: 'Exercices de tir pro — Routine complète', channel: 'Pro Basketball', duration: '12:05' },
  ],
  ball_handling: [
    { id: 'Oy7jxMSBBiA', title: 'Maniement de balle avancé — Crossover', channel: 'Basketball IQ', duration: '10:30' },
    { id: 'kFMJFMoFMBM', title: 'Dribble entre les jambes — Maîtrise totale', channel: 'Hoops Training', duration: '7:15' },
  ],
  footwork: [
    { id: 'kFMJFMoFMBM', title: 'Footwork NBA — Jeu de pieds offensif', channel: 'Basketball Skills', duration: '9:40' },
    { id: 'Oy7jxMSBBiA', title: 'Jeu de pieds défensif — Slides & Drops', channel: 'Defense Academy', duration: '6:55' },
  ],
  defense: [
    { id: 'Oy7jxMSBBiA', title: 'Défense 1v1 élite — Positionnement', channel: 'Defense Pro', duration: '11:20' },
    { id: 'kFMJFMoFMBM', title: 'Help defense & rotations — Système complet', channel: 'Basketball IQ', duration: '14:00' },
  ],
  conditioning: [
    { id: 'kFMJFMoFMBM', title: 'Cardio basketball — Endurance explosive', channel: 'Athletic Training', duration: '15:00' },
    { id: 'Oy7jxMSBBiA', title: 'Endurance joueur pro — Circuit training', channel: 'Pro Fitness', duration: '20:00' },
  ],
  finishing: [
    { id: 'Oy7jxMSBBiA', title: 'Finition au cercle — Contact & Floater', channel: 'Finishing School', duration: '9:10' },
    { id: 'kFMJFMoFMBM', title: 'Layup avancé — Euro step & Reverse', channel: 'Basketball Skills', duration: '8:45' },
  ],
  speed_change: [
    { id: 'kFMJFMoFMBM', title: 'Changement de vitesse — Hesitation', channel: 'Agility Training', duration: '7:30' },
    { id: 'Oy7jxMSBBiA', title: 'Accélération explosive — First step', channel: 'Speed Academy', duration: '6:20' },
  ],
  shifty: [
    { id: 'Oy7jxMSBBiA', title: 'Mouvements shifty — Jab step & Fake', channel: 'Ball Handling Pro', duration: '8:00' },
    { id: 'kFMJFMoFMBM', title: 'Crossover avancé — Behind the back', channel: 'Hoops Elite', duration: '10:15' },
  ],
  pocket_ball: [
    { id: 'kFMJFMoFMBM', title: 'Pocket dribble — Low & Tight control', channel: 'Ball Control', duration: '5:45' },
    { id: 'Oy7jxMSBBiA', title: 'Low dribble technique — Pressure defense', channel: 'Basketball IQ', duration: '7:00' },
  ],
};

const DEFAULT_VIDEOS = [
  { id: 'kFMJFMoFMBM', title: 'Exercice de basketball — Technique pro', channel: 'Basketball Training', duration: '8:00' },
  { id: 'Oy7jxMSBBiA', title: 'Entraînement NBA — Routine complète', channel: 'Pro Basketball', duration: '10:00' },
];

const difficultyConfig: Record<string, { color: string; glow: string; label: string }> = {
  beginner:     { color: '#22c55e', glow: 'rgba(34,197,94,0.4)',   label: 'Débutant' },
  intermediate: { color: '#f97316', glow: 'rgba(249,115,22,0.4)',  label: 'Intermédiaire' },
  advanced:     { color: '#ef4444', glow: 'rgba(239,68,68,0.4)',   label: 'Avancé' },
};

// ── Video Player Component ─────────────────────────────────────────────────
function ExerciseVideoCard({ video, index, diffColor }: {
  video: { id: string; title: string; channel: string; duration: string };
  index: number;
  diffColor: string;
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.12 * index, type: 'spring', stiffness: 300, damping: 26 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className="relative rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${hovered ? diffColor + '30' : 'rgba(255,255,255,0.08)'}`,
        boxShadow: hovered ? `0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px ${diffColor}15` : '0 4px 16px rgba(0,0,0,0.2)',
        transition: 'all 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      {!showPlayer ? (
        <div>
          <div
            className="relative w-full aspect-video bg-black overflow-hidden cursor-pointer"
            onClick={() => setShowPlayer(true)}
          >
            <motion.img
              animate={{ scale: hovered ? 1.06 : 1 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              src={`https://img.youtube.com/vi/${video.id}/maxresdefault.jpg`}
              alt={video.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${video.id}/hqdefault.jpg`;
              }}
            />

            {/* Gradient overlay */}
            <div className="absolute inset-0" style={{
              background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)',
            }} />

            {/* Play button */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                animate={{ scale: hovered ? 1.12 : 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className="relative"
              >
                {/* Pulse ring */}
                <motion.div
                  animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                  className="absolute inset-0 rounded-full"
                  style={{ background: 'rgba(249,115,22,0.4)' }}
                />
                <div
                  className="relative w-16 h-16 rounded-full flex items-center justify-center shadow-2xl"
                  style={{
                    background: 'linear-gradient(135deg, #f97316, #ea580c)',
                    boxShadow: '0 0 40px rgba(249,115,22,0.6), 0 8px 24px rgba(0,0,0,0.4)',
                  }}
                >
                  <Play className="h-7 w-7 text-white fill-white ml-1" />
                </div>
              </motion.div>
            </div>

            {/* Duration badge */}
            <div className="absolute top-3 left-3 px-2 py-1 rounded-lg text-[10px] font-black text-white"
              style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)' }}>
              ▶ {video.duration}
            </div>

            {/* YouTube badge */}
            <div className="absolute top-3 right-3 px-2 py-1 rounded-lg text-[10px] font-bold text-white flex items-center gap-1"
              style={{ background: 'rgba(255,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
              <svg className="h-2.5 w-2.5 fill-white" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
              YouTube
            </div>
          </div>

          <div className="p-4">
            <p className="text-sm font-black text-foreground line-clamp-1 mb-0.5">{video.title}</p>
            <p className="text-xs text-muted-foreground font-medium">{video.channel}</p>
          </div>
        </div>
      ) : (
        <div>
          <div className="relative w-full aspect-video bg-black">
            <AnimatePresence>
              {!isLoaded && (
                <motion.div
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ background: '#000' }}
                >
                  <div className="w-10 h-10 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
                </motion.div>
              )}
            </AnimatePresence>
            <iframe
              src={`https://www.youtube.com/embed/${video.id}?autoplay=1&rel=0&modestbranding=1`}
              title={video.title}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              onLoad={() => setIsLoaded(true)}
            />
          </div>
          <div className="p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-black text-foreground line-clamp-1">{video.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{video.channel}</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowPlayer(false)}
              className="flex-shrink-0 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              Fermer
            </motion.button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export function DrillDetailScreen() {
  const { t, tc, td, language } = useTranslation();
  const selectedDrillId = useAppStore(s => s.selectedDrillId);
  const goBack = useAppStore(s => s.goBack);
  const navigate = useAppStore(s => s.navigate);
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch: refetchDrill } = useQuery<{
    drill: {
      id: string; name: string; nameFr: string; category: string; difficulty: string;
      description: string; descriptionFr: string; instructions: string; instructionsFr: string;
      durationSec: number; targetReps: number; icon: string;
    };
    isFavorited: boolean;
  }>({
    queryKey: ['drill', selectedDrillId],
    queryFn: () => apiFetch(`/api/drills/${selectedDrillId}`),
    enabled: !!selectedDrillId,
  });

  const drill = data?.drill;
  const isFavorited = data?.isFavorited ?? false;

  const favoriteMutation = useMutation({
    mutationFn: () => apiFetch<{ favorited: boolean }>('/api/drills/favorite', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ drillId: selectedDrillId }),
    }),
    onSuccess: (result: { favorited: boolean }) => {
      queryClient.invalidateQueries({ queryKey: ['drill', selectedDrillId] });
      toast(result.favorited ? t('drill.addedFavorite') : t('drill.removedFavorite'));
    },
    onError: () => toast.error(t('drill.favoriteError')),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="sticky top-0 z-40 backdrop-blur-xl" style={{ background: 'rgba(0,0,0,0.7)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="max-w-lg md:max-w-3xl mx-auto flex items-center h-14 px-4">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <Skeleton className="h-5 w-40 mx-auto" />
            <Skeleton className="h-9 w-9 rounded-xl" />
          </div>
        </div>
        <div className="max-w-lg md:max-w-3xl mx-auto px-4 pt-6 space-y-4">
          <Skeleton className="h-52 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-14 w-full rounded-2xl" />
        </div>
        <BottomNav />
      </div>
    );
  }

  if (isError || !drill) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pb-24">
        <div className="text-center space-y-3 px-4">
          <div className="text-4xl">⚠️</div>
          <p className="text-muted-foreground">{t('drill.errorLoading')}</p>
          <Button variant="outline" size="sm" onClick={() => refetchDrill()}>
            <RefreshCw className="h-4 w-4 mr-2" />{t('action.retry')}
          </Button>
          <div className="pt-2">
            <Button variant="ghost" size="sm" onClick={goBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />{t('action.back')}
            </Button>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  const diff = difficultyConfig[drill.difficulty] ?? difficultyConfig.beginner;
  const instructions: string[] = drill.instructionsFr
    ? drill.instructionsFr.split('\n').filter((s: string) => s.trim())
    : [];
  const videos = CATEGORY_VIDEOS[drill.category] ?? DEFAULT_VIDEOS;

  return (
    <SwipeToGoBack className="relative min-h-screen bg-background pb-28">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.08, 0.14, 0.08] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-32 right-0 w-96 h-96 rounded-full"
          style={{ background: `radial-gradient(circle, ${diff.color}, transparent)` }}
        />
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.05, 0.1, 0.05] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
          className="absolute bottom-20 -left-20 w-72 h-72 rounded-full"
          style={{ background: `radial-gradient(circle, ${diff.color}, transparent)` }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative z-10 max-w-lg md:max-w-3xl lg:max-w-5xl mx-auto"
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <motion.header
          initial={{ y: -24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="sticky top-0 z-40 backdrop-blur-2xl"
          style={{
            background: 'rgba(0,0,0,0.75)',
            borderBottom: `1px solid ${diff.color}20`,
            boxShadow: `0 4px 32px rgba(0,0,0,0.4), 0 0 0 1px ${diff.color}10`,
          }}
        >
          <div className="flex items-center h-14 px-4">
            <motion.button
              whileHover={{ scale: 1.08, x: -2 }}
              whileTap={{ scale: 0.92 }}
              onClick={goBack}
              className="w-9 h-9 flex items-center justify-center rounded-xl -ml-1"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
              aria-label={t('action.back')}
            >
              <ArrowLeft className="h-4 w-4" />
            </motion.button>

            <div className="flex items-center gap-2 mx-auto">
              <motion.span
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, delay: 2 }}
                className="text-xl"
              >
                {drill.icon}
              </motion.span>
              <h1 className="text-sm font-black truncate max-w-[200px]">{getDrillName(drill, language)}</h1>
            </div>

            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => favoriteMutation.mutate()}
              disabled={favoriteMutation.isPending}
              className="w-9 h-9 flex items-center justify-center rounded-xl -mr-1"
              style={{
                background: isFavorited ? `${diff.color}20` : 'rgba(255,255,255,0.07)',
                border: `1px solid ${isFavorited ? diff.color + '40' : 'rgba(255,255,255,0.1)'}`,
              }}
              aria-label={isFavorited ? t('drill.removeFavorite') : t('drill.addFavorite')}
            >
              <Heart className={`h-4 w-4 transition-all duration-200 ${isFavorited ? 'fill-orange-500 text-orange-500 scale-110' : 'text-muted-foreground'}`} />
            </motion.button>
          </div>
        </motion.header>

        <div className="px-4 pt-5 space-y-5">
          {/* ── Hero Card ─────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 26 }}
            className="relative overflow-hidden rounded-3xl p-5"
            style={{
              background: `linear-gradient(145deg, ${diff.color}08, rgba(255,255,255,0.03))`,
              border: `1px solid ${diff.color}25`,
              boxShadow: `0 0 60px ${diff.glow}15, 0 8px 32px rgba(0,0,0,0.3)`,
            }}
          >
            {/* Accent top line */}
            <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-3xl"
              style={{ background: `linear-gradient(90deg, ${diff.color}, ${diff.color}40)`, boxShadow: `0 0 16px ${diff.glow}` }} />

            {/* Background blob */}
            <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full opacity-10"
              style={{ background: diff.color }} />

            <div className="flex items-start gap-4">
              <motion.div
                whileHover={{ scale: 1.12, rotate: -8 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
                style={{
                  background: `${diff.color}15`,
                  border: `1px solid ${diff.color}25`,
                  boxShadow: `0 4px 20px ${diff.glow}`,
                }}
              >
                {drill.icon}
              </motion.div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-black text-foreground leading-tight mb-2.5">
                  {getDrillName(drill, language)}
                </h2>
                <div className="flex flex-wrap gap-2">
                  <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full"
                    style={{ color: diff.color, background: `${diff.color}15`, border: `1px solid ${diff.color}25`, boxShadow: `0 0 12px ${diff.glow}` }}>
                    {diff.label}
                  </span>
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full text-muted-foreground"
                    style={{ background: 'rgba(255,255,255,0.05)' }}>
                    {tc(drill.category)}
                  </span>
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                { icon: Clock, value: `${drill.durationSec}s`, label: t('drill.duration') },
                { icon: Target, value: drill.targetReps, label: t('drill.repetitions') },
                { icon: Zap, value: diff.label, label: t('drill.level') },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.06 }}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-2xl"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${diff.color}15`,
                  }}
                >
                  <stat.icon className="h-4 w-4" style={{ color: diff.color }} />
                  <p className="text-sm font-black text-foreground">{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground font-medium">{stat.label}</p>
                </motion.div>
              ))}
            </div>

            {drill.descriptionFr && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
                className="mt-4 text-sm text-muted-foreground leading-relaxed"
              >
                {drill.descriptionFr}
              </motion.p>
            )}
          </motion.div>

          {/* ── Video Tutorials Section ───────────────────────────────── */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-1 h-6 rounded-full" style={{ background: `linear-gradient(180deg, ${diff.color}, ${diff.color}60)` }} />
                <h3 className="text-base font-black text-foreground">
                  {td('Vidéos explicatives', 'Tutorial videos')}
                </h3>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: `${diff.color}15`, color: diff.color, border: `1px solid ${diff.color}25` }}>
                  {videos.length}
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
              {td('Regarde ces vidéos pour maîtriser la technique correcte avant de commencer', 'Watch these videos to master the correct technique before starting')}
            </p>
            <div className="space-y-3">
              {videos.map((video, i) => (
                <ExerciseVideoCard key={video.id + i} video={video} index={i} diffColor={diff.color} />
              ))}
            </div>
          </motion.section>

          {/* ── Instructions Section ──────────────────────────────────── */}
          {instructions.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.32 }}
              className="rounded-2xl p-5"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: `${diff.color}15`, border: `1px solid ${diff.color}25` }}>
                  <ListOrdered className="h-4.5 w-4.5" style={{ color: diff.color }} />
                </div>
                <h3 className="text-sm font-black uppercase tracking-wider text-foreground">
                  {t('drill.instructions')}
                </h3>
              </div>

              <ol className="space-y-3.5">
                {instructions.map((step: string, idx: number) => (
                  <motion.li
                    key={idx}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.38 + idx * 0.07, type: 'spring', stiffness: 300, damping: 26 }}
                    className="flex gap-3.5"
                  >
                    <span
                      className="flex-shrink-0 w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black text-white mt-0.5"
                      style={{
                        background: `linear-gradient(135deg, ${diff.color}, ${diff.color}bb)`,
                        boxShadow: `0 2px 12px ${diff.glow}`,
                      }}
                    >
                      {idx + 1}
                    </span>
                    <p className="text-sm leading-relaxed text-foreground/90 pt-1">{step}</p>
                  </motion.li>
                ))}
              </ol>
            </motion.section>
          )}

          {/* ── Start Button ──────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.42 }}
          >
            <motion.button
              whileHover={{ scale: 1.02, y: -3 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('camera-workout')}
              className="w-full h-16 rounded-2xl flex items-center justify-center gap-3 text-base font-black text-white relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #f97316, #ea580c)',
                boxShadow: '0 8px 40px rgba(249,115,22,0.5), 0 2px 0 rgba(255,255,255,0.1) inset',
              }}
            >
              {/* Shimmer */}
              <motion.div
                className="absolute inset-0"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'linear', repeatDelay: 2 }}
                style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)' }}
              />
              <Camera className="h-5 w-5 relative z-10" />
              <span className="relative z-10">{t('drill.startWithCamera')}</span>
              <ChevronRight className="h-5 w-5 relative z-10" />
            </motion.button>
          </motion.div>

          <div className="h-2" />
        </div>
      </motion.div>

      <BottomNav />
    </SwipeToGoBack>
  );
}

export default DrillDetailScreen;