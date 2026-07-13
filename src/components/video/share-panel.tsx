'use client';
import { Loader2, MessageSquare, Link2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { VideoData } from '@/components/video/video-types';

interface SharePanelProps {
  video: VideoData
  shareMutation: {
    isPending: boolean
    mutate: (action: string) => void
  }
  deleteVideo: {
    isPending: boolean
    mutate: () => void
  }
  td: (fr: string, en: string) => string
}

export function SharePanel({
  video,
  shareMutation,
  deleteVideo,
  td,
}: SharePanelProps) {
  return (
    <>
      <Card>
        <CardContent className="p-4 space-y-3">
          <Button
            className="w-full gap-2 justify-start"
            variant="outline"
            onClick={() => shareMutation.mutate('generate-link')}
            disabled={shareMutation.isPending}
          >
            <Link2 className="h-4 w-4 text-orange-500" />
            {td('Copier le lien', 'Copy link')}
            <span className="ml-auto text-xs text-muted-foreground">
              {video.isPublic ? td('Public', 'Public') : td('Rend public', 'Make public')}
            </span>
          </Button>
          <Button
            className="w-full gap-2 justify-start"
            variant="outline"
            onClick={() => shareMutation.mutate('share-to-feed')}
            disabled={shareMutation.isPending}
          >
            <MessageSquare className="h-4 w-4 text-orange-500" />
            {td("Partager dans le fil d'actualité", 'Share in feed')}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/50">
        <CardContent className="p-4">
          <Button
            variant="ghost"
            className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
            onClick={() => {
              if (confirm(td('Supprimer cette vidéo ? Cette action est irréversible.', 'Delete this video? This action is irreversible.'))) {
                deleteVideo.mutate()
              }
            }}
            disabled={deleteVideo.isPending}
          >
            {deleteVideo.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            {td('Supprimer la vidéo', 'Delete video')}
          </Button>
        </CardContent>
      </Card>
    </>
  )
}