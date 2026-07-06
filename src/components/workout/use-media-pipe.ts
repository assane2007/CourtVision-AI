'use client'

import { useState, useEffect, useRef } from 'react'

// Load MediaPipe via script tag (Turbopack doesn't support dynamic URL imports)
async function loadMediaPipe() {
  const win = window as unknown as Record<string, unknown>
  if (win.__mediapipe_vision__) return win.__mediapipe_vision__ as typeof import('@mediapipe/tasks-vision')

  return new Promise<typeof import('@mediapipe/tasks-vision')>((resolve, reject) => {
    const script = document.createElement('script')
    script.type = 'module'
    script.textContent = `
      import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/+esm').then(mod => {
        window.__mediapipe_vision__ = mod;
        window.__mediapipe_vision_ready__ = true;
        window.dispatchEvent(new Event('mediapipe-ready'));
      }).catch(err => {
        window.__mediapipe_vision_err__ = err;
        window.dispatchEvent(new Event('mediapipe-error'));
      });
    `
    document.head.appendChild(script)

    function onReady() {
      window.removeEventListener('mediapipe-ready', onReady)
      window.removeEventListener('mediapipe-error', onError)
      resolve(win.__mediapipe_vision__ as typeof import('@mediapipe/tasks-vision'))
    }
    function onError() {
      window.removeEventListener('mediapipe-ready', onReady)
      window.removeEventListener('mediapipe-error', onError)
      reject(win.__mediapipe_vision_err__ || new Error('Failed to load MediaPipe'))
    }
    window.addEventListener('mediapipe-ready', onReady)
    window.addEventListener('mediapipe-error', onError)
  })
}

export interface UseMediaPipeReturn {
  poseLandmarkerRef: React.RefObject<unknown>
  isModelLoaded: boolean
  error: string
}

export function useMediaPipe(): UseMediaPipeReturn {
  const [isModelLoaded, setIsModelLoaded] = useState(false)
  const [error, setError] = useState('')
  const poseLandmarkerRef = useRef<unknown>(null)

  useEffect(() => {
    let cancelled = false

    async function initMediaPipe() {
      try {
        const vision = await loadMediaPipe()
        if (cancelled) return

        const { PoseLandmarker, FilesetResolver } = vision

        const filesetResolver = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm',
        )
        if (cancelled) return

        poseLandmarkerRef.current = await PoseLandmarker.createFromOptions(
          filesetResolver,
          {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
              delegate: 'GPU',
            },
            runningMode: 'VIDEO',
            numPoses: 1,
          },
        )

        if (!cancelled) {
          setIsModelLoaded(true)
        }
      } catch (err) {
        if (!cancelled) {
          if (process.env.NODE_ENV === 'development') console.error('MediaPipe failed to load:', err)
          setError('Impossible de charger le modèle de détection de pose. Vérifiez votre connexion internet et réessayez.')
        }
      }
    }

    initMediaPipe()

    return () => {
      cancelled = true
    }
  }, [])

  return { poseLandmarkerRef, isModelLoaded, error }
}