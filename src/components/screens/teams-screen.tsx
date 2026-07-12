'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Plus, Users, ChevronRight, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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

interface Team {
  id: string; name: string; description: string | null; logo: string | null
  isPublic: boolean; maxMembers: number; memberCount: number; challengeCount: number
  owner: { id: string; name: string; avatar: string | null }
  createdAt: string
}

export default function TeamsScreen() {
  const { t, td } = useTranslation()
  const { goBack, navigate } = useNavigation()
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', description: '' })
  const [tab, setTab] = useState<'all' | 'my'>('all')

  const { data, isLoading, isError, refetch } = useQuery<{ teams: Team[] }>({
    queryKey: ['teams', tab],
    queryFn: () => apiFetch(`/api/teams?${tab === 'my' ? 'my=true' : ''}`),
    staleTime: 30_000,
  })

  const createTeam = useMutation({
    mutationFn: () => fetch('/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    }).then(r => { if (!r.ok) return r.json().then(e => { throw new Error(e.error) }); return r.json() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      setShowCreate(false)
      setForm({ name: '', description: '' })
      toast.success(td('Équipe créée', 'Team created'))
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const _joinTeam = useMutation({
    mutationFn: (teamId: string) => fetch(`/api/teams/${teamId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }).then(r => { if (!r.ok) return r.json().then(e => { throw new Error(e.error) }); return r.json() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      toast.success(td("Vous avez rejoint l'équipe", 'You joined the team'))
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <SwipeToGoBack className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b">
        <div className="max-w-lg mx-auto flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={goBack} className="shrink-0" aria-label={t('action.back')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold flex-1">{td('Équipes', 'Teams')}</h1>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button size="sm" className="min-h-[44px]">
                <Plus className="h-4 w-4 mr-1" />{td('Créer', 'Create')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{td('Nouvelle équipe', 'New team')}</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div><Label htmlFor="team-name">{td('Nom', 'Name')}</Label><Input id="team-name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={td("Nom de l'équipe", 'Team name')} /></div>
                <div><Label htmlFor="team-desc">{td('Description', 'Description')}</Label><Textarea id="team-desc" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder={td('Description (optionnel)', 'Description (optional)')} rows={3} /></div>
                <Button className="w-full" onClick={() => createTeam.mutate()} disabled={createTeam.isPending || !form.name.trim()}>
                  {createTeam.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : td("Créer l'équipe", 'Create team')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="max-w-lg mx-auto px-4 pb-3">
          <div className="flex gap-1 bg-muted rounded-xl p-1">
            {(['all', 'my'] as const).map(v => (
              <button
                key={v}
                onClick={() => setTab(v)}
                className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all ${tab === v ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
              >
                {v === 'all' ? td('Découvrir', 'Discover') : td('Mes équipes', 'My teams')}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-4 pb-24">
        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-4 rounded-xl border">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <div className="flex-1 space-y-2"><Skeleton className="h-4 w-28" /><Skeleton className="h-3 w-20" /></div>
            </div>
          ))}</div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <Users className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">{t('error.loadFailed')}</p>
            <Button variant="outline" onClick={() => refetch()}>{t('action.retry')}</Button>
          </div>
        ) : !data?.teams.length ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <Users className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">{tab === 'my' ? td('Aucune équipe', 'No teams') : td('Aucune équipe publique', 'No public teams')}</p>
          </div>
        ) : (
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-3">
            {data.teams.map(team => (
              <motion.div key={team.id} variants={itemVariants}>
                <div
                  className="flex items-center gap-3 p-4 rounded-xl border border-border/50 bg-card cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => navigate('team-detail')}
                >
                  <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
                    {team.logo ? (
                      <img src={team.logo} alt={team.name} className="w-full h-full rounded-xl object-cover" />
                    ) : (
                      <Users className="h-6 w-6 text-orange-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm truncate">{team.name}</span>
                      {!team.isPublic && <Badge variant="outline" className="text-[10px]">{td('Privé', 'Private')}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{team.description || td('Aucune description', 'No description')}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{team.memberCount}/{team.maxMembers} {td('membres', 'members')}</span>
                      {team.challengeCount > 0 && <span>{team.challengeCount} {td('défis', 'challenges')}</span>}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
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