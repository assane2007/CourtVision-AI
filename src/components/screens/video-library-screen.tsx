'use client'

import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  Search,
  Upload,
  Grid3X3,
  List,
  SlidersHorizontal,
  Play,
  Eye,
  EyeOff,
  Trash2,
  Pencil,
  Share2,
  Clock,
  HardDrive,
  Film,
  MoreVertical,
  Loader2,
  X,
  ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { useNavigation } from '@/stores/navigation'
import { apiFetch, cn, formatLocaleDate } from '@/lib/utils'
import { toast } from 'sonner'
import { containerVariants, itemVariants } from '@/lib/animations'
import { BottomNav } from '@/components/shared/bottom-nav'
import { useTranslation } from '@/components/providers/language-provider'

interface VideoItem {
  id: string
  title: string
  description: string
  url: string
  thumbnailUrl: string | null
  durationSec: number
  fileSize: number
  mimeType: string
  width: number
  height: number
  isPublic: boolean
  viewCount: number
  tags: string
  createdAt: string
  _count: { annotations: number; highlights: number; exports: number }
}

function formatDuration(sec: number): string {
  if (!sec) return '—'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatFileSize(bytes: number): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

function parseTags(tagsStr: string): string[] {
  try {
    const parsed = JSON.parse(tagsStr)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export default function VideoLibraryScreen() {
  const { td } = useTranslation()
  const { goBack, navigate } = useNavigation()
  const queryClient = useQueryClient()

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [privacyFilter, setPrivacyFilter] = useState('all')
  const [tagFilter, setTagFilter] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<VideoItem | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  // Fetch videos
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, refetch } = useInfiniteQuery({
    queryKey: ['videos', search, sortBy, privacyFilter, tagFilter],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      params.set('sortBy', sortBy)
      if (privacyFilter !== 'all') params.set('privacy', privacyFilter)
      if (tagFilter) params.set('tag', tagFilter)
      if (pageParam) params.set('cursor', pageParam)
      return apiFetch<{
        videos: VideoItem[]
        nextCursor: string | null
        total: number
      }>(`/api/videos?${params.toString()}`)
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as string | undefined,
  })

  const allVideos = useMemo(() => data?.pages.flatMap((p) => p.videos) || [], [data])
  const total = data?.pages[0]?.total || 0

  // All unique tags across videos
  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    allVideos.forEach((v) => {
      parseTags(v.tags).forEach((tag) => tagSet.add(tag))
    })
    return Array.from(tagSet).sort()
  }, [allVideos])

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/videos/${id}`, { method: 'DELETE' }).then((res) => {
        if (!res.ok) return res.json().then((d) => { throw new Error(d.error) })
        return res.json()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos'] })
      toast.success(td('Vidéo supprimée', 'Video deleted'))
      setDeleteTarget(null)
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Erreur'),
  })

  const handleEdit = useCallback(
    (video: VideoItem) => {
      sessionStorage.setItem('editVideoId', video.id)
      navigate('video-player')
    },
    [navigate]
  )

  const handleShare = useCallback(async (video: VideoItem) => {
    try {
      const result = await apiFetch<{ url: string; embedCode: string }>(`/api/videos/${video.id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate-link' }),
      })
      await navigator.clipboard.writeText(result.url)
      toast.success(td('Lien copié !', 'Link copied!'))
    } catch {
      toast.error(td('Erreur lors du partage', 'Share error'))
    }
  }, [td])

  const handlePlay = useCallback(
    (videoId: string) => {
      sessionStorage.setItem('lastVideoId', videoId)
      navigate('video-player')
    },
    [navigate]
  )

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
          <Button variant="ghost" size="icon" onClick={goBack} aria-label={td('Retour', 'Back')} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold truncate">{td('Mes vidéos', 'My Videos')}</h1>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{total}</span>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            >
              {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(showFilters && 'text-orange-500')}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => navigate('video-upload')}>
              <Upload className="h-4 w-4 text-orange-500" />
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={td('Rechercher une vidéo...', 'Search for a video...')}
            className="pl-9 bg-muted/50"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <Card>
                <CardContent className="p-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1.5">{td('Trier par', 'Sort by')}</p>
                      <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="h-9 text-sm bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="createdAt">{td('Date', 'Date')}</SelectItem>
                          <SelectItem value="title">{td('Titre', 'Title')}</SelectItem>
                          <SelectItem value="durationSec">{td('Durée', 'Duration')}</SelectItem>
                          <SelectItem value="viewCount">{td('Vues', 'Views')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1.5">{td('Confidentialité', 'Privacy')}</p>
                      <Select value={privacyFilter} onValueChange={setPrivacyFilter}>
                        <SelectTrigger className="h-9 text-sm bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{td('Toutes', 'All')}</SelectItem>
                          <SelectItem value="public">{td('Publiques', 'Public')}</SelectItem>
                          <SelectItem value="private">{td('Privées', 'Private')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {allTags.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1.5">Tag</p>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge
                          variant={tagFilter === '' ? 'default' : 'outline'}
                          className="cursor-pointer text-xs"
                          onClick={() => setTagFilter('')}
                        >
                          {td('Tous', 'All')}
                        </Badge>
                        {allTags.map((tag) => (
                          <Badge
                            key={tag}
                            variant={tagFilter === tag ? 'default' : 'outline'}
                            className="cursor-pointer text-xs"
                            onClick={() => setTagFilter(tag === tagFilter ? '' : tag)}
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="aspect-video w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {isError && (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-sm text-destructive mb-3">{td('Erreur de chargement', 'Loading error')}</p>
              <Button variant="outline" onClick={() => refetch()}>
                {td('Réessayer', 'Retry')}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && !isError && allVideos.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 px-4 text-center"
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-muted mb-4">
              <Film className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">{td('Aucune vidéo', 'No videos')}</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs">
              {search
                ? td('Aucun résultat pour cette recherche', 'No results for this search')
                : td("Commencez par télécharger votre première vidéo d'entraînement", "Start by uploading your first training video")}
            </p>
            {!search && (
              <Button onClick={() => navigate('video-upload')} className="gap-2">
                <Upload className="h-4 w-4" />
                {td('Ajouter une vidéo', 'Add a video')}
              </Button>
            )}
          </motion.div>
        )}

        {/* Video Grid */}
        {!isLoading && !isError && allVideos.length > 0 && (
          <motion.div
            className={cn(
              viewMode === 'grid'
                ? 'grid grid-cols-2 sm:grid-cols-3 gap-3'
                : 'flex flex-col gap-3'
            )}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {allVideos.map((video) => {
              const tags = parseTags(video.tags)
              return (
                <motion.div key={video.id} variants={itemVariants}>
                  {viewMode === 'grid' ? (
                    <Card className="overflow-hidden group cursor-pointer" onClick={() => handlePlay(video.id)}>
                      <div className="relative aspect-video bg-muted">
                        {video.thumbnailUrl ? (
                          <img
                            src={video.thumbnailUrl}
                            alt={video.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Film className="h-8 w-8 text-muted-foreground/40" />
                          </div>
                        )}
                        {/* Duration badge */}
                        <div className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-[10px] font-medium px-1.5 py-0.5 rounded">
                          {formatDuration(video.durationSec)}
                        </div>
                        {/* Privacy badge */}
                        {!video.isPublic && (
                          <div className="absolute top-1.5 left-1.5">
                            <EyeOff className="h-3.5 w-3.5 text-white/80" />
                          </div>
                        )}
                        {/* Play overlay */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <div className="h-10 w-10 rounded-full bg-white/90 flex items-center justify-center">
                            <Play className="h-5 w-5 text-black ml-0.5" fill="black" />
                          </div>
                        </div>
                      </div>
                      <CardContent className="p-2.5">
                        <p className="text-sm font-medium truncate">{video.title}</p>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-0.5">
                            <Clock className="h-3 w-3" />
                            {formatLocaleDate(new Date(video.createdAt))}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <Eye className="h-3 w-3" />
                            {video.viewCount}
                          </span>
                        </div>
                        {tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {tags.slice(0, 2).map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-[9px] px-1.5 py-0">
                                {tag}
                              </Badge>
                            ))}
                            {tags.length > 2 && (
                              <span className="text-[9px] text-muted-foreground">+{tags.length - 2}</span>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="overflow-hidden cursor-pointer" onClick={() => handlePlay(video.id)}>
                      <div className="flex gap-3 p-3">
                        <div className="relative w-32 shrink-0 aspect-video rounded-lg overflow-hidden bg-muted">
                          {video.thumbnailUrl ? (
                            <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Film className="h-6 w-6 text-muted-foreground/40" />
                            </div>
                          )}
                          <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-1 py-0.5 rounded">
                            {formatDuration(video.durationSec)}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-medium truncate">{video.title}</p>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handlePlay(video.id)}>
                                    <Play className="h-4 w-4 mr-2" /> {td('Lire', 'Play')}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleEdit(video)}>
                                    <Pencil className="h-4 w-4 mr-2" /> {td('Modifier', 'Edit')}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleShare(video)}>
                                    <Share2 className="h-4 w-4 mr-2" /> {td('Partager', 'Share')}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setDeleteTarget(video)
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" /> {td('Supprimer', 'Delete')}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                            {video.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{video.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                            <span>{formatDuration(video.durationSec)}</span>
                            <span className="flex items-center gap-0.5">
                              <HardDrive className="h-3 w-3" />{formatFileSize(video.fileSize)}
                            </span>
                            <span className="flex items-center gap-0.5">
                              <Eye className="h-3 w-3" />{video.viewCount}
                            </span>
                            {!video.isPublic && <EyeOff className="h-3 w-3" />}
                            <span>{formatLocaleDate(new Date(video.createdAt))}</span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  )}
                </motion.div>
              )
            })}
          </motion.div>
        )}

        {/* Load More */}
        {hasNextPage && (
          <div className="flex justify-center pt-4">
            <Button
              variant="outline"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ChevronDown className="h-4 w-4 mr-2" />
              )}
              {td('Charger plus', 'Load more')}
            </Button>
          </div>
        )}
      </div>

      {/* Grid mode: show FAB for quick actions */}
      {viewMode === 'grid' && allVideos.length > 0 && (
        <div className="fixed bottom-20 right-4 z-30 md:right-8">
          <Button
            size="icon"
            className="h-12 w-12 rounded-full shadow-lg"
            onClick={() => navigate('video-upload')}
          >
            <Upload className="h-5 w-5" />
          </Button>
        </div>
      )}

      <BottomNav />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{td('Supprimer cette vidéo ?', 'Delete this video?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {td('sera définitivement supprimée. Cette action est irréversible.', 'will be permanently deleted. This action is irreversible.')}  &quot;{deleteTarget?.title}&quot;
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{td('Annuler', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {td('Supprimer', 'Delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}