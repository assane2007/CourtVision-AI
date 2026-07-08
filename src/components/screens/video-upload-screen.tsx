'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMutation } from '@tanstack/react-query'
import {
  ArrowLeft,
  Upload,
  X,
  FileVideo,
  ImagePlus,
  Loader2,
  Check,
  Tag,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { useNavigation } from '@/stores/navigation'
import { apiFetch, cn } from '@/lib/utils'
import { toast } from 'sonner'
import { containerVariants, itemVariants } from '@/lib/animations'
import { useTranslation } from '@/components/providers/language-provider'

const MAX_FILE_SIZE = 500 * 1024 * 1024 // 500 MB
const ALLOWED_EXTENSIONS = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.ogv']

export default function VideoUploadScreen() {
  const { td } = useTranslation()
  const { goBack, navigate } = useNavigation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const thumbInputRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [thumbnail, setThumbnail] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [isPublic, setIsPublic] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [thumbPreview, setThumbPreview] = useState<string | null>(null)

  // Upload file mutation
  const uploadMutation = useMutation({
    mutationFn: async (data: { file: File; thumbnail?: File }) => {
      const formData = new FormData()
      formData.append('file', data.file)
      if (data.thumbnail) formData.append('thumbnail', data.thumbnail)

      const xhr = new XMLHttpRequest()
      return new Promise<{ url: string; thumbnailUrl: string | null; size: number; mimeType: string }>(
        (resolve, reject) => {
          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              setUploadProgress(Math.round((e.loaded / e.total) * 100))
            }
          })
          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(JSON.parse(xhr.responseText))
            } else {
              try {
                const err = JSON.parse(xhr.responseText)
                reject(new Error(err.error || `Erreur ${xhr.status}`))
              } catch {
                reject(new Error(`Erreur ${xhr.status}`))
              }
            }
          })
          xhr.addEventListener('error', () => reject(new Error(td('Erreur réseau', 'Network error'))))
          xhr.open('POST', '/api/videos/upload')
          xhr.send(formData)
        }
      )
    },
  })

  // Create video metadata mutation
  const createMutation = useMutation({
    mutationFn: (data: {
      title: string
      description: string
      url: string
      thumbnailUrl: string | null
      fileSize: number
      mimeType: string
      tags: string[]
      isPublic: boolean
    }) => apiFetch<{ video: { id: string } }>('/api/videos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  })

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return

    if (selected.size > MAX_FILE_SIZE) {
      toast.error(td('Fichier trop volumineux (max 500 Mo)', 'File too large (max 500 MB)'))
      return
    }

    const ext = '.' + (selected.name.split('.').pop()?.toLowerCase() || '')
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      toast.error(`${td('Format non supporté. Formats:', 'Unsupported format. Formats:')} ${ALLOWED_EXTENSIONS.join(', ')}`)
      return
    }

    setFile(selected)
    if (!title) setTitle(selected.name.replace(/\.[^/.]+$/, ''))
    setUploadProgress(0)
  }, [title, td])

  const handleThumbnailSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return

    setThumbnail(selected)
    const reader = new FileReader()
    reader.onload = () => setThumbPreview(reader.result as string)
    reader.readAsDataURL(selected)
  }, [])

  const addTag = useCallback(() => {
    const tag = tagInput.trim().toLowerCase()
    if (tag && !tags.includes(tag) && tags.length < 10) {
      setTags((prev) => [...prev, tag])
      setTagInput('')
    }
  }, [tagInput, tags])

  const removeTag = useCallback((tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag))
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!file) {
      toast.error(td('Veuillez sélectionner une vidéo', 'Please select a video'))
      return
    }
    if (!title.trim()) {
      toast.error(td('Titre requis', 'Title required'))
      return
    }

    try {
      // Step 1: Upload file
      const uploadResult = await uploadMutation.mutateAsync({
        file,
        thumbnail: thumbnail || undefined,
      })

      // Step 2: Create video metadata
      const videoResult = await createMutation.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        url: uploadResult.url,
        thumbnailUrl: uploadResult.thumbnailUrl,
        fileSize: uploadResult.size,
        mimeType: uploadResult.mimeType,
        tags,
        isPublic,
      })

      toast.success(td('Vidéo ajoutée avec succès !', 'Video added successfully!'))
      navigate('video-player')
      // Store the video ID for the player screen to use
      sessionStorage.setItem('lastVideoId', videoResult.video.id)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : td('Erreur lors du téléchargement', 'Upload error'))
    }
  }, [file, title, description, thumbnail, tags, isPublic, uploadMutation, createMutation, navigate, td])

  const isSubmitting = uploadMutation.isPending || createMutation.isPending

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
          <Button variant="ghost" size="icon" onClick={goBack} aria-label={td('Retour', 'Back')} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold truncate">{td('Ajouter une vidéo', 'Add a video')}</h1>
        </div>
      </header>

      <motion.div
        className="mx-auto max-w-3xl px-4 py-4 space-y-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* File Upload Zone */}
        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'flex flex-col items-center justify-center p-8 cursor-pointer transition-colors',
                  'border-2 border-dashed rounded-none first:rounded-t-lg last:rounded-b-lg',
                  file ? 'border-orange-500/50 bg-orange-500/5' : 'border-muted-foreground/25 hover:border-orange-500/50 hover:bg-muted/50'
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,video/x-msvideo,video/x-matroska,video/ogg"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                {file ? (
                  <div className="flex flex-col items-center gap-3 w-full">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/10">
                      <FileVideo className="h-8 w-8 text-orange-500" />
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-sm truncate max-w-xs">{file.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        ${(file.size / (1024 * 1024)).toFixed(1)} {td('Mo', 'MB')} · {file.type.split('/')[1]?.toUpperCase() || td('Vidéo', 'Video')}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        setFile(null)
                        setUploadProgress(0)
                      }}
                    >
                      <X className="h-3 w-3 mr-1" /> Changer
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-sm">{td('Sélectionner une vidéo', 'Select a video')}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        MP4, WebM, MOV, AVI — Max 500 Mo
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Upload Progress */}
        <AnimatePresence>
          {uploadMutation.isPending && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                    <span className="text-sm font-medium">{td('Téléchargement...', 'Uploading...')}</span>
                    <span className="text-sm text-muted-foreground ml-auto">{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Thumbnail */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Miniature</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => thumbInputRef.current?.click()}
                >
                  <ImagePlus className="h-3.5 w-3.5 mr-1.5" />
                  Choisir
                </Button>
                <input
                  ref={thumbInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleThumbnailSelect}
                />
              </div>
              {thumbPreview ? (
                <div className="relative w-full aspect-video max-w-xs rounded-lg overflow-hidden bg-muted">
                  <img src={thumbPreview} alt="Miniature" className="w-full h-full object-cover" />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6"
                    onClick={() => {
                      setThumbnail(null)
                      setThumbPreview(null)
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">{td('La première image sera utilisée par défaut', 'First frame will be used by default')}</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Title */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardContent className="p-4 space-y-3">
              <Label htmlFor="video-title" className="text-sm font-medium">
                Titre <span className="text-orange-500">*</span>
              </Label>
              <Input
                id="video-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={td('Ex: Entraînement tir 3pts - 15/03', 'Ex: 3-point shooting drill - 03/15')}
                maxLength={200}
                className="bg-background"
              />
              <p className="text-xs text-muted-foreground text-right">{title.length}/200</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Description */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardContent className="p-4 space-y-3">
              <Label htmlFor="video-desc" className="text-sm font-medium">Description</Label>
              <Textarea
                id="video-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={td('Décrivez cette vidéo...', 'Describe this video...')}
                maxLength={2000}
                rows={3}
                className="bg-background resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">{description.length}/2000</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tags */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardContent className="p-4 space-y-3">
              <Label className="text-sm font-medium">
                <Tag className="h-3.5 w-3.5 inline mr-1.5" />
                Tags
              </Label>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addTag()
                    }
                  }}
                  placeholder="Ajouter un tag..."
                  className="bg-background"
                />
                <Button variant="outline" size="icon" onClick={addTag} disabled={!tagInput.trim()}>
                  <Sparkles className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button onClick={() => removeTag(tag)} className="hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {tags.length === 0 && (
                  <p className="text-xs text-muted-foreground">{td('Aucun tag ajouté', 'No tags added')}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Privacy */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isPublic ? (
                    <Eye className="h-5 w-5 text-orange-500" />
                  ) : (
                    <EyeOff className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="text-sm font-medium">{isPublic ? td('Vidéo publique', 'Public video') : td('Vidéo privée', 'Private video')}</p>
                    <p className="text-xs text-muted-foreground">
                      {isPublic ? td('Visible par tout le monde', 'Visible to everyone') : td('Uniquement pour vous', 'Only for you')}
                    </p>
                  </div>
                </div>
                <Switch checked={isPublic} onCheckedChange={setIsPublic} />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Submit Button */}
        <motion.div variants={itemVariants} className="pt-2 pb-4">
          <Button
            onClick={handleSubmit}
            disabled={!file || !title.trim() || isSubmitting}
            className="w-full h-12 text-base font-semibold"
            size="lg"
          >
            {isSubmitting ? (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            ) : (
              <Check className="h-5 w-5 mr-2" />
            )}
            {isSubmitting ? td('Enregistrement...', 'Saving...') : td('Enregistrer la vidéo', 'Save video')}
          </Button>
        </motion.div>
      </motion.div>
    </div>
  )
}