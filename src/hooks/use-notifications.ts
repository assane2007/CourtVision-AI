'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '@/lib/utils'

// Dummy VAPID key for client-side infrastructure
// In production, replace with a real VAPID public key from web-push
const DUMMY_VAPID_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkOs-GV3WVDRJxPO7TzLlBz0Fd3qEhPi3FvxeJ2D0Y'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export interface NotificationState {
  supported: boolean
  permission: NotificationPermission
  subscribed: boolean
  loading: boolean
}

export function useNotifications() {
  const [state, setState] = useState<NotificationState>({
    supported: false,
    permission: 'default',
    subscribed: false,
    loading: true,
  })

  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window
    const permission = supported ? Notification.permission : 'denied'
    setState({ supported, permission, subscribed: false, loading: true })

    if (!supported) {
      setState((s) => ({ ...s, loading: false }))
      return
    }

    // Check current subscription
    navigator.serviceWorker.ready.then(async (registration) => {
      const sub = await registration.pushManager.getSubscription()
      setState({ supported, permission, subscribed: !!sub, loading: false })
    }).catch(() => {
      setState((s) => ({ ...s, loading: false }))
    })
  }, [])

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!state.supported) return false

    const permission = await Notification.requestPermission()
    setState((s) => ({ ...s, permission }))

    if (permission !== 'granted') return false

    // After permission granted, try to subscribe
    return enableNotifications()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.supported])

  const enableNotifications = useCallback(async (): Promise<boolean> => {
    if (!state.supported) return false

    setState((s) => ({ ...s, loading: true }))

    try {
      const registration = await navigator.serviceWorker.ready
      const applicationServerKey = urlBase64ToUint8Array(DUMMY_VAPID_KEY)

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      })

      // Send subscription to server
      await apiFetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON()),
      })

      setState((s) => ({ ...s, subscribed: true, loading: false, permission: Notification.permission }))
      return true
    } catch (err) {
      console.warn('[useNotifications] Push subscription failed, falling back to local notifications:', err)
      // Graceful fallback — still mark as "subscribed" for local notification support
      setState((s) => ({ ...s, subscribed: false, loading: false }))
      return false
    }
  }, [state.supported])

  const disableNotifications = useCallback(async (): Promise<void> => {
    if (!state.supported) return

    setState((s) => ({ ...s, loading: true }))

    try {
      const registration = await navigator.serviceWorker.ready
      const sub = await registration.pushManager.getSubscription()

      if (sub) {
        // Tell server to remove subscription
        await apiFetch('/api/notifications/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => {})

        await sub.unsubscribe()
      }

      setState((s) => ({ ...s, subscribed: false, loading: false }))
    } catch {
      setState((s) => ({ ...s, loading: false }))
    }
  }, [state.supported])

  return {
    ...state,
    requestPermission,
    enableNotifications,
    disableNotifications,
  }
}