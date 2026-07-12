"use client";

import { useState, useRef, useCallback } from "react";
import { apiFetch } from "@/lib/utils";

const AI_COOLDOWN_MS = 10000;

/**
 * AI form check with 10-second cooldown.
 * Call `requestAICheck(frame, category, score)` to trigger an analysis.
 * Returns the latest feedback text and cooldown state.
 */
export function useAIFormCheck() {
  const [aiCooldown, setAiCooldown] = useState(false);
  const [aiFeedback, setAiFeedback] = useState("");

  // Ref to avoid stale closure in the timeout callback
  const cooldownRef = useRef(false);

  const requestAICheck = useCallback(
    async (
      frame: string,
      category: string,
      currentScore: number
    ): Promise<{ feedback: string; score: number } | null> => {
      if (cooldownRef.current) return null;

      cooldownRef.current = true;
      setAiCooldown(true);
      setAiFeedback("Analyse en cours...");

      try {
        const result = await apiFetch<{ feedback: string; score: number }>(
          "/api/ai/form-check",
          {
            method: "POST",
            body: JSON.stringify({
              frame,
              category,
              currentScore,
            }),
          }
        );
        setAiFeedback(result.feedback);
        return result;
      } catch {
        setAiFeedback("Erreur lors de l'analyse. Réessayez.");
        return null;
      } finally {
        setTimeout(() => {
          cooldownRef.current = false;
          setAiCooldown(false);
        }, AI_COOLDOWN_MS);
      }
    },
    []
  );

  return { aiFeedback, aiCooldown, requestAICheck } as const;
}