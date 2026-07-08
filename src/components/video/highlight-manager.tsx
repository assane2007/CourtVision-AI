'use client'

import { type RefObject } from 'react'
import { Loader2, Play, Sparkles, Star, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { formatTimeMs } from '@/components/video/video-types'
import type { Highlight } from '@/components/video/video-types'

interface HighlightManagerProps {
  videoRef: RefObject<HTMLVideoElement | null>
  highlights: Highlight[]
  currentTime: number
  isPlayingHighlights: boolean
  generateHighlights: {
    isPending: boolean
    mutate: () => void
  }
  createHighlight: {
    isPending: boolean
    mutate: (data: { title: string; startMs: number; endMs: number }) => void
  }
  highlightDialogOpen: boolean
  setHighlightDialogOpen: (open: boolean) => void
  hlStart: number
  setHlStart: (v: number) => void
  hlEnd: number
  setHlEnd: (v: number) => void
  hlTitle: string
  setHlTitle: (v: string) => void
  onPlayMontage: () => void
  td: (fr: string, en: string) => string
}

export function HighlightManager({
  videoRef,
  highlights,
  currentTime,
  isPlayingHighlights,
  generateHighlights,
  createHighlight,
  highlightDialogOpen,
  setHighlightDialogOpen,
  hlStart,
  setHlStart,
  hlEnd,
  setHlEnd,
  hlTitle,
  setHlTitle,
  onPlayMontage,
  td,
}: HighlightManagerProps) {
  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => generateHighlights.mutate()}
            disabled={generateHighlights.isPending}
            className="gap-1.5"
          >
            {generateHighlights.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            IA
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setHlStart(Math.round(currentTime * 1000))
              setHlEnd(Math.round(currentTime * 1000) + 5000)
              setHighlightDialogOpen(true)
            }}
            className="gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" /> {td('Manuel', 'Manual')}
          </Button>
        </div>
        {highlights.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={onPlayMontage}
            disabled={isPlayingHighlights}
            className="gap-1.5"
          >
            <Play className="h-3.5 w-3.5" /> {td('Montage', 'Montage')}
          </Button>
        )}
      </div>

      <ScrollArea className="max-h-72">
        <div className="space-y-2 pr-2">
          {highlights.length === 0 ? (
            <div className="text-center py-6">
              <Star className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{td('Aucun highlight', 'No highlights')}</p>
              <p className="text-xs text-muted-foreground mt-1">{td("Générez avec l'IA ou créez manuellement", 'Generate with AI or create manually')}</p>
            </div>
          ) : (
            highlights.map((hl) => (
              <Card
                key={hl.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => {
                  if (videoRef.current) videoRef.current.currentTime = hl.startMs / 1000
                }}
              >
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="h-10 w-16 rounded bg-muted flex items-center justify-center shrink-0">
                    <Play className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{hl.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatTimeMs(hl.startMs)} → {formatTimeMs(hl.endMs)}
                      {hl.score !== null && (
                        <span className="ml-2 text-orange-500">
                          {(hl.score * 100).toFixed(0)}%
                        </span>
                      )}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-[10px] shrink-0">
                    {hl.type === 'auto' ? td('IA', 'AI') : td('Manuel', 'Manual')}
                  </Badge>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Highlight Creation Dialog */}
      <Dialog open={highlightDialogOpen} onOpenChange={setHighlightDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{td('Créer un highlight', 'Create highlight')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{td('Titre', 'Title')}</Label>
              <Input
                value={hlTitle}
                onChange={(e) => setHlTitle(e.target.value)}
                placeholder={td('Ex: Super tir à 3 points', 'Ex: Great 3-point shot')}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{td('Début (ms)', 'Start (ms)')}</Label>
                <Input
                  type="number"
                  value={hlStart}
                  onChange={(e) => setHlStart(parseInt(e.target.value, 10) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label>{td('Fin (ms)', 'End (ms)')}</Label>
                <Input
                  type="number"
                  value={hlEnd}
                  onChange={(e) => setHlEnd(parseInt(e.target.value, 10) || 0)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHighlightDialogOpen(false)}>{td('Annuler', 'Cancel')}</Button>
            <Button
              onClick={() => createHighlight.mutate({ title: hlTitle || 'Highlight', startMs: hlStart, endMs: hlEnd })}
              disabled={!hlTitle.trim() || hlEnd <= hlStart || createHighlight.isPending}
            >
              {createHighlight.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {td('Créer', 'Create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}