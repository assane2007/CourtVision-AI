'use client';
import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/utils';

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

function getNotificationSupport(): { supported: boolean; permission: NotificationPermission } {
  if (typeof window === 'undefined') return { supported: false, permission: 'denied' as NotificationPermission }
  const supported = 'serviceWorker' in navigator && 'PushManager' in window
  const permission = supported ? Notification.permission : ('denied' as NotificationPermission)
  return { supported, permission }
}

export function useNotifications() {
  const initialSupport = getNotificationSupport()
  const [supported] = useState(initialSupport.supported)
  const [permission, setPermission] = useState<NotificationPermission>(initialSupport.permission)
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(initialSupport.supported)

  useEffect(() => {
    if (!supported) return

    // Check current subscription (async — safe for effects)
    navigator.serviceWorker.ready.then(async (registration) => {
      const sub = await registration.pushManager.getSubscription()
      setSubscribed(!!sub)
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })
  }, [supported])

  const enableNotifications = useCallback(async (): Promise<boolean> => {
    if (!supported) return false

    setLoading(true)

    try {
      const registration = await navigator.serviceWorker.ready
      const applicationServerKey = urlBase64ToUint8Array(DUMMY_VAPID_KEY)

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as unknown as ArrayBuffer,
      })

      // Send subscription to server
      await apiFetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON()),
      })

      setSubscribed(true)
      setPermission(Notification.permission)
      setLoading(false)
      return true
    } catch (err) {
      console.warn('[useNotifications] Push subscription failed:', err)
      setSubscribed(false)
      setLoading(false)
      return false
    }
  }, [supported])

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!supported) return false

    const newPermission = await Notification.requestPermission()
    setPermission(newPermission)

    if (newPermission !== 'granted') return false

    // After permission granted, try to subscribe
    return enableNotifications()
  }, [supported, enableNotifications])

  const disableNotifications = useCallback(async (): Promise<void> => {
    if (!supported) return

    setLoading(true)

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

      setSubscribed(false)
      setLoading(false)
    } catch {
      setLoading(false)
    }
  }, [supported])

  const state: NotificationState = { supported, permission, subscribed, loading }

  return {
    ...state,
    requestPermission,
    enableNotifications,
    disableNotifications,
  }
}