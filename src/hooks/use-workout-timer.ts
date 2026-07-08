"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { playSound } from "@/lib/audio";

/* ─── Types ─── */
export type WorkoutPhase =
  | "idle"
  | "countdown"
  | "active"
  | "rest"
  | "paused"
  | "finished";

/* ─── Constants ─── */
const CD_SECONDS = 3;
const DEFAULT_REST_SECONDS = 15;

interface UseWorkoutTimerOptions {
  duration: number;
  restSeconds?: number;
  countdownSeconds?: number;
  /** Called when the active timer reaches 0 (before transitioning to rest). */
  onDrillComplete: (finalTimeLeft: number) => void;
  /** Called when rest timer reaches 0 or rest is skipped. */
  onRestComplete: () => void;
}

/**
 * Manages all workout phases: idle → countdown → active → rest → (repeat or finish).
 * Handles countdown timer, active drill timer, rest timer, pause/resume.
 * Plays audio cues at each transition.
 */
export function useWorkoutTimer({
  duration,
  restSeconds = DEFAULT_REST_SECONDS,
  countdownSeconds = CD_SECONDS,
  onDrillComplete,
  onRestComplete,
}: UseWorkoutTimerOptions) {
  const [phase, setPhase] = useState<WorkoutPhase>("idle");
  const [countdown, setCountdown] = useState(countdownSeconds);
  const [timeLeft, setTimeLeft] = useState(duration);
  const [restCount, setRestCount] = useState(restSeconds);

  // Refs for stable callbacks (avoid stale closures in intervals)
  const onDrillCompleteRef = useRef(onDrillComplete);
  const onRestCompleteRef = useRef(onRestComplete);
  const durationRef = useRef(duration);
  const restSecondsRef = useRef(restSeconds);
  const countdownSecondsRef = useRef(countdownSeconds);

  // Keep refs in sync without accessing them during render
  useEffect(() => {
    onDrillCompleteRef.current = onDrillComplete;
    onRestCompleteRef.current = onRestComplete;
    durationRef.current = duration;
    restSecondsRef.current = restSeconds;
    countdownSecondsRef.current = countdownSeconds;
  }, [onDrillComplete, onRestComplete, duration, restSeconds, countdownSeconds]);

  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const restIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ─── Actions ─── */

  const startCountdown = useCallback(() => {
    setCountdown(countdownSecondsRef.current);
    setPhase("countdown");
    playSound("countdown-tick");
  }, []);

  const startDrill = useCallback(() => {
    setTimeLeft(durationRef.current);
    setPhase("active");
  }, []);

  const pauseDrill = useCallback(() => {
    if (phase === "active") {
      setPhase("paused");
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  }, [phase]);

  const resumeDrill = useCallback(() => {
    if (phase === "paused") {
      setPhase("active");
      // The active timer effect will restart the interval automatically
    }
  }, [phase]);

  const finishDrill = useCallback(() => {
    // Cancel active timer if running
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    onDrillCompleteRef.current(timeLeft);
    setPhase("rest");
    setRestCount(restSecondsRef.current);
  }, [timeLeft]);

  const skipRest = useCallback(() => {
    if (restIntervalRef.current) {
      clearInterval(restIntervalRef.current);
      restIntervalRef.current = null;
    }
    onRestCompleteRef.current();
  }, []);

  /* ─── Countdown Effect ─── */
  useEffect(() => {
    if (phase !== "countdown") return;

    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownIntervalRef.current)
            clearInterval(countdownIntervalRef.current);
          playSound("countdown-go");
          // Transition to active
          setTimeLeft(durationRef.current);
          setPhase("active");
          return 0;
        }
        playSound("countdown-tick");
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, [phase]);

  /* ─── Active Timer Effect ─── */
  useEffect(() => {
    if (phase !== "active") return;

    timerIntervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
          }
          playSound("time-up");
          // Notify orchestrator, then transition to rest
          onDrillCompleteRef.current(0);
          setPhase("rest");
          setRestCount(restSecondsRef.current);
          return 0;
        }
        // Half-way warning
        if (prev === Math.floor(durationRef.current / 2) + 1) {
          playSound("half-warning");
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [phase]);

  /* ─── Rest Timer Effect ─── */
  useEffect(() => {
    if (phase !== "rest") return;

    restIntervalRef.current = setInterval(() => {
      setRestCount((prev) => {
        if (prev <= 1) {
          if (restIntervalRef.current) {
            clearInterval(restIntervalRef.current);
            restIntervalRef.current = null;
          }
          playSound("countdown-go");
          onRestCompleteRef.current();
          return restSecondsRef.current;
        }
        if (prev <= 3) playSound("rest-pulse");
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (restIntervalRef.current) {
        clearInterval(restIntervalRef.current);
        restIntervalRef.current = null;
      }
    };
  }, [phase]);

  return {
    phase,
    countdown,
    timeLeft,
    restCount,
    startCountdown,
    startDrill,
    pauseDrill,
    resumeDrill,
    skipRest,
    finishDrill,
  } as const;
}