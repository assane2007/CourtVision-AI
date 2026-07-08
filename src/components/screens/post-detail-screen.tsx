'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Heart, Send, Loader2, MessageCircle, Reply, ThumbsUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { useNavigation } from '@/stores/navigation'
import { useAppStore } from '@/stores/app'
import { SwipeToGoBack } from '@/components/shared/swipe-back'
import { apiFetch } from '@/lib/utils'
import { containerVariants, itemVariants } from '@/lib/animations'
import { useTranslation } from '@/components/providers/language-provider'
import { toast } from 'sonner'

interface PostPlayer { id: string; name: string; avatar: string | null; xpLevel: number }
interface PostSession { id: string; totalScore: number; totalReps: number; totalDrills: number; totalDurationSec: number }
interface PostData {
  post: {
    id: string; content: string; type: string; imageUrls: string[]
    likesCount: number; commentsCount: number; isLiked: boolean
    createdAt: string; player: PostPlayer; session?: PostSession
  }
}

interface CommentReply { id: string; content: string; createdAt: string; player: PostPlayer }
interface CommentItem {
  id: string; content: string; likesCount: number; createdAt: string; player: PostPlayer
  replies: CommentReply[]; totalReplies: number
}

export default function PostDetailScreen() {
  const { t } = useTranslation()
  const { goBack } = useNavigation()
  const selectedDrillId = useAppStore(s => s.selectedDrillId)
  const queryClient = useQueryClient()
  const [commentText, setCommentText] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const { data: postData, isLoading } = useQuery<PostData>({
    queryKey: ['post-detail', selectedDrillId],
    queryFn: () => apiFetch(`/api/feed/${selectedDrillId || 'none'}`),
    enabled: !!selectedDrillId,
  })

  const { data: commentsData, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery<{
    comments: CommentItem[]; nextCursor: string | null
  }>({
    queryKey: ['post-comments', selectedDrillId],
    queryFn: ({ pageParam }) => apiFetch(`/api/feed/${selectedDrillId}/comments?limit=20${pageParam ? `&cursor=${pageParam}` : ''}`),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor || undefined,
    enabled: !!selectedDrillId,
  })

  const post = postData?.post
  const allComments = commentsData?.pages.flatMap(p => p.comments) || []

  const toggleLike = useMutation({
    mutationFn: () => fetch(`/api/feed/${selectedDrillId}/like`, { method: 'POST' }).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['post-detail'] }),
  })

  const addComment = useMutation({
    mutationFn: () => fetch(`/api/feed/${selectedDrillId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: commentText, replyToId: replyingTo }),
    }).then(r => { if (!r.ok) return r.json().then(e => { throw new Error(e.error) }); return r.json() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post-comments'] })
      queryClient.invalidateQueries({ queryKey: ['post-detail'] })
      setCommentText('')
      setReplyingTo(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (!selectedDrillId) return <div className="min-h-screen bg-background" />

  return (
    <SwipeToGoBack className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b">
        <div className="max-w-lg mx-auto flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={goBack} className="shrink-0" aria-label={t('action.back')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold flex-1">Post</h1>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 pt-4 pb-20">
        {isLoading ? (
          <div className="space-y-4"><Skeleton className="h-10 w-10 rounded-full" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-2/3" /></div>
        ) : !post ? (
          <p className="text-center text-muted-foreground py-16">Post introuvable</p>
        ) : (
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-4">
            {/* Post content */}
            <motion.div variants={itemVariants} className="p-4 rounded-xl border bg-card">
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={post.player.avatar || undefined} />
                  <AvatarFallback className="text-xs font-bold">{post.player.name.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{post.player.name}</p>
                  <p className="text-xs text-muted-foreground">Niv.{post.player.xpLevel} • {new Date(post.createdAt).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>
              <p className="text-sm whitespace-pre-wrap mb-3">{post.content}</p>
              {post.session && (
                <div className="grid grid-cols-3 gap-2 mb-3 p-3 rounded-lg bg-muted/50">
                  <div className="text-center"><p className="text-lg font-bold">{post.session.totalScore}</p><p className="text-[10px] text-muted-foreground">Score</p></div>
                  <div className="text-center"><p className="text-lg font-bold">{post.session.totalReps}</p><p className="text-[10px] text-muted-foreground">Reps</p></div>
                  <div className="text-center"><p className="text-lg font-bold">{post.session.totalDrills}</p><p className="text-[10px] text-muted-foreground">Exercices</p></div>
                </div>
              )}
              <div className="flex items-center gap-4 pt-2 border-t">
                <button onClick={() => toggleLike.mutate()} className={`flex items-center gap-1.5 text-xs font-medium ${post.isLiked ? 'text-red-500' : 'text-muted-foreground'}`}>
                  <Heart className={`h-4 w-4 ${post.isLiked ? 'fill-current' : ''}`} />{post.likesCount}
                </button>
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <MessageCircle className="h-4 w-4" />{post.commentsCount}
                </span>
              </div>
            </motion.div>

            {/* Comments */}
            <div className="space-y-3">
              {allComments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Aucun commentaire</p>
              ) : allComments.map(comment => (
                <motion.div key={comment.id} variants={itemVariants} className="p-3 rounded-xl bg-card border border-border/50">
                  <div className="flex items-start gap-2.5">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={comment.player.avatar || undefined} />
                      <AvatarFallback className="text-[10px] font-bold">{comment.player.name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-medium">{comment.player.name}</span>
                        <span className="text-[10px] text-muted-foreground">{new Date(comment.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}</span>
                      </div>
                      <p className="text-sm">{comment.content}</p>

                      {/* Replies */}
                      {comment.replies.length > 0 && (
                        <div className="mt-2 pl-3 border-l-2 border-border/50 space-y-2">
                          {comment.replies.map(reply => (
                            <div key={reply.id} className="flex items-start gap-2">
                              <Avatar className="h-6 w-6 shrink-0">
                                <AvatarImage src={reply.player.avatar || undefined} />
                                <AvatarFallback className="text-[8px] font-bold">{reply.player.name.charAt(0).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div>
                                <span className="text-xs font-medium">{reply.player.name}</span>
                                <p className="text-xs">{reply.content}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <button onClick={() => setReplyingTo(comment.id)} className="flex items-center gap-1 mt-1.5 text-[10px] text-muted-foreground hover:text-foreground">
                        <Reply className="h-3 w-3" />Répondre
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {isFetchingNextPage && <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />}
            <div ref={bottomRef} />
          </motion.div>
        )}
      </main>

      {/* Comment input */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-xl border-t pb-safe z-40">
        <div className="max-w-lg mx-auto flex items-center gap-2 px-4 py-3">
          {replyingTo && (
            <div className="flex items-center gap-1 bg-muted rounded-full px-2 py-0.5 text-[10px]">
              <Reply className="h-2.5 w-2.5" />
              <span>Réponse</span>
              <button onClick={() => setReplyingTo(null)} className="ml-1">✕</button>
            </div>
          )}
          <Textarea
            value={commentText}
            onChange={e => setCommentText(e.target.value)}
            placeholder={replyingTo ? 'Répondre...' : 'Commenter...'}
            className="min-h-[40px] max-h-24 resize-none text-sm"
            rows={1}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (commentText.trim()) addComment.mutate() } }}
          />
          <Button size="icon" className="shrink-0 h-9 w-9" onClick={() => addComment.mutate()} disabled={addComment.isPending || !commentText.trim()}>
            {addComment.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </SwipeToGoBack>
  )
}