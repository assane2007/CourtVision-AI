'use client';
/**
 * React hook for file uploads to Supabase Storage.
 *
 * @example
 * // Upload a video
 * const { upload, progress, isUploading, error } = useUpload()
 * const result = await upload(file, { folder: 'videos', public: false })
 *
 * @example
 * // Upload an avatar
 * const result = await upload(file, { folder: 'avatars', public: true })
 */

import { useState, useCallback, useRef } from 'react';

interface UploadOptions {
  /** Storage folder (e.g., 'videos', 'avatars', 'thumbnails') */
  folder?: string
  /** Whether the file should be publicly accessible */
  public?: boolean
  /** Custom endpoint (default: /api/upload) */
  endpoint?: string
}

interface UploadResult {
  url: string
  path: string
  size: number
  type: string
}

interface UseUploadReturn {
  /** Upload a file, returns the result with URL */
  upload: (file: File, options?: UploadOptions) => Promise<UploadResult>
  /** Current upload progress (0-100) */
  progress: number
  /** Whether an upload is in progress */
  isUploading: boolean
  /** Last error message */
  error: string | null
  /** Clear the error state */
  clearError: () => void
}

export function useUpload(): UseUploadReturn {
  const [progress, setProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const upload = useCallback((file: File, options: UploadOptions = {}): Promise<UploadResult> => {
    const { folder = 'uploads', public: isPublic = false, endpoint = '/api/upload' } = options

    return new Promise((resolve, reject) => {
      // Cancel any previous upload
      if (abortRef.current) {
        abortRef.current.abort()
      }
      abortRef.current = new AbortController()

      setIsUploading(true)
      setProgress(0)
      setError(null)

      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', folder)
      formData.append('public', String(isPublic))

      const xhr = new XMLHttpRequest()

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100))
        }
      })

      xhr.addEventListener('load', () => {
        setIsUploading(false)
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result = JSON.parse(xhr.responseText) as UploadResult
            resolve(result)
          } catch {
            reject(new Error('Réponse invalide du serveur'))
          }
        } else {
          try {
            const err = JSON.parse(xhr.responseText)
            reject(new Error(err.error || `Erreur ${xhr.status}`))
          } catch {
            reject(new Error(`Erreur ${xhr.status}`))
          }
        }
      })

      xhr.addEventListener('error', () => {
        setIsUploading(false)
        reject(new Error('Erreur réseau'))
      })

      xhr.addEventListener('abort', () => {
        setIsUploading(false)
        reject(new Error('Upload annulé'))
      })

      xhr.open('POST', endpoint)
      xhr.send(formData)
    })
  }, [])

  const clearError = useCallback(() => setError(null), [])

  return { upload, progress, isUploading, error, clearError }
}