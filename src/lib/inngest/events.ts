export type Events = {
  'video.processing.requested': {
    data: {
      videoId: string
      playerId: string
      sessionId?: string
      options?: {
        analyzePose?: boolean
        detectShots?: boolean
        generateHighlights?: boolean
      }
    }
  }
  'form.analysis.requested': {
    data: {
      videoId: string
      playerId: string
      drillId?: string
      frameData?: string
      drillName?: string
      category?: string
    }
  }
  'notification.send': {
    data: {
      playerId: string
      title: string
      body: string
      type: 'push' | 'in_app' | 'email'
      data?: Record<string, string | number | boolean>
    }
  }
  'export.generation.requested': {
    data: {
      videoId: string
      playerId: string
      format: 'mp4' | 'gif' | 'webm'
      quality: 'low' | 'medium' | 'high'
      annotations?: boolean
    }
  }
  'insight.refresh.requested': {
    data: {
      playerId: string
      force?: boolean
      insights?: string[]
    }
  }
  'player.welcome': {
    data: {
      playerId: string
      email: string
      name: string
    }
  }
  'player.weekly.report': {
    data: {
      playerId: string
    }
  }
  'session.stale.cleanup': {
    data: Record<string, never>
  }
}

declare module 'inngest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface InngestEvents extends Events {}
}