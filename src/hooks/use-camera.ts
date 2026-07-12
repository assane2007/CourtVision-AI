"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Manages the camera stream (user-facing).
 * Returns a video ref to attach to a <video> element.
 * Stops all tracks on unmount.
 */
export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCameraReady(true);
      } catch (err: unknown) {
        if (!cancelled) {
          if (process.env.NODE_ENV === "development") {
            console.error("[CV] Camera error:", err);
          }
          setCameraError(
            "Impossible d'accéder à la caméra. Vérifiez les permissions."
          );
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  return { videoRef, streamRef, cameraReady, cameraError } as const;
}