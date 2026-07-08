'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Target, Plus, Users, Loader2, Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useNavigation } from '@/stores/navigation'
import { SwipeToGoBack } from '@/components/shared/swipe-back'
import { apiFetch } from '@/lib/utils'
import { containerVariants, itemVariants } from '@/lib/animations'
import { BottomNav } from '@/components/shared/bottom-nav'
import { useTranslation } from '@/components/providers/language-provider'
import { toast } from 'sonner'

interface Challenge {
  id: string; title: string; description: string; type: string; targetValue: number
  unit: string; startDate: string; endDate: string; xpReward: number
  participantCount: number; isJoined: boolean; myProgress: number; isCompleted: boolean
  creator: { id: string; name: string; avatar: string | null }
  createdAt: string
}

type Tab = 'active' | 'upcoming' | 'completed' | 'my'

const TABS: { value: Tab; label: string }[] = [
  { value: 'active', label: 'En cours' },
  { value: 'upcoming', label: 'À venir' },
  { value: 'completed', label: 'Terminés' },
  { value: 'my', label: 'Mes défis' },
]

function getStatusBadge(ch: Challenge) {
  if (ch.isCompleted) return <Badge className="bg-green-600 text-white text-[10px]">Terminé</Badge>
  if (ch.isJoined) return <Badge className="bg-orange-500 text-white text-[10px]">En cours</Badge>
  const now = Date.now()
  if (new Date(ch.startDate) > new Date(now)) return <Badge variant="outline" className="text-[10px]">À venir</Badge>
  return null
}

export default function ChallengesScreen() {
  const { t, td } = useTranslation()
  const { goBack, navigate } = useNavigation()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('active')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', type: 'total_reps', targetValue: '100', unit: 'reps', startDate: '', endDate: '' })

  const { data, isLoading, isError, refetch } = useQuery<{ challenges: Challenge[] }>({
    queryKey: ['challenges', tab],
    queryFn: () => apiFetch(`/api/challenges?tab=${tab}`),
    staleTime: 30_000,
  })

  const createChallenge = useMutation({
    mutationFn: () => fetch('/api/challenges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    }).then(r => { if (!r.ok) return r.json().then(e => { throw new Error(e.error) }); return r.json() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challenges'] })
      setShowCreate(false)
      setForm({ title: '', description: '', type: 'total_reps', targetValue: '100', unit: 'reps', startDate: '', endDate: '' })
      toast.success(td('Défi créé', 'Challenge created'))
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const joinChallenge = useMutation({
    mutationFn: (id: string) => fetch(`/api/challenges/${id}/join`, { method: 'POST' })
      .then(r => { if (!r.ok) return r.json().then(e => { throw new Error(e.error) }); return r.json() }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['challenges'] }); toast.success(td('Défi rejoint!', 'Challenge joined!')) },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <SwipeToGoBack className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b">
        <div className="max-w-lg mx-auto flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={goBack} className="shrink-0" aria-label={t('action.back')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Target className="h-5 w-5 text-orange-500" />
          <h1 className="text-lg font-bold flex-1">Défis</h1>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8"><Plus className="h-4 w-4 mr-1" />Créer</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Nouveau défi</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div><Label>Titre</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ex: 100 tirs en une semaine" /></div>
                <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Détails du défi" rows={2} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Type</Label>
                    <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="total_reps">Répétitions</SelectItem>
                        <SelectItem value="drill_score">Score drill</SelectItem>
                        <SelectItem value="streak">Série</SelectItem>
                        <SelectItem value="speed">Vitesse</SelectItem>
                        <SelectItem value="custom">Personnalisé</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Objectif</Label><Input type="number" value={form.targetValue} onChange={e => setForm({ ...form, targetValue: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Début</Label><Input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} /></div>
                  <div><Label>Fin</Label><Input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} /></div>
                </div>
                <Button className="w-full" onClick={() => createChallenge.mutate()} disabled={createChallenge.isPending || !form.title.trim()}>
                  {createChallenge.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Créer le défi'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="max-w-lg mx-auto px-4 pb-3">
          <div className="flex gap-1 overflow-x-auto scrollbar-none">
            {TABS.map(t => (
              <button key={t.value} onClick={() => setTab(t.value)}
                className={`flex-1 py-2 px-3 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${tab === t.value ? 'bg-orange-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-4 pb-24">
        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 rounded-xl border"><Skeleton className="h-5 w-32 mb-2" /><Skeleton className="h-3 w-48" /><Skeleton className="h-3 w-24 mt-2" /></div>
          ))}</div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <Target className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">{t('error.loadFailed')}</p>
            <Button variant="outline" onClick={() => refetch()}>{t('action.retry')}</Button>
          </div>
        ) : !data?.challenges.length ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <Target className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">Aucun défi</p>
          </div>
        ) : (
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-3">
            {data.challenges.map(ch => {
              const progress = ch.isJoined ? Math.min(100, Math.round((ch.myProgress / ch.targetValue) * 100)) : 0
              return (
                <motion.div key={ch.id} variants={itemVariants}>
                  <div className="p-4 rounded-xl border border-border/50 bg-card">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Target className="h-5 w-5 text-orange-500 shrink-0" />
                        <h3 className="font-semibold text-sm truncate cursor-pointer hover:text-orange-500 transition-colors" onClick={() => navigate('challenge-detail')}>{ch.title}</h3>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">{getStatusBadge(ch)}</div>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{ch.description}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                      <span className="flex items-center gap-1"><Zap className="h-3 w-3" />{ch.xpReward} XP</span>
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" />{ch.participantCount}</span>
                      <span>{ch.targetValue} {ch.unit}</span>
                    </div>
                    {ch.isJoined && (
                      <div className="mb-3">
                        <div className="flex justify-between text-xs mb-1">
                          <span>{ch.myProgress}/{ch.targetValue} {ch.unit}</span>
                          <span>{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                    )}
                    {!ch.isJoined && tab === 'active' && (
                      <Button size="sm" className="w-full h-8 text-xs" onClick={() => joinChallenge.mutate(ch.id)} disabled={joinChallenge.isPending}>
                        {joinChallenge.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Rejoindre le défi'}
                      </Button>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </main>
      <BottomNav />
    </SwipeToGoBack>
  )
}