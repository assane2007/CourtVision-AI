'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Target, Trophy, Users, Zap, Star, Loader2, Medal, Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { useNavigation } from '@/stores/navigation';
import { useAppStore } from '@/stores/app';
import { SwipeToGoBack } from '@/components/shared/swipe-back';
import { apiFetch } from '@/lib/utils';
import { containerVariants, itemVariants } from '@/lib/animations';
import { useTranslation } from '@/components/providers/language-provider';
import { toast } from 'sonner';

interface LeaderboardEntry {
  playerId: string; name: string; avatar: string | null; xpLevel: number
  currentValue: number; targetValue: number; completed: boolean; completedAt: string | null; rank: number
}

interface ChallengeData {
  challenge: {
    id: string; title: string; description: string; type: string; targetValue: number
    unit: string; startDate: string; endDate: string; xpReward: number
    creator: { id: string; name: string; avatar: string | null; xpLevel: number }
    participantCount: number; teams: Array<{ id: string; name: string; logo: string | null }>
    leaderboard: LeaderboardEntry[]
    myParticipation: { currentValue: number; completed: boolean; progressPercent: number } | null
    createdAt: string
  }
}

export default function ChallengeDetailScreen() {
  const { t, td } = useTranslation()
  const { goBack } = useNavigation()
  const selectedDrillId = useAppStore(s => s.selectedDrillId)
  const queryClient = useQueryClient()

  const { data, isLoading, isError } = useQuery<ChallengeData>({
    queryKey: ['challenge-detail', selectedDrillId],
    queryFn: () => apiFetch(`/api/challenges/${selectedDrillId || 'none'}`),
    enabled: !!selectedDrillId,
    staleTime: 10_000,
    refetchInterval: 15_000,
  })

  const challenge = data?.challenge

  const _updateProgress = useMutation({
    mutationFn: ({ value }: { value: number }) => fetch(`/api/challenges/${selectedDrillId}/progress`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value }),
    }).then(r => { if (!r.ok) return r.json().then(e => { throw new Error(e.error) }); return r.json() }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['challenge-detail'] }) },
    onError: (e: Error) => toast.error(e.message),
  })

  const joinChallenge = useMutation({
    mutationFn: () => fetch(`/api/challenges/${selectedDrillId}/join`, { method: 'POST' })
      .then(r => { if (!r.ok) return r.json().then(e => { throw new Error(e.error) }); return r.json() }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['challenge-detail'] }); toast.success(td('Défi rejoint!', 'Challenge joined!')) },
    onError: (e: Error) => toast.error(e.message),
  })

  if (!selectedDrillId) return <div className="min-h-screen bg-background" />

  const progress = challenge?.myParticipation?.progressPercent || 0
  const now = Date.now()
  const isEnded = challenge ? new Date(challenge.endDate) < new Date(now) : false
  const isStarted = challenge ? new Date(challenge.startDate) <= new Date(now) : false

  return (
    <SwipeToGoBack className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b">
        <div className="max-w-lg mx-auto flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={goBack} className="shrink-0" aria-label={t('action.back')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Target className="h-5 w-5 text-orange-500" />
          <h1 className="text-lg font-bold flex-1 truncate">{challenge?.title || td('Chargement...', 'Loading...')}</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-4 pb-24">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        ) : isError || !challenge ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <Target className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">{td('Défi introuvable', 'Challenge not found')}</p>
          </div>
        ) : (
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
            {/* Info card */}
            <motion.div variants={itemVariants} className="p-4 rounded-xl border bg-card space-y-3">
              <p className="text-sm">{challenge.description}</p>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Target className="h-3.5 w-3.5" />{challenge.targetValue} {challenge.unit}</span>
                <span className="flex items-center gap-1"><Zap className="h-3.5 w-3.5 text-amber-500" />{challenge.xpReward} XP</span>
                <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{challenge.participantCount} participants</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>{isStarted ? (isEnded ? td('Terminé', 'Ended') : td('En cours', 'In progress')) : td('Commence bientôt', 'Starts soon')}</span>
                <span>•</span>
                <span>{td('Créé par', 'Created by')} {challenge.creator.name}</span>
              </div>
            </motion.div>

            {/* My progress */}
            <motion.div variants={itemVariants} className="p-4 rounded-xl border bg-card">
              <h3 className="font-semibold text-sm mb-3">{td('Ma progression', 'My Progress')}</h3>
              {challenge.myParticipation ? (
                <>
                  <div className="flex justify-between text-sm mb-2">
                    <span>{challenge.myParticipation.currentValue}/{challenge.targetValue} {challenge.unit}</span>
                    <span className="font-bold">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-3 mb-3" />
                  {challenge.myParticipation.completed && (
                    <div className="flex items-center gap-2 text-green-600">
                      <Trophy className="h-4 w-4" /><span className="text-sm font-medium">{td('Défi terminé!', 'Challenge completed!')}</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-3">{td('Rejoignez ce défi pour suivre votre progression', 'Join this challenge to track your progress')}</p>
                  <Button onClick={() => joinChallenge.mutate()} disabled={joinChallenge.isPending || !isStarted}>
                    {joinChallenge.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : td('Rejoindre le défi', 'Join challenge')}
                  </Button>
                </div>
              )}
            </motion.div>

            {/* Leaderboard */}
            <motion.div variants={itemVariants}>
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Trophy className="h-4 w-4 text-orange-500" />
                {td('Classement', 'Rankings')} ({challenge.leaderboard.length})
              </h3>
              {challenge.leaderboard.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">{td('Aucun participant', 'No participants')}</p>
              ) : (
                <div className="space-y-2">
                  {challenge.leaderboard.map((entry, i) => (
                    <motion.div key={entry.playerId} variants={itemVariants}>
                      <div className={`flex items-center gap-3 p-3 rounded-xl border ${
                        i === 0 ? 'border-amber-500/50 bg-amber-500/5' : i < 3 ? 'border-orange-500/30 bg-orange-500/5' : 'border-border/50 bg-card'
                      }`}>
                        <div className="w-8 text-center">
                          {i === 0 ? <Medal className="h-5 w-5 text-amber-500 mx-auto" /> :
                           i === 1 ? <Medal className="h-5 w-5 text-gray-400 dark:text-gray-500 mx-auto" /> :
                           i === 2 ? <Medal className="h-5 w-5 text-orange-700 dark:text-orange-400 mx-auto" /> :
                           <span className="text-sm font-bold text-muted-foreground">{entry.rank}</span>}
                        </div>
                        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-bold shrink-0">
                          {entry.avatar ? <img src={entry.avatar} alt={entry.name} className="w-full h-full rounded-full object-cover" /> : entry.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium truncate">{entry.name}</span>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{entry.currentValue}/{entry.targetValue}</span>
                            {entry.completed && <Star className="h-3 w-3 text-green-500" />}
                          </div>
                        </div>
                        <Progress value={Math.min(100, (entry.currentValue / entry.targetValue) * 100)} className="w-16 h-1.5" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </main>
    </SwipeToGoBack>
  )
}