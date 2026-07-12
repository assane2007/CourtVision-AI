'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Heart, MessageCircle, Share2, Plus, Loader2,
  Trophy, Dumbbell, Video, Award, ImagePlus, X,
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
import { staggerContainer, fadeInScale, cardHover } from '@/lib/animations'
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
  const [postImages, setPostImages] = useState<string[]>([]) // preview URLs
  const [postImageUrls, setPostImageUrls] = useState<string[]>([]) // uploaded URLs
  const [isUploadingImages, setIsUploadingImages] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Upload feed images to Supabase
  const handleImageSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    if (postImages.length + files.length > 4) {
      toast.error(td('Maximum 4 images', 'Maximum 4 images'))
      e.target.value = ''
      return
    }

    setIsUploadingImages(true)
    const newPreviews: string[] = []
    const newUrls: string[] = []

    for (const file of files) {
      const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
      if (!allowedTypes.has(file.type)) continue
      if (file.size > 10 * 1024 * 1024) {
        toast.error(td('Image trop volumineuse (max 10 Mo)', 'Image too large (max 10 MB)'))
        continue
      }

      // Create preview
      newPreviews.push(URL.createObjectURL(file))

      // Upload to server
      try {
        const formData = new FormData()
        formData.append('images', file)
        const res = await fetch('/api/upload/feed', { method: 'POST', body: formData })
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Upload failed' }))
          toast.error(err.error || 'Upload failed')
          newPreviews.pop()
          continue
        }
        const data = await res.json() as { urls: string[] }
        if (data.urls?.length > 0) {
          newUrls.push(data.urls[0])
        } else {
          newPreviews.pop()
        }
      } catch {
        toast.error(td('Erreur réseau', 'Network error'))
        newPreviews.pop()
      }
    }

    setPostImages(prev => [...prev, ...newPreviews])
    setPostImageUrls(prev => [...prev, ...newUrls])
    setIsUploadingImages(false)
    e.target.value = ''
  }, [postImages.length, td])

  const removePostImage = useCallback((index: number) => {
    setPostImages(prev => {
      const removed = prev[index]
      if (removed) URL.revokeObjectURL(removed)
      return prev.filter((_, i) => i !== index)
    })
    setPostImageUrls(prev => prev.filter((_, i) => i !== index))
  }, [])

  const resetPostForm = useCallback(() => {
    setNewPost({ content: '', type: 'text' })
    postImages.forEach(url => URL.revokeObjectURL(url))
    setPostImages([])
    setPostImageUrls([])
  }, [postImages])

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
      body: JSON.stringify({
        ...newPost,
        imageUrls: postImageUrls.length > 0 ? postImageUrls : undefined,
      }),
    }).then(r => { if (!r.ok) return r.json().then(e => { throw new Error(e.error) }); return r.json() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      setShowCreate(false)
      resetPostForm()
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
          <Dialog open={showCreate} onOpenChange={(open) => { if (!open) resetPostForm(); setShowCreate(open) }}>
            <DialogTrigger asChild>
              <Button size="sm" className="min-h-[44px]"><Plus className="h-4 w-4 mr-1" />{td('Publier', 'Post')}</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>{td('Nouveau post', 'New post')}</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <Textarea value={newPost.content} onChange={e => setNewPost({ ...newPost, content: e.target.value })} placeholder={td('Quoi de neuf?', 'What\'s new?')} rows={4} />

                {/* Image previews */}
                {postImages.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {postImages.map((url, i) => (
                      <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                        <img src={url} alt={td('Image du post', 'Post image')} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removePostImage(i)}
                          className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                          aria-label={td('Supprimer l\'image', 'Remove image')}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Action row: image upload + type selector */}
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    multiple
                    className="hidden"
                    onChange={handleImageSelect}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-[44px]"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={isUploadingImages || postImages.length >= 4}
                  >
                    {isUploadingImages ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                    <span className="ml-1.5">{td('Photo', 'Photo')}{postImages.length > 0 ? ` (${postImages.length}/4)` : ''}</span>
                  </Button>

                  <div className="flex gap-1.5">
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
                </div>

                <Button className="w-full" onClick={() => createPost.mutate()} disabled={createPost.isPending || isUploadingImages || !newPost.content.trim()}>
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
          <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-4">
            {allPosts.map(post => {
              const TypeIcon = TYPE_ICONS[post.type] || Trophy
              return (
                <motion.div key={post.id} variants={fadeInScale}>
                  <motion.div
                    {...cardHover}
                    className="p-4 rounded-xl border border-border/50 bg-card"
                  >
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar className="h-10 w-10 cursor-pointer" onClick={() => navigate('profile-other', post.player.id)} aria-label={td('Voir le profil', 'View profile')}>
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
                            <img src={url} alt={post.content?.substring(0, 100) || td('Photo de publication', 'Post photo')} className="w-full h-full object-cover" />
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
                      <button onClick={() => navigate('post-detail', post.id)} aria-label={td('Commentaire', 'Comment')} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors min-h-[44px]">
                        <MessageCircle className="h-4 w-4" />
                        {post.commentsCount > 0 && <span>{post.commentsCount}</span>}
                      </button>
                      <button aria-label={td('Partager', 'Share')} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors min-h-[44px]">
                        <Share2 className="h-4 w-4" />
                      </button>
                    </div>
                  </motion.div>
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