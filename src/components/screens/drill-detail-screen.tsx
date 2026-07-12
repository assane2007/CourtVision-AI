'use client';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Camera,
  Heart,
  Clock,
  Target,
  Zap,
  ChevronRight,
  ListOrdered,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/stores/app';
import { BottomNav } from '@/components/shared/bottom-nav';
import { SwipeToGoBack } from '@/components/shared/swipe-back';
import { DIFFICULTY_CONFIG } from '@/lib/constants';
import { DrillDemoAnimation } from '@/components/drill-demo-animation';
import { apiFetch, getDrillName } from '@/lib/utils';
import { containerVariants, itemVariants } from '@/lib/animations';
import { toast } from 'sonner';
import { useTranslation } from '@/components/providers/language-provider';

// ── Component ───────────────────────────────────────────────────────
export function DrillDetailScreen() {
  const { t, tc, td, language } = useTranslation()
  const selectedDrillId = useAppStore(s => s.selectedDrillId)
  const goBack = useAppStore(s => s.goBack)
  const navigate = useAppStore(s => s.navigate)
  const queryClient = useQueryClient()

  // ── Fetch single drill ────────────────────────────────────────────
  const { data, isLoading, isError, refetch: refetchDrill } = useQuery<{
    drill: { id: string; name: string; nameFr: string; category: string; difficulty: string; description: string; descriptionFr: string; instructions: string; instructionsFr: string; durationSec: number; targetReps: number; icon: string }
    isFavorited: boolean
  }>({
    queryKey: ['drill', selectedDrillId],
    queryFn: () => apiFetch(`/api/drills/${selectedDrillId}`),
    enabled: !!selectedDrillId,
  })

  const drill = data?.drill
  const isFavorited = data?.isFavorited ?? false

  // ── Favorite mutation ────────────────────────────────────────────
  const favoriteMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ favorited: boolean }>('/api/drills/favorite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drillId: selectedDrillId }),
      }),
    onSuccess: (result: { favorited: boolean }) => {
      queryClient.invalidateQueries({ queryKey: ['drill', selectedDrillId] })
      toast(result.favorited ? t('drill.addedFavorite') : t('drill.removedFavorite'), {
        description: result.favorited ? t('drill.favoriteDrill') : t('drill.removedFavorite'),
      })
    },
    onError: () => {
      toast.error(t('drill.favoriteError'))
    },
  })

  // ── Loading skeleton ─────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b">
          <div className="max-w-lg md:max-w-3xl lg:max-w-5xl mx-auto flex items-center h-14 px-4">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-5 w-40 mx-auto" />
            <Skeleton className="h-9 w-9 rounded-lg" />
          </div>
        </header>
        <div className="max-w-lg md:max-w-3xl lg:max-w-5xl mx-auto px-4 pt-6 space-y-6">
          <Skeleton className="h-52 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>
        <BottomNav />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pb-24">
        <div className="text-center space-y-3 px-4">
          <div className="text-4xl">⚠️</div>
          <p className="text-muted-foreground">{t('drill.errorLoading')}</p>
          <Button variant="outline" size="sm" onClick={() => refetchDrill()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('action.retry')}
          </Button>
          <div className="pt-2">
            <Button variant="ghost" size="sm" onClick={goBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('action.back')}
            </Button>
          </div>
        </div>
        <BottomNav />
      </div>
    )
  }

  if (!drill) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pb-24">
        <div className="text-center space-y-3 px-4">
          <div className="text-4xl">🏀</div>
          <p className="text-muted-foreground">{t('drill.notFound')}</p>
          <Button variant="outline" onClick={goBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('action.back')}
          </Button>
        </div>
        <BottomNav />
      </div>
    )
  }

  const diff = DIFFICULTY_CONFIG[drill.difficulty] ?? DIFFICULTY_CONFIG.beginner
  const categoryLabel = tc(drill.category)
  const instructions: string[] = drill.instructionsFr
    ? drill.instructionsFr.split('\n').filter((s: string) => s.trim())
    : []

  return (
    <SwipeToGoBack className="min-h-screen bg-background pb-24">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-lg md:max-w-3xl lg:max-w-5xl mx-auto"
      >
        {/* ── Header ─────────────────────────────────────────────── */}
        <motion.header
          variants={itemVariants}
          className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b"
        >
          <div className="flex items-center h-14 px-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={goBack}
              className="rounded-lg -ml-2"
              aria-label={t('action.back')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>

            <div className="flex items-center gap-2 mx-auto">
              <span className="text-xl">{drill.icon}</span>
              <h1 className="text-base font-semibold truncate max-w-[200px]">
                {getDrillName(drill, language)}
              </h1>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => favoriteMutation.mutate()}
              disabled={favoriteMutation.isPending}
              className="rounded-lg -mr-2"
              aria-label={isFavorited ? t('drill.removeFavorite') : t('drill.addFavorite')}
            >
              <Heart
                className={`h-5 w-5 transition-colors ${
                  isFavorited
                    ? 'fill-red-500 text-red-500' :'text-muted-foreground'
                }`}
              />
            </Button>
          </div>
        </motion.header>

        <div className="px-4 pt-5 space-y-5">
          {/* ── Drill Info Card ──────────────────────────────────── */}
          <motion.div variants={itemVariants}>
            <Card className="border-0 dark:border-border/50 shadow-lg dark:shadow-md overflow-hidden">
              {/* Accent top bar */}
              <div className="h-1.5 bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500" />
              {/* Animated drill demo */}
              <DrillDemoAnimation category={drill.category} className="mx-4 mt-4" />
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center text-3xl">
                    {drill.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-bold leading-tight mb-2">
                      {getDrillName(drill, language)}
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-xs font-medium">
                        {categoryLabel}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-xs font-medium ${diff.className}`}
                      >
                        {td(drill.difficulty)}
                      </Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                <p className="text-sm text-muted-foreground leading-relaxed">
                  {drill.descriptionFr}
                </p>

                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                      <Clock className="h-4 w-4 text-orange-500" />
                    </div>
                    <div>
                      <p className="font-semibold">{drill.durationSec}s</p>
                      <p className="text-xs text-muted-foreground">{t('drill.duration')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                      <Target className="h-4 w-4 text-orange-500" />
                    </div>
                    <div>
                      <p className="font-semibold">{drill.targetReps}</p>
                      <p className="text-xs text-muted-foreground">{t('drill.repetitions')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                      <Zap className="h-4 w-4 text-orange-500" />
                    </div>
                    <div>
                      <p className="font-semibold capitalize">{td(drill.difficulty)}</p>
                      <p className="text-xs text-muted-foreground">{t('drill.level')}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Instructions Section ─────────────────────────────── */}
          {instructions.length > 0 && (
            <motion.div variants={itemVariants}>
              <Card className="border-0 dark:border-border/50 shadow-md dark:shadow-black/20">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <ListOrdered className="h-5 w-5 text-orange-500" />
                    <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                      {t('drill.instructions')}
                    </h3>
                  </div>

                  <ol className="space-y-3">
                    {instructions.map((step: string, idx: number) => (
                      <motion.li
                        key={idx}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + idx * 0.06, duration: 0.3 }}
                        className="flex gap-3"
                      >
                        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                          {idx + 1}
                        </span>
                        <p className="text-sm leading-relaxed pt-1">{step}</p>
                      </motion.li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ── Start Button ─────────────────────────────────────── */}
          <motion.div variants={itemVariants}>
            <Button
              onClick={() => navigate('camera-workout')}
              className="w-full h-14 rounded-xl text-base font-semibold shadow-lg shadow-orange-500/25
                         bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700
                         transition-all duration-200 active:scale-[0.98]"
            >
              <Camera className="h-5 w-5 mr-2.5" />
              {t('drill.startWithCamera')}
              <ChevronRight className="h-4 w-4 ml-1.5" />
            </Button>
          </motion.div>

          {/* Spacer for bottom nav */}
          <div className="h-2" />
        </div>
      </motion.div>

      <BottomNav />
    </SwipeToGoBack>
  )
}

export default DrillDetailScreen