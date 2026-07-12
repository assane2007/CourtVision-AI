"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useRef, useState } from "react";

/**
 * Initializes the MediaPipe PoseLandmarker from CDN (pinned @0.10.18).
 * Cleans up the landmarker instance on unmount.
 */
export function useMediaPipe() {
  const poseLandmarkerRef = useRef<{ close?: () => void; detect?: (video: HTMLVideoElement, timestampMs: number) => any } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const vision = await import(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/+esm"
        );
        if (cancelled) return;

        const { PoseLandmarker, FilesetResolver } = vision;
        const filesetResolver = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm"
        );
        if (cancelled) return;

        poseLandmarkerRef.current = await PoseLandmarker.createFromOptions(
          filesetResolver,
          {
            baseOptions: {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
              delegate: "GPU",
            },
            runningMode: "VIDEO",
            numPoses: 1,
          }
        );

        if (process.env.NODE_ENV === "development") {
          console.warn("[CV] PoseLandmarker loaded");
        }
        setIsLoading(false);
      } catch (e) {
        if (!cancelled) {
          if (process.env.NODE_ENV === "development") {
            console.error("[CV] PoseLandmarker load error:", e);
          }
          setError("PoseLandmarker load error");
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
      poseLandmarkerRef.current?.close?.();
    };
  }, []);

  return { poseLandmarkerRef, isLoading, error } as const;
}