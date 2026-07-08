'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Users, Crown, Shield, Target,
  ChevronRight, LogOut,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'


import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { useNavigation } from '@/stores/navigation'
import { useAppStore } from '@/stores/app'
import { SwipeToGoBack } from '@/components/shared/swipe-back'
import { apiFetch } from '@/lib/utils'
import { containerVariants, itemVariants } from '@/lib/animations'
import { useTranslation } from '@/components/providers/language-provider'
import { toast } from 'sonner'

interface TeamMember {
  id: string; playerId: string; name: string; avatar: string | null
  xpLevel: number; position: string; role: string; joinedAt: string
}

interface TeamData {
  team: {
    id: string; name: string; description: string | null; logo: string | null
    isPublic: boolean; maxMembers: number; memberCount: number; totalXp: number
    avgLevel: number; members: TeamMember[]; leaderboard: Array<{
      playerId: string; name: string; avatar: string | null; xp: number
      xpLevel: number; position: string; role: string
    }>; challenges: Array<{ id: string; title: string; type: string; targetValue: number; unit: string }>
    createdAt: string
  }
}

export default function TeamDetailScreen() {
  const { t, td } = useTranslation()
  const { goBack } = useNavigation()
  const selectedDrillId = useAppStore(s => s.selectedDrillId)
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<'members' | 'leaderboard' | 'challenges'>('members')
  const [leaveConfirm, setLeaveConfirm] = useState(false)

  const { data, isLoading, isError } = useQuery<TeamData>({
    queryKey: ['team-detail', selectedDrillId],
    queryFn: () => apiFetch(`/api/teams/${selectedDrillId || 'none'}`),
    enabled: !!selectedDrillId,
    staleTime: 15_000,
  })

  const team = data?.team

  const leaveTeam = useMutation({
    mutationFn: () => fetch(`/api/teams/${selectedDrillId}/members`, { method: 'DELETE' })
      .then(r => { if (!r.ok) return r.json().then(e => { throw new Error(e.error) }); return r.json() }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['teams'] }); goBack(); toast.success(td("Vous avez quitté l'équipe", 'You left the team')) },
    onError: (e: Error) => toast.error(e.message),
  })

  const _removeMember = useMutation({
    mutationFn: (playerId: string) => fetch(`/api/teams/${selectedDrillId}/members?playerId=${playerId}`, { method: 'DELETE' })
      .then(r => { if (!r.ok) return r.json().then(e => { throw new Error(e.error) }); return r.json() }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['team-detail'] }); toast.success(td('Membre retiré', 'Member removed')) },
    onError: (e: Error) => toast.error(e.message),
  })

  if (!selectedDrillId) return <div className="min-h-screen bg-background" />

  return (
    <SwipeToGoBack className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b">
        <div className="max-w-lg mx-auto flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={goBack} className="shrink-0" aria-label={t('action.back')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate">{team?.name || td('Chargement...', 'Loading...')}</h1>
            {team && <p className="text-xs text-muted-foreground">{team.memberCount} {td('membres', 'members')}</p>}
          </div>
          {team && (
            <Button size="sm" variant="ghost" className="text-destructive h-8 text-xs" onClick={() => setLeaveConfirm(true)}>
              <LogOut className="h-3.5 w-3.5 mr-1" />{td('Quitter', 'Leave')}
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div className="max-w-lg mx-auto px-4 pb-3">
          <div className="flex gap-1 bg-muted rounded-xl p-1">
            {(['members', 'leaderboard', 'challenges'] as const).map(v => (
              <button key={v} onClick={() => setTab(v)}
                className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all ${tab === v ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}>
                {v === 'members' ? td('Membres', 'Members') : v === 'leaderboard' ? td('Classement', 'Rankings') : td('Défis', 'Challenges')}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-4 pb-24">
        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl border"><Skeleton className="h-10 w-10 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-16" /></div></div>
          ))}</div>
        ) : isError || !team ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <Users className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">{td('Équipe introuvable', 'Team not found')}</p>
            <Button variant="outline" onClick={goBack}>{td('Retour', 'Back')}</Button>
          </div>
        ) : (
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-4">
            {/* Team info card */}
            {team.description && (
              <motion.div variants={itemVariants} className="p-4 rounded-xl border bg-card">
                <p className="text-sm text-muted-foreground">{team.description}</p>
                <div className="flex gap-3 mt-3 text-xs text-muted-foreground">
                  <span>Xp total: {team.totalXp.toLocaleString()}</span>
                  <span>{td('Niv. moyen', 'Avg. level')}: {team.avgLevel}</span>
                </div>
              </motion.div>
            )}

            {tab === 'members' && (
              <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-2">
                {team.members.map(member => (
                  <motion.div key={member.id} variants={itemVariants}>
                    <div className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold shrink-0">
                        {member.avatar ? <img src={member.avatar} alt={member.name} className="w-full h-full rounded-full object-cover" /> : member.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{member.name}</span>
                          <Badge variant="outline" className="text-[10px]">Niv.{member.xpLevel}</Badge>
                          {member.role === 'owner' && <Crown className="h-3.5 w-3.5 text-amber-500" />}
                          {member.role === 'admin' && <Shield className="h-3.5 w-3.5 text-orange-500" />}
                        </div>
                        <p className="text-xs text-muted-foreground capitalize">{member.position}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {tab === 'leaderboard' && (
              <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-2">
                {team.leaderboard.map((entry, i) => (
                  <motion.div key={entry.playerId} variants={itemVariants}>
                    <div className={`flex items-center gap-3 p-3 rounded-xl border ${i === 0 ? 'border-amber-500/50 bg-amber-500/5' : 'border-border/50 bg-card'}`}>
                      <span className={`text-sm font-bold w-8 text-center ${i === 0 ? 'text-amber-500' : 'text-muted-foreground'}`}>{i + 1}</span>
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold shrink-0">
                        {entry.avatar ? <img src={entry.avatar} alt={entry.name} className="w-full h-full rounded-full object-cover" /> : entry.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium truncate">{entry.name}</span>
                        <p className="text-xs text-muted-foreground">Niv.{entry.xpLevel}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold">{entry.xp.toLocaleString()}</span>
                        <p className="text-[10px] text-muted-foreground">XP</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {tab === 'challenges' && (
              <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-2">
                {team.challenges.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-12 text-center">
                    <Target className="h-10 w-10 text-muted-foreground/50" />
                    <p className="text-muted-foreground text-sm">{td("Aucun défi d'équipe", 'No team challenges')}</p>
                  </div>
                ) : team.challenges.map(ch => (
                  <motion.div key={ch.id} variants={itemVariants}>
                    <div className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card">
                      <Target className="h-5 w-5 text-orange-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium truncate">{ch.title}</span>
                        <p className="text-xs text-muted-foreground">{ch.targetValue} {ch.unit}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </motion.div>
        )}
      </main>

      <AlertDialog open={leaveConfirm} onOpenChange={setLeaveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{td("Quitter l'équipe ?", 'Leave team?')}</AlertDialogTitle>
          <AlertDialogDescription>{td('Vous pourrez rejoindre à nouveau plus tard.', 'You can join again later.')}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{td('Annuler', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => leaveTeam.mutate()} className="bg-destructive text-white hover:bg-destructive/90">{td('Quitter', 'Leave')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SwipeToGoBack>
  )
}