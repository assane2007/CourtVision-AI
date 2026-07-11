'use client'

/**
 * React hook for Supabase Realtime subscriptions.
 *
 * @example
 * // Listen for new messages
 * useSupabaseRealtime('messages', {
 *   filter: `recipient_id=eq.${userId}`,
 *   onInsert: (msg) => setMessages(prev => [...prev, msg]),
 * })
 */

import { useEffect, useRef, useCallback } from 'react'
import { createClient } from './client'

type EventType = 'INSERT' | 'UPDATE' | 'DELETE' | '*'

interface RealtimeOptions {
  filter?: string
  onInsert?: (payload: Record<string, unknown>) => void
  onUpdate?: (payload: Record<string, unknown>) => void
  onDelete?: (payload: Record<string, unknown>) => void
  enabled?: boolean
}

export function useSupabaseRealtime(
  table: string,
  options: RealtimeOptions = {},
) {
  const { filter, onInsert, onUpdate, onDelete, enabled = true } = options
  const channelRef = useRef<ReturnType<ReturnType<typeof import('@/lib/supabase/client').createClient>['channel']> | null>(null)

  const cleanup = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.unsubscribe()
      channelRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!enabled) {
      cleanup()
      return
    }

    const supabase = createClient()
    if (!supabase) return

    const eventHandlers: Array<{ event: EventType; handler: (payload: Record<string, unknown>) => void }> = []

    if (onInsert) eventHandlers.push({ event: 'INSERT', handler: onInsert })
    if (onUpdate) eventHandlers.push({ event: 'UPDATE', handler: onUpdate })
    if (onDelete) eventHandlers.push({ event: 'DELETE', handler: onDelete })

    if (eventHandlers.length === 0) return

    const channel = supabase
      .channel(`realtime:${table}`)
      .on(
        'postgres_changes' as never,
        {
          event: '*',
          schema: 'public',
          table,
          filter,
        },
        (payload: Record<string, unknown>) => {
          const eventType = payload.eventType as string
          if (eventType === 'INSERT' && onInsert) onInsert(payload)
          else if (eventType === 'UPDATE' && onUpdate) onUpdate(payload)
          else if (eventType === 'DELETE' && onDelete) onDelete(payload)
        },
      )

    channel.subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        channelRef.current = channel
      }
      if (status === 'CHANNEL_ERROR') {
        console.error(`[Realtime] Channel error for ${table}`)
      }
    })

    return cleanup
  }, [table, filter, onInsert, onUpdate, onDelete, enabled, cleanup])
}