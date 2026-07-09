'use client'

import { Eye } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { formatTime, formatFileSize } from '@/components/video/video-types'
import { formatLocaleDate } from '@/lib/utils'
import type { VideoData } from '@/components/video/video-types'

interface VideoInfoCardProps {
  video: VideoData
  td: (fr: string, en: string) => string
}

export function VideoInfoCard({ video, td }: VideoInfoCardProps) {
  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <h2 className="font-semibold">{video.title}</h2>
        {video.description && (
          <p className="text-sm text-muted-foreground">{video.description}</p>
        )}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-1">
          <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{video.viewCount} {td('vues', 'views')}</span>
          <span>{formatTime(video.durationSec)}</span>
          <span>{formatFileSize(video.fileSize)}</span>
          <span>{video.mimeType.split('/')[1]?.toUpperCase()}</span>
          <span>{formatLocaleDate(new Date(video.createdAt))}</span>
        </div>
      </CardContent>
    </Card>
  )
}