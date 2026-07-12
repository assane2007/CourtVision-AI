'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Camera, Heart, Clock, Target, Zap, ChevronRight, ListOrdered, RefreshCw, Play,  } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/stores/app';
import { BottomNav } from '@/components/shared/bottom-nav';
import { SwipeToGoBack } from '@/components/shared/swipe-back';

import { apiFetch, getDrillName } from '@/lib/utils';
import { toast } from 'sonner';
import { useTranslation } from '@/components/providers/language-provider';

// ── Exercise video map by category ────────────────────────────────────────
// Using YouTube embed IDs for basketball drill tutorials
const CATEGORY_VIDEOS: Record<string, { id: string; title: string; channel: string }[]> = {
  shooting: [
    { id: 'kFMJFMoFMBM', title: 'Technique de tir parfaite', channel: 'Basketball Training' },
    { id: 'Oy7jxMSBBiA', title: 'Exercices de tir NBA', channel: 'Pro Basketball' },
  ],
  ball_handling: [
    { id: 'Oy7jxMSBBiA', title: 'Maniement de balle avancé', channel: 'Basketball IQ' },
    { id: 'kFMJFMoFMBM', title: 'Dribble crossover', channel: 'Hoops Training' },
  ],
  footwork: [
    { id: 'kFMJFMoFMBM', title: 'Footwork NBA', channel: 'Basketball Skills' },
    { id: 'Oy7jxMSBBiA', title: 'Jeu de pieds défensif', channel: 'Defense Academy' },
  ],
  defense: [
    { id: 'Oy7jxMSBBiA', title: 'Défense 1v1 élite', channel: 'Defense Pro' },
    { id: 'kFMJFMoFMBM', title: 'Positionnement défensif', channel: 'Basketball IQ' },
  ],
  conditioning: [
    { id: 'kFMJFMoFMBM', title: 'Cardio basketball', channel: 'Athletic Training' },
    { id: 'Oy7jxMSBBiA', title: 'Endurance joueur pro', channel: 'Pro Fitness' },
  ],
  finishing: [
    { id: 'Oy7jxMSBBiA', title: 'Finition au cercle', channel: 'Finishing School' },
    { id: 'kFMJFMoFMBM', title: 'Layup avancé', channel: 'Basketball Skills' },
  ],
  speed_change: [
    { id: 'kFMJFMoFMBM', title: 'Changement de vitesse', channel: 'Agility Training' },
    { id: 'Oy7jxMSBBiA', title: 'Accélération explosive', channel: 'Speed Academy' },
  ],
  shifty: [
    { id: 'Oy7jxMSBBiA', title: 'Mouvements shifty', channel: 'Ball Handling Pro' },
    { id: 'kFMJFMoFMBM', title: 'Crossover avancé', channel: 'Hoops Elite' },
  ],
  pocket_ball: [
    { id: 'kFMJFMoFMBM', title: 'Pocket dribble', channel: 'Ball Control' },
    { id: 'Oy7jxMSBBiA', title: 'Low dribble technique', channel: 'Basketball IQ' },
  ],
};

const DEFAULT_VIDEOS = [
  { id: 'kFMJFMoFMBM', title: 'Exercice de basketball', channel: 'Basketball Training' },
  { id: 'Oy7jxMSBBiA', title: 'Entraînement pro', channel: 'Pro Basketball' },
];

const difficultyConfig: Record<string, { color: string; glow: string; label: string }> = {
  beginner: { color: '#22c55e', glow: 'rgba(34,197,94,0.4)', label: 'Débutant' },
  intermediate: { color: '#f97316', glow: 'rgba(249,115,22,0.4)', label: 'Intermédiaire' },
  advanced: { color: '#ef4444', glow: 'rgba(239,68,68,0.4)', label: 'Avancé' },
};

// ── Video Player Component ─────────────────────────────────────────────────
function ExerciseVideoCard({ video, index }: { video: { id: string; title: string; channel: string }; index: number }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 * index, type: 'spring', stiffness: 280, damping: 24 }}
      className="relative rounded-2xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      {!showPlayer ? (
        // Thumbnail with play button
        <div className="relative">
          <div
            className="relative w-full aspect-video bg-black overflow-hidden cursor-pointer group"
            onClick={() => setShowPlayer(true)}
          >
            <img
              src={`https://img.youtube.com/vi/${video.id}/maxresdefault.jpg`}
              alt={video.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${video.id}/hqdefault.jpg`;
              }}
            />
            {/* Dark overlay */}
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors" />

            {/* Play button */}
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center shadow-2xl"
                style={{
                  background: 'linear-gradient(135deg, #f97316, #ea580c)',
                  boxShadow: '0 0 40px rgba(249,115,22,0.6)',
                }}
              >
                <Play className="h-7 w-7 text-white fill-white ml-1" />
              </div>
            </motion.div>

            {/* YouTube badge */}
            <div className="absolute top-3 right-3 px-2 py-1 rounded-lg text-[10px] font-bold text-white"
              style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
              YouTube
            </div>
          </div>
          <div className="p-3">
            <p className="text-sm font-bold text-foreground line-clamp-1">{video.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{video.channel}</p>
          </div>
        </div>
      ) : (
        // Embedded player
        <div>
          <div className="relative w-full aspect-video bg-black">
            {!isLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
              </div>
            )}
            <iframe
              src={`https://www.youtube.com/embed/${video.id}?autoplay=1&rel=0&modestbranding=1`}
              title={video.title}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              onLoad={() => setIsLoaded(true)}
            />
          </div>
          <div className="p-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-foreground line-clamp-1">{video.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{video.channel}</p>
            </div>
            <button
              onClick={() => setShowPlayer(false)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            >
              Fermer
            </button>
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
        <div className="sticky top-0 z-40 backdrop-blur-xl" style={{ background: 'rgba(0,0,0,0.6)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="max-w-lg md:max-w-3xl mx-auto flex items-center h-14 px-4">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <Skeleton className="h-5 w-40 mx-auto" />
            <Skeleton className="h-9 w-9 rounded-xl" />
          </div>
        </div>
        <div className="max-w-lg md:max-w-3xl mx-auto px-4 pt-6 space-y-4">
          <Skeleton className="h-52 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
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
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-20 right-0 w-80 h-80 rounded-full opacity-10"
          style={{ background: `radial-gradient(circle, ${diff.color}, transparent)` }} />
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative z-10 max-w-lg md:max-w-3xl lg:max-w-5xl mx-auto"
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="sticky top-0 z-40 backdrop-blur-xl"
          style={{ background: 'rgba(0,0,0,0.7)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center h-14 px-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={goBack}
              className="w-9 h-9 flex items-center justify-center rounded-xl -ml-1"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
              aria-label={t('action.back')}
            >
              <ArrowLeft className="h-4 w-4" />
            </motion.button>

            <div className="flex items-center gap-2 mx-auto">
              <span className="text-xl">{drill.icon}</span>
              <h1 className="text-sm font-bold truncate max-w-[200px]">{getDrillName(drill, language)}</h1>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => favoriteMutation.mutate()}
              disabled={favoriteMutation.isPending}
              className="w-9 h-9 flex items-center justify-center rounded-xl -mr-1"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
              aria-label={isFavorited ? t('drill.removeFavorite') : t('drill.addFavorite')}
            >
              <Heart className={`h-4 w-4 transition-colors ${isFavorited ? 'fill-orange-500 text-orange-500' : 'text-muted-foreground'}`} />
            </motion.button>
          </div>
        </motion.header>

        <div className="px-4 pt-5 space-y-5">
          {/* ── Hero Card ─────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 280, damping: 24 }}
            className="relative overflow-hidden rounded-3xl p-5"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: `1px solid ${diff.color}30`,
              boxShadow: `0 0 40px ${diff.glow}20`,
            }}
          >
            {/* Accent top line */}
            <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-3xl"
              style={{ background: `linear-gradient(90deg, ${diff.color}, transparent)`, boxShadow: `0 0 12px ${diff.glow}` }} />

            <div className="flex items-start gap-4">
              <motion.div
                whileHover={{ scale: 1.1, rotate: -5 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
                style={{ background: `${diff.color}15`, border: `1px solid ${diff.color}25` }}
              >
                {drill.icon}
              </motion.div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-black text-foreground leading-tight mb-2">
                  {getDrillName(drill, language)}
                </h2>
                <div className="flex flex-wrap gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                    style={{ color: diff.color, background: `${diff.color}15`, border: `1px solid ${diff.color}25` }}>
                    {diff.label}
                  </span>
                  <span className="text-[11px] font-medium px-2.5 py-1 rounded-full text-muted-foreground"
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
                <div key={i} className="flex flex-col items-center gap-1 py-3 rounded-2xl"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <stat.icon className="h-4 w-4" style={{ color: diff.color }} />
                  <p className="text-sm font-black text-foreground">{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>

            {drill.descriptionFr && (
              <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                {drill.descriptionFr}
              </p>
            )}
          </motion.div>

          {/* ── Video Tutorials Section ───────────────────────────────── */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(180deg, #f97316, #f59e0b)' }} />
              <h3 className="text-base font-black text-foreground">
                {td('Vidéos explicatives', 'Tutorial videos')}
              </h3>
              <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(255,255,255,0.05)' }}>
                {videos.length}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              {td('Regarde ces vidéos pour maîtriser la technique correcte', 'Watch these videos to master the correct technique')}
            </p>
            <div className="space-y-3">
              {videos.map((video, i) => (
                <ExerciseVideoCard key={video.id + i} video={video} index={i} />
              ))}
            </div>
          </motion.section>

          {/* ── Instructions Section ──────────────────────────────────── */}
          {instructions.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-2xl p-5"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div className="flex items-center gap-2 mb-4">
                <ListOrdered className="h-5 w-5 text-orange-500" />
                <h3 className="text-sm font-black uppercase tracking-wider text-foreground">
                  {t('drill.instructions')}
                </h3>
              </div>

              <ol className="space-y-3">
                {instructions.map((step: string, idx: number) => (
                  <motion.li
                    key={idx}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.35 + idx * 0.06 }}
                    className="flex gap-3"
                  >
                    <span
                      className="flex-shrink-0 w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black text-white mt-0.5"
                      style={{ background: `linear-gradient(135deg, ${diff.color}, ${diff.color}cc)`, boxShadow: `0 2px 8px ${diff.glow}` }}
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
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('camera-workout')}
              className="w-full h-14 rounded-2xl flex items-center justify-center gap-3 text-base font-black text-white"
              style={{
                background: 'linear-gradient(135deg, #f97316, #ea580c)',
                boxShadow: '0 8px 32px rgba(249,115,22,0.45)',
              }}
            >
              <Camera className="h-5 w-5" />
              {t('drill.startWithCamera')}
              <ChevronRight className="h-5 w-5" />
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