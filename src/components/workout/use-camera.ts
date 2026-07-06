'use client'

import { useState, useRef, useCallback, type RefObject } from 'react'

export interface UseCameraReturn {
  streamRef: React.RefObject<MediaStream | null>
  cameraError: string
  startCamera: () => Promise<void>
  stopCamera: () => void
}

export function useCamera(videoRef: RefObject<HTMLVideoElement | null>): UseCameraReturn {
  const [cameraError, setCameraError] = useState('')
  const streamRef = useRef<MediaStream | null>(null)

  const startCamera = useCallback(async (): Promise<void> => {
    setCameraError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      })
      streamRef.current = stream

      const video = videoRef.current
      if (!video) {
        stream.getTracks().forEach((t) => t.stop())
        const msg = 'Élément vidéo introuvable.'
        setCameraError(msg)
        throw new Error(msg)
      }

      video.srcObject = stream
      video.setAttribute('playsinline', '')
      video.muted = true

      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve()
        video.onerror = () => reject(new Error('Erreur de chargement vidéo'))
        setTimeout(() => reject(new Error('Timeout vidéo')), 10000)
      })

      try {
        await video.play()
      } catch (playErr) {
        if (process.env.NODE_ENV === 'development') console.warn('video.play() failed, retrying...', playErr)
        await new Promise((r) => setTimeout(r, 300))
        try {
          await video.play()
        } catch {
          const msg = 'Impossible de démarrer la vidéo. Réessayez.'
          stream.getTracks().forEach((t) => t.stop())
          setCameraError(msg)
          throw new Error(msg)
        }
      }
    } catch (err) {
      if (err instanceof Error && err.message === 'Élément vidéo introuvable.') {
        // Error already set above
        return
      }
      if (err instanceof Error && err.message === 'Impossible de démarrer la vidéo. Réessayez.') {
        // Error already set above
        return
      }
      const msg =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Caméra non autorisée. Veuillez autoriser l\'accès à la caméra dans les paramètres de votre navigateur.'
          : err instanceof DOMException && err.name === 'NotFoundError'
            ? 'Aucune caméra détectée sur cet appareil.'
            : err instanceof DOMException && err.name === 'NotReadableError'
              ? 'La caméra est déjà utilisée par une autre application.'
              : 'Impossible d\'accéder à la caméra. Vérifiez que votre appareil dispose d\'une caméra.'
      setCameraError(msg)
      throw new Error(msg)
    }
  }, [videoRef])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [])

  return { streamRef, cameraError, startCamera, stopCamera }
}