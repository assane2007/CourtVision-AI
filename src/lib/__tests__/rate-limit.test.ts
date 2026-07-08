import { describe, it, expect } from "vitest";
import { rateLimit } from "@/lib/rate-limit";

// Each test uses a unique key to avoid interference, but we also
// ensure the in-memory map is tested for independence.

describe("rateLimit", () => {
  it("returns success on first call", () => {
    const result = rateLimit("test:first-call");
    expect(result.success).toBe(true);
    expect(result.retryAfterMs).toBe(0);
  });

  it("allows multiple calls up to maxAttempts", () => {
    for (let i = 0; i < 9; i++) {
      const result = rateLimit("test:under-limit");
      expect(result.success).toBe(true);
    }
  });

  it("returns failure when rate limit exceeded", () => {
    const maxAttempts = 3;
    const windowMs = 60_000;
    for (let i = 0; i < maxAttempts; i++) {
      rateLimit("test:exceeded", maxAttempts, windowMs);
    }
    const result = rateLimit("test:exceeded", maxAttempts, windowMs);
    expect(result.success).toBe(false);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it("different keys are independent", () => {
    const maxAttempts = 2;
    // Exhaust key A
    for (let i = 0; i < maxAttempts; i++) {
      rateLimit("test:indep-a", maxAttempts, 60_000);
    }
    const aResult = rateLimit("test:indep-a", maxAttempts, 60_000);
    expect(aResult.success).toBe(false);

    // Key B should still work
    const bResult = rateLimit("test:indep-b", maxAttempts, 60_000);
    expect(bResult.success).toBe(true);
  });

  it("returns retryAfterMs of 0 on success", () => {
    const result = rateLimit("test:retry-zero");
    expect(result.retryAfterMs).toBe(0);
  });

  it("uses custom maxAttempts and windowMs", () => {
    // Only 1 attempt allowed
    rateLimit("test:custom-params", 1, 60_000);
    const second = rateLimit("test:custom-params", 1, 60_000);
    expect(second.success).toBe(false);
  });
});