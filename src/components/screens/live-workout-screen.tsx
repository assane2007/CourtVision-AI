'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Radio, Trophy, Loader2, Play, Square,
  ChevronDown, Crown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { useNavigation } from '@/stores/navigation';
import { SwipeToGoBack } from '@/components/shared/swipe-back';
import { apiFetch } from '@/lib/utils';
import { containerVariants, itemVariants } from '@/lib/animations';
import { BottomNav } from '@/components/shared/bottom-nav';
import { useTranslation } from '@/components/providers/language-provider';
import { toast } from 'sonner';

interface LiveSessionItem {
  id: string; title: string; status: string; maxViewers: number; viewerCount: number
  host: { id: string; name: string; avatar: string | null; xpLevel: number }
  isHost: boolean; startedAt: string | null; createdAt: string
}

interface LiveSessionDetail {
  session: {
    id: string; title: string; drillId: string | null; status: string
    maxViewers: number; host: { id: string; name: string; avatar: string | null; xpLevel: number }
    isHost: boolean; isParticipant: boolean; participantCount: number
    rankings: Array<{ playerId: string; name: string; avatar: string | null; xpLevel: number; score: number; reps: number; isCurrentPlayer: boolean; rank: number }>
    startedAt: string | null; endedAt: string | null; createdAt: string
  }
}

export default function LiveWorkoutScreen() {
  const { t, td } = useTranslation()
  const { goBack, navigate: _navigate } = useNavigation()
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle] = useState('')
  const [viewingSession, setViewingSession] = useState<string | null>(null)

  // List active sessions
  const { data: listData, isLoading, refetch: _refetch } = useQuery<{ sessions: LiveSessionItem[] }>({
    queryKey: ['live-sessions'],
    queryFn: () => apiFetch('/api/live?status=active'),
    staleTime: 10_000,
    refetchInterval: 15_000,
  })

  // Session detail (when viewing)
  const { data: detailData } = useQuery<LiveSessionDetail>({
    queryKey: ['live-detail', viewingSession],
    queryFn: () => apiFetch(`/api/live/${viewingSession}`),
    enabled: !!viewingSession,
    staleTime: 5_000,
    refetchInterval: 5_000,
  })

  const createSession = useMutation({
    mutationFn: () => fetch('/api/live', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    }).then(r => { if (!r.ok) return r.json().then(e => { throw new Error(e.error) }); return r.json() }),
    onSuccess: (d) => {
      setShowCreate(false); setTitle('')
      setViewingSession(d.session.id)
      queryClient.invalidateQueries({ queryKey: ['live-sessions'] })
      toast.success(td('Session live créée!', 'Live session created!'))
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const joinSession = useMutation({
    mutationFn: (sessionId: string) => fetch(`/api/live/${sessionId}/join`, { method: 'POST' })
      .then(r => { if (!r.ok) return r.json().then(e => { throw new Error(e.error) }); return r.json() }),
    onSuccess: (_d, sessionId) => {
      setViewingSession(sessionId)
      queryClient.invalidateQueries({ queryKey: ['live-sessions'] })
      toast.success(td('Vous avez rejoint la session!', 'You joined the session!'))
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const endSession = useMutation({
    mutationFn: (sessionId: string) => fetch(`/api/live/${sessionId}`, { method: 'DELETE' })
      .then(r => { if (!r.ok) return r.json().then(e => { throw new Error(e.error) }); return r.json() }),
    onSuccess: () => {
      setViewingSession(null)
      queryClient.invalidateQueries({ queryKey: ['live-sessions'] })
      toast.success(td('Session terminée', 'Session ended'))
    },
  })

  const _submitScore = useMutation({
    mutationFn: ({ sessionId, score, reps }: { sessionId: string; score: number; reps: number }) =>
      fetch(`/api/live/${sessionId}/score`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score, reps }),
      }).then(r => { if (!r.ok) return r.json().then(e => { throw new Error(e.error) }); return r.json() }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['live-detail'] }),
  })

  const session = detailData?.session

  // When viewing a session, show the detail view
  if (viewingSession) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b">
          <div className="max-w-lg mx-auto flex items-center gap-3 px-4 py-3">
            <Button variant="ghost" size="icon" onClick={() => setViewingSession(null)} className="shrink-0">
              <ChevronDown className="h-5 w-5" />
            </Button>
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <h1 className="text-lg font-bold flex-1 truncate">{session?.title || td('Session live', 'Live Session')}</h1>
            {session?.isHost && session.status !== 'ended' && (
              <Button size="sm" variant="destructive" className="min-h-[44px] text-xs" onClick={() => endSession.mutate(viewingSession)}>
                <Square className="h-3 w-3 mr-1" />{td('Terminer', 'End')}
              </Button>
            )}
          </div>
        </header>

        <main className="max-w-lg mx-auto px-4 pt-4 pb-24">
          {!session ? (
            <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : session.status === 'ended' ? (
            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-4">
              <div className="text-center py-8">
                <Trophy className="h-16 w-16 text-amber-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold">{td('Session terminée!', 'Session ended!')}</h2>
                <p className="text-sm text-muted-foreground mt-1">{session.participantCount} {td('participants', 'participants')}</p>
              </div>
              <div className="space-y-2">
                {session.rankings.map((entry, i) => (
                  <motion.div key={entry.playerId} variants={itemVariants}>
                    <div className={`flex items-center gap-3 p-3 rounded-xl border ${i === 0 ? 'border-amber-500/50 bg-amber-500/5' : entry.isCurrentPlayer ? 'border-orange-500/50 bg-orange-500/5' : 'border-border/50 bg-card'}`}>
                      <span className={`text-lg font-black w-8 text-center ${i === 0 ? 'text-amber-500' : i === 1 ? 'text-gray-400 dark:text-gray-500' : i === 2 ? 'text-orange-700 dark:text-orange-400' : 'text-muted-foreground'}`}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : entry.rank}
                      </span>
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={entry.avatar || undefined} />
                        <AvatarFallback className="text-xs font-bold">{entry.name.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium">{entry.name}{entry.isCurrentPlayer && <>{' ('}{td('vous', 'you')}{')'}</>}</span>
                        <p className="text-xs text-muted-foreground">{entry.reps} {td('rép.', 'reps.')}</p>
                      </div>
                      <span className="text-lg font-bold">{entry.score.toFixed(1)}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-4">
              {/* Host info */}
              <motion.div variants={itemVariants} className="flex items-center gap-3 p-3 rounded-xl bg-card border">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={session.host.avatar || undefined} />
                  <AvatarFallback className="text-xs font-bold">{session.host.name.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{session.host.name}</span>
                    <Crown className="h-3.5 w-3.5 text-amber-500" />
                  </div>
                  <p className="text-xs text-muted-foreground">{session.participantCount} {td('participants', 'participants')}</p>
                </div>
                <div className="flex items-center gap-1.5 text-red-500">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs font-medium">LIVE</span>
                </div>
              </motion.div>

              {/* Rankings live */}
              <motion.div variants={itemVariants}>
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-orange-500" />{td('Classement en direct', 'Live Rankings')}
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {session.rankings.map((entry, i) => (
                    <div key={entry.playerId} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                      entry.isCurrentPlayer ? 'border-orange-500/50 bg-orange-500/5' : 'border-border/50 bg-card'
                    }`}>
                      <span className={`text-sm font-bold w-6 text-center ${i < 3 ? 'text-amber-500' : 'text-muted-foreground'}`}>{i + 1}</span>
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={entry.avatar || undefined} />
                        <AvatarFallback className="text-[10px] font-bold">{entry.name.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium truncate">{entry.name}</span>
                        <p className="text-xs text-muted-foreground">{entry.reps} {td('rép.', 'reps.')}</p>
                      </div>
                      <span className="text-sm font-bold tabular-nums">{entry.score.toFixed(1)}</span>
                    </div>
                  ))}
                  {session.rankings.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-6">{td('En attente de participants...', 'Waiting for participants...')}</p>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </main>
      </div>
    )
  }

  // Default: list view
  return (
    <SwipeToGoBack className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b">
        <div className="max-w-lg mx-auto flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={goBack} className="shrink-0" aria-label={t('action.back')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Radio className="h-5 w-5 text-red-500" />
          <h1 className="text-lg font-bold flex-1">Live Workout</h1>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button size="sm" className="min-h-[44px] bg-red-500 hover:bg-red-600"><Play className="h-4 w-4 mr-1" />{td('Héberger', 'Host')}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{td('Nouvelle session live', 'New Live Session')}</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div><Label htmlFor="live-session-title">{td('Titre de la session', 'Session title')}</Label><Input id="live-session-title" value={title} onChange={e => setTitle(e.target.value)} placeholder={td('Ex: Défi de tirs à 3 points', 'Ex: 3-point shooting challenge')} /></div>
                <Button className="w-full bg-red-500 hover:bg-red-600" onClick={() => createSession.mutate()} disabled={createSession.isPending || !title.trim()}>
                  {createSession.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : td('Démarrer la session', 'Start session')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-4 pb-24">
        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 rounded-xl border"><Skeleton className="h-5 w-32 mb-2" /><Skeleton className="h-3 w-48" /></div>
          ))}</div>
        ) : !listData?.sessions.length ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <Radio className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">{td('Aucune session live active', 'No active live sessions')}</p>
            <p className="text-xs text-muted-foreground">{td('Hébergez ou rejoignez une session!', 'Host or join a session!')}</p>
          </div>
        ) : (
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-3">
            {listData.sessions.map(s => (
              <motion.div key={s.id} variants={itemVariants}>
                <div className="p-4 rounded-xl border border-border/50 bg-card">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={s.host.avatar || undefined} />
                      <AvatarFallback className="text-xs font-bold">{s.host.name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{s.host.name}</span>
                        <div className="flex items-center gap-1 text-red-500"><div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /><span className="text-[10px] font-medium">LIVE</span></div>
                      </div>
                      <p className="text-xs text-muted-foreground">{s.viewerCount} {td('participants', 'participants')}</p>
                    </div>
                  </div>
                  <h3 className="font-semibold text-sm mb-3">{s.title}</h3>
                  <div className="flex gap-2">
                    {s.isHost ? (
                      <Button size="sm" className="flex-1 min-h-[44px]" onClick={() => setViewingSession(s.id)}>{td('Gérer', 'Manage')}</Button>
                    ) : (
                      <Button size="sm" className="flex-1 min-h-[44px] bg-red-500 hover:bg-red-600" onClick={() => joinSession.mutate(s.id)} disabled={joinSession.isPending}>
                        {joinSession.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Play className="h-3.5 w-3.5 mr-1" />{td('Rejoindre', 'Join')}</>}
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </main>
      <BottomNav />
    </SwipeToGoBack>
  )
}