'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ArrowLeft, UserPlus, UserCheck, MessageCircle,
  MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useNavigation } from '@/stores/navigation';
import { useAppStore } from '@/stores/app';
import { SwipeToGoBack } from '@/components/shared/swipe-back';
import { apiFetch } from '@/lib/utils';
import { containerVariants, itemVariants } from '@/lib/animations';
import { useTranslation } from '@/components/providers/language-provider';
import { toast } from 'sonner';

interface PlayerProfile {
  id: string; name: string; bio: string; avatar: string | null; coverPhoto: string | null
  position: string; level: string; xp: number; xpLevel: number; city: string | null
  country: string; createdAt: string; sessions: Array<{ id: string; totalScore: number; totalReps: number; totalDrills: number; startedAt: string }>
}

interface FollowData {
  followersCount: number; followingCount: number
  followers: Array<{ playerId: string; name: string; avatar: string | null; xpLevel: number }>
  following: Array<{ playerId: string; name: string; avatar: string | null; xpLevel: number }>
}

interface FriendStatus { friendshipId: string | null; status: string; isRequester: boolean; createdAt: string | null }

export default function ProfileOtherScreen() {
  const { t, td } = useTranslation()
  const { goBack, navigate } = useNavigation()
  const selectedDrillId = useAppStore(s => s.selectedDrillId)
  const queryClient = useQueryClient()
  const [followTab, setFollowTab] = useState<'followers' | 'following'>('followers')

  const { data: profile, isLoading } = useQuery<PlayerProfile>({
    queryKey: ['player-profile', selectedDrillId],
    queryFn: () => apiFetch(`/api/player?id=${selectedDrillId}`),
    enabled: !!selectedDrillId,
    staleTime: 30_000,
  })

  const { data: friendStatus } = useQuery<FriendStatus>({
    queryKey: ['friend-status', selectedDrillId],
    queryFn: () => apiFetch(`/api/friends/${selectedDrillId}`),
    enabled: !!selectedDrillId,
    staleTime: 30_000,
  })

  const { data: isFollowing } = useQuery<{ isFollowing: boolean }>({
    queryKey: ['is-following', selectedDrillId],
    queryFn: () => apiFetch(`/api/follow?playerId=${selectedDrillId}`),
    enabled: !!selectedDrillId,
    staleTime: 15_000,
  })

  const { data: followData } = useQuery<FollowData>({
    queryKey: ['follow-list', selectedDrillId, followTab],
    queryFn: () => apiFetch(`/api/follow/${selectedDrillId}?type=${followTab}`),
    enabled: !!selectedDrillId,
    staleTime: 30_000,
  })

  const toggleFollow = useMutation({
    mutationFn: () => fetch('/api/follow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ followingId: selectedDrillId }),
    }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['is-following'] })
      queryClient.invalidateQueries({ queryKey: ['follow-list'] })
    },
  })

  const sendFriendRequest = useMutation({
    mutationFn: () => fetch('/api/friends', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientId: selectedDrillId }),
    }).then(r => { if (!r.ok) return r.json().then(e => { throw new Error(e.error) }); return r.json() }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['friend-status'] }); toast.success(td('Demande envoyée', 'Request sent')) },
    onError: (e: Error) => toast.error(e.message),
  })

  const startConvo = useMutation({
    mutationFn: () => fetch('/api/messages/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientId: selectedDrillId }),
    }).then(r => { if (!r.ok) return r.json().then(e => { throw new Error(e.error) }); return r.json() }),
    onSuccess: (d) => { useAppStore.getState().selectDrill(d.conversationId); navigate('conversation') },
    onError: (e: Error) => toast.error(e.message),
  })

  if (!selectedDrillId) return <div className="min-h-screen bg-background" />

  const p = profile
  const totalSessions = p?.sessions?.length || 0
  const totalXp = p?.xp || 0
  const avgScore = totalSessions > 0 ? Math.round(p!.sessions.reduce((s, ses) => s + ses.totalScore, 0) / totalSessions) : 0

  return (
    <SwipeToGoBack className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b">
        <div className="max-w-lg mx-auto flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={goBack} className="shrink-0" aria-label={t('action.back')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold truncate">{p?.name || td('Profil', 'Profile')}</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-4 pb-24">
        {isLoading ? (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-3">
              <Skeleton className="h-20 w-20 rounded-full" />
              <Skeleton className="h-5 w-32" />
            </div>
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        ) : !p ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <p className="text-muted-foreground">{td('Joueur introuvable', 'Player not found')}</p>
          </div>
        ) : (
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
            {/* Profile header */}
            <motion.div variants={itemVariants} className="flex flex-col items-center text-center">
              <Avatar className="h-20 w-20 mb-3">
                <AvatarImage src={p.avatar || undefined} />
                <AvatarFallback className="text-2xl font-bold">{p.name.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-bold">{p.name}</h2>
              <p className="text-sm text-muted-foreground capitalize">{p.position} • {td('Niv.', 'Lv.')}{p.xpLevel}</p>
              {p.city && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3" />{p.city}{p.country ? `, ${p.country}` : ''}
                </p>
              )}
              {p.bio && <p className="text-sm text-muted-foreground mt-2 max-w-xs">{p.bio}</p>}

              {/* Action buttons */}
              <div className="flex gap-2 mt-4">
                <Button size="sm" variant={isFollowing?.isFollowing ? 'outline' : 'default'} onClick={() => toggleFollow.mutate()}>
                  {isFollowing?.isFollowing ? <><UserCheck className="h-3.5 w-3.5 mr-1" />{td('Suivi', 'Following')}</> : <><UserPlus className="h-3.5 w-3.5 mr-1" />{td('Suivre', 'Follow')}</>}
                </Button>
                {friendStatus?.status === 'none' && (
                  <Button size="sm" variant="outline" onClick={() => sendFriendRequest.mutate()}>
                    <UserPlus className="h-3.5 w-3.5 mr-1" />{td('Ajouter', 'Add')}
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => startConvo.mutate()}>
                  <MessageCircle className="h-3.5 w-3.5 mr-1" />Message
                </Button>
              </div>
            </motion.div>

            {/* Stats */}
            <motion.div variants={itemVariants} className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-card border text-center">
                <p className="text-lg font-bold">{totalXp.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">XP</p>
              </div>
              <div className="p-3 rounded-xl bg-card border text-center">
                <p className="text-lg font-bold">{totalSessions}</p>
                <p className="text-[10px] text-muted-foreground">{td('Séances', 'Sessions')}</p>
              </div>
              <div className="p-3 rounded-xl bg-card border text-center">
                <p className="text-lg font-bold">{avgScore}</p>
                <p className="text-[10px] text-muted-foreground">{td('Score moy.', 'Avg score')}</p>
              </div>
            </motion.div>

            {/* Followers / Following */}
            <motion.div variants={itemVariants}>
              <div className="flex gap-1 bg-muted rounded-xl p-1 mb-3">
                <button onClick={() => setFollowTab('followers')} className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all ${followTab === 'followers' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}>
                  {td('Abonnés', 'Followers')} ({followData?.followersCount || 0})
                </button>
                <button onClick={() => setFollowTab('following')} className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all ${followTab === 'following' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}>
                  {td('Abonnements', 'Following')} ({followData?.followingCount || 0})
                </button>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto">
                {(followTab === 'followers' ? followData?.followers : followData?.following)?.map(item => (
                  <div key={item.playerId} className="flex items-center gap-3 p-2.5 rounded-xl bg-card border border-border/50">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={item.avatar || undefined} />
                      <AvatarFallback className="text-[10px] font-bold">{item.name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium flex-1 truncate">{item.name}</span>
                    <Badge variant="outline" className="text-[10px]">{td('Niv.', 'Lv.')}{item.xpLevel}</Badge>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </main>
    </SwipeToGoBack>
  )
}