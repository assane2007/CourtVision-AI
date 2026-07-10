'use client'

import { useState, useRef, useEffect } from 'react'
import { useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Heart, MessageCircle, Share2, Plus, Loader2,
  Trophy, Dumbbell, Video, Award,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { useNavigation } from '@/stores/navigation'
import { SwipeToGoBack } from '@/components/shared/swipe-back'
import { apiFetch } from '@/lib/utils'
import { containerVariants, itemVariants } from '@/lib/animations'
import { BottomNav } from '@/components/shared/bottom-nav'
import { useTranslation } from '@/components/providers/language-provider'
import { toast } from 'sonner'

interface PostPlayer {
  id: string; name: string; avatar: string | null; xpLevel: number
}
interface PostSession {
  id: string; totalScore: number; totalReps: number; totalDrills: number; totalDurationSec: number
}
interface FeedPost {
  id: string; content: string; type: string; imageUrls: string[]
  likesCount: number; commentsCount: number; isLiked: boolean
  createdAt: string; player: PostPlayer; session?: PostSession
}

const TYPE_ICONS: Record<string, typeof Trophy> = {
  workout: Dumbbell, achievement: Award, challenge: Trophy, video: Video,
}

export default function FeedScreen() {
  const { t, td, language } = useTranslation()
  const { goBack, navigate } = useNavigation()
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [newPost, setNewPost] = useState({ content: '', type: 'text' })
  const sentinelRef = useRef<HTMLDivElement>(null)

  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery<{
    posts: FeedPost[]; nextCursor: string | null
  }>({
    queryKey: ['feed'],
    queryFn: ({ pageParam }) => apiFetch(`/api/feed?limit=15${pageParam ? `&cursor=${pageParam}` : ''}`),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor || undefined,
    staleTime: 15_000,
  })

  const allPosts = data?.pages.flatMap(p => p.posts) || []

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage()
    }, { rootMargin: '200px' })
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const createPost = useMutation({
    mutationFn: () => fetch('/api/feed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPost),
    }).then(r => { if (!r.ok) return r.json().then(e => { throw new Error(e.error) }); return r.json() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      setShowCreate(false)
      setNewPost({ content: '', type: 'text' })
      toast.success(td('Post publié', 'Post published'))
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const toggleLike = useMutation({
    mutationFn: (postId: string) => fetch(`/api/feed/${postId}/like`, { method: 'POST' })
      .then(r => r.json()),
    onSuccess: (_, postId) => {
      queryClient.setQueriesData<{ pages: { posts: FeedPost[]; nextCursor: string | null }[] }>({ queryKey: ['feed'] }, (old) => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map(page => ({
            ...page,
            posts: page.posts.map(p => p.id === postId ? { ...p, isLiked: !p.isLiked, likesCount: p.isLiked ? p.likesCount - 1 : p.likesCount + 1 } : p),
          })),
        }
      })
    },
  })

  return (
    <SwipeToGoBack className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b">
        <div className="max-w-lg mx-auto flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={goBack} className="shrink-0" aria-label={t('action.back')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold flex-1">{td("Fil d'actualité", 'News Feed')}</h1>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button size="sm" className="min-h-[44px]"><Plus className="h-4 w-4 mr-1" />{td('Publier', 'Post')}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{td('Nouveau post', 'New post')}</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <Textarea value={newPost.content} onChange={e => setNewPost({ ...newPost, content: e.target.value })} placeholder={td('Quoi de neuf?', 'What\'s new?')} rows={4} />
                <div className="flex gap-2">
                  {(['text', 'workout', 'achievement', 'challenge'] as const).map(type => {
                    const Icon = TYPE_ICONS[type] || Trophy
                    return (
                      <button key={type} onClick={() => setNewPost({ ...newPost, type })}
                        aria-pressed={newPost.type === type}
                        className={`flex items-center gap-1.5 px-3 min-h-[44px] rounded-full text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${newPost.type === type ? 'bg-orange-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                        <Icon className="h-3.5 w-3.5" />{type === 'text' ? td('Texte', 'Text') : type === 'workout' ? td('Séance', 'Workout') : type === 'achievement' ? td('Succès', 'Achievement') : td('Défi', 'Challenge')}
                      </button>
                    )
                  })}
                </div>
                <Button className="w-full" onClick={() => createPost.mutate()} disabled={createPost.isPending || !newPost.content.trim()}>
                  {createPost.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : td('Publier', 'Post')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-4 pb-24">
        {isLoading ? (
          <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 rounded-xl border"><div className="flex items-center gap-3 mb-3"><Skeleton className="h-10 w-10 rounded-full" /><Skeleton className="h-4 w-24" /></div><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-2/3 mt-2" /></div>
          ))}</div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <p className="text-muted-foreground">{t('error.loadFailed')}</p>
            <Button variant="outline" onClick={() => refetch()}>{t('action.retry')}</Button>
          </div>
        ) : allPosts.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <MessageCircle className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">{td('Aucun post pour le moment', 'No posts yet')}</p>
            <p className="text-xs text-muted-foreground">{td('Soyez le premier à publier!', 'Be the first to post!')}</p>
          </div>
        ) : (
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-4">
            {allPosts.map(post => {
              const TypeIcon = TYPE_ICONS[post.type] || Trophy
              return (
                <motion.div key={post.id} variants={itemVariants}>
                  <div className="p-4 rounded-xl border border-border/50 bg-card">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar className="h-10 w-10 cursor-pointer" onClick={() => navigate('profile-other')} aria-label={td('Voir le profil', 'View profile')}>
                        <AvatarImage src={post.player.avatar || undefined} />
                        <AvatarFallback className="text-xs font-bold">{post.player.name.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{post.player.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{td('Niv.', 'Lv.')}{post.player.xpLevel}</span>
                          <span>•</span>
                          <time>{new Date(post.createdAt).toLocaleDateString(language === 'en' ? 'en-US' : 'fr-FR', { day: '2-digit', month: '2-digit' })}</time>
                        </div>
                      </div>
                      {post.type !== 'text' && (
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          <TypeIcon className="h-3 w-3 mr-1" />{({ workout: td('Entraînement', 'Workout'), achievement: td('Succès', 'Achievement'), challenge: td('Défi', 'Challenge'), video: td('Vidéo', 'Video'), text: td('Publication', 'Post') } as Record<string, string>)[post.type] || post.type}
                        </Badge>
                      )}
                    </div>

                    {/* Content */}
                    <p className="text-sm whitespace-pre-wrap mb-3">{post.content}</p>

                    {/* Workout stats */}
                    {post.session && (
                      <div className="grid grid-cols-3 gap-2 mb-3 p-3 rounded-lg bg-muted/50">
                        <div className="text-center"><p className="text-lg font-bold">{post.session.totalScore}</p><p className="text-[10px] text-muted-foreground">{td('Score', 'Score')}</p></div>
                        <div className="text-center"><p className="text-lg font-bold">{post.session.totalReps}</p><p className="text-[10px] text-muted-foreground">{td('Répétitions', 'Reps')}</p></div>
                        <div className="text-center"><p className="text-lg font-bold">{post.session.totalDrills}</p><p className="text-[10px] text-muted-foreground">{td('Exercices', 'Exercises')}</p></div>
                      </div>
                    )}

                    {/* Images */}
                    {post.imageUrls.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 mb-3 rounded-lg overflow-hidden">
                        {post.imageUrls.slice(0, 4).map((url, i) => (
                          <div key={i} className={`${post.imageUrls.length === 1 ? 'col-span-2' : ''} aspect-square bg-muted`}>
                            <img src={url} alt={post.content?.substring(0, 100) || 'Photo de publication'} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-4 pt-2 border-t">
                      <button onClick={() => toggleLike.mutate(post.id)} aria-label={td("J'aime", 'Like')} className={`flex items-center gap-1.5 text-xs font-medium transition-colors min-h-[44px] ${post.isLiked ? 'text-red-500' : 'text-muted-foreground hover:text-foreground'}`}>
                        <Heart className={`h-4 w-4 ${post.isLiked ? 'fill-current' : ''}`} />
                        {post.likesCount > 0 && <span>{post.likesCount}</span>}
                      </button>
                      <button onClick={() => navigate('post-detail')} aria-label={td('Commentaire', 'Comment')} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors min-h-[44px]">
                        <MessageCircle className="h-4 w-4" />
                        {post.commentsCount > 0 && <span>{post.commentsCount}</span>}
                      </button>
                      <button aria-label={td('Partager', 'Share')} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors min-h-[44px]">
                        <Share2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )
            })}

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="py-4 text-center">
              {isFetchingNextPage && <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />}
            </div>
          </motion.div>
        )}
      </main>
      <BottomNav />
    </SwipeToGoBack>
  )
}