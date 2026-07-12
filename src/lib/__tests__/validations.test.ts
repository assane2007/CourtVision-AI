import { describe, it, expect } from "vitest";
import {
  signupSchema,
  loginSchema,
  updateProfileSchema,
  getZodErrorMessage,
  checkoutSchema,
  settingsPatchSchema,
} from "@/lib/validations";

// ── signupSchema ────────────────────────────────────────────────────────

describe("signupSchema", () => {
  it("valid signup data passes", () => {
    const result = signupSchema?.safeParse({
      email: "user@example.com",
      password: "Password1",
      name: "John",
    });
    expect(result?.success)?.toBe(true);
  });

  it("rejects invalid email", () => {
    const result = signupSchema?.safeParse({
      email: "not-an-email",
      password: "Password1",
      name: "John",
    });
    expect(result?.success)?.toBe(false);
  });

  it("rejects password too short", () => {
    const result = signupSchema?.safeParse({
      email: "user@example.com",
      password: "Short1",
      name: "John",
    });
    expect(result?.success)?.toBe(false);
  });

  it("rejects password without uppercase", () => {
    const result = signupSchema?.safeParse({
      email: "user@example.com",
      password: "lowercase1",
      name: "John",
    });
    expect(result?.success)?.toBe(false);
  });

  it("rejects password without number", () => {
    const result = signupSchema?.safeParse({
      email: "user@example.com",
      password: "NoNumbers",
      name: "John",
    });
    expect(result?.success)?.toBe(false);
  });

  it("rejects missing required fields", () => {
    const result = signupSchema?.safeParse({});
    expect(result?.success)?.toBe(false);
  });

  it("rejects name too short", () => {
    const result = signupSchema?.safeParse({
      email: "user@example.com",
      password: "Password1",
      name: "J",
    });
    expect(result?.success)?.toBe(false);
  });
});

// ── loginSchema ─────────────────────────────────────────────────────────

describe("loginSchema", () => {
  it("valid login data passes", () => {
    const result = loginSchema?.safeParse({
      email: "user@example.com",
      password: "anypassword",
    });
    expect(result?.success)?.toBe(true);
  });

  it("rejects invalid email", () => {
    const result = loginSchema?.safeParse({
      email: "bad",
      password: "anypassword",
    });
    expect(result?.success)?.toBe(false);
  });

  it("rejects missing password", () => {
    const result = loginSchema?.safeParse({
      email: "user@example.com",
      password: "",
    });
    expect(result?.success)?.toBe(false);
  });
});

// ── updateProfileSchema ─────────────────────────────────────────────────

describe("updateProfileSchema", () => {
  it("valid profile update with name passes", () => {
    const result = updateProfileSchema?.safeParse({ name: "New Name" });
    expect(result?.success)?.toBe(true);
  });

  it("valid profile update with position passes", () => {
    const result = updateProfileSchema?.safeParse({ position: "guard" });
    expect(result?.success)?.toBe(true);
  });

  it("valid profile update with level passes", () => {
    const result = updateProfileSchema?.safeParse({ level: "advanced" });
    expect(result?.success)?.toBe(true);
  });

  it("valid profile update with goals passes", () => {
    const result = updateProfileSchema?.safeParse({ goals: "shooting" });
    expect(result?.success)?.toBe(true);
  });

  it("rejects invalid position", () => {
    const result = updateProfileSchema?.safeParse({ position: "goalie" });
    expect(result?.success)?.toBe(false);
  });

  it("rejects invalid level", () => {
    const result = updateProfileSchema?.safeParse({ level: "expert" });
    expect(result?.success)?.toBe(false);
  });

  it("allows empty object (all fields optional)", () => {
    const result = updateProfileSchema?.safeParse({});
    expect(result?.success)?.toBe(true);
  });
});

// ── checkoutSchema ──────────────────────────────────────────────────────

describe("checkoutSchema", () => {
  it("accepts 'pro'", () => {
    const result = checkoutSchema?.safeParse({ planId: "pro" });
    expect(result?.success)?.toBe(true);
  });

  it("accepts 'elite'", () => {
    const result = checkoutSchema?.safeParse({ planId: "elite" });
    expect(result?.success)?.toBe(true);
  });

  it("rejects invalid plan", () => {
    const result = checkoutSchema?.safeParse({ planId: "enterprise" });
    expect(result?.success)?.toBe(false);
  });

  it("rejects missing planId", () => {
    const result = checkoutSchema?.safeParse({});
    expect(result?.success)?.toBe(false);
  });
});

// ── settingsPatchSchema ─────────────────────────────────────────────────

describe("settingsPatchSchema", () => {
  it("valid patch with position passes", () => {
    const result = settingsPatchSchema?.safeParse({ position: "forward" });
    expect(result?.success)?.toBe(true);
  });

  it("rejects empty object", () => {
    const result = settingsPatchSchema?.safeParse({});
    expect(result?.success)?.toBe(false);
  });

  it("rejects invalid weeklyGoalSessions", () => {
    const result = settingsPatchSchema?.safeParse({ weeklyGoalSessions: 10 });
    expect(result?.success)?.toBe(false);
  });

  it("accepts valid language", () => {
    const result = settingsPatchSchema?.safeParse({ language: "en" });
    expect(result?.success)?.toBe(true);
  });

  it("rejects invalid language", () => {
    const result = settingsPatchSchema?.safeParse({ language: "de" });
    expect(result?.success)?.toBe(false);
  });
});

// ── getZodErrorMessage ──────────────────────────────────────────────────

describe("getZodErrorMessage", () => {
  it("returns first issue message", () => {
    const result = signupSchema?.safeParse({ email: "bad" });
    if (!result?.success) {
      expect(getZodErrorMessage(result?.error))?.toBeDefined();
      expect(typeof getZodErrorMessage(result?.error))?.toBe("string");
    }
  });
});