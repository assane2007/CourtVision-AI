import { describe, it, expect } from "vitest";
import { sanitize, sanitizeLong } from "@/lib/sanitize";

describe("sanitize", () => {
  it("returns the same string for normal text", () => {
    expect(sanitize("Hello, world!")).toBe("Hello, world!");
  });

  it("removes control characters (0x00-0x1F)", () => {
    expect(sanitize("hello\x00world")).toBe("helloworld");
    expect(sanitize("hello\x1Fworld")).toBe("helloworld");
  });

  it("removes DEL character (0x7F)", () => {
    expect(sanitize("hello\x7Fworld")).toBe("helloworld");
  });

  it("removes newlines, tabs, and carriage returns", () => {
    expect(sanitize("line1\nline2")).toBe("line1line2");
    expect(sanitize("col1\tcol2")).toBe("col1col2");
    expect(sanitize("text\rmore")).toBe("textmore");
  });

  it("truncates to 500 characters by default", () => {
    const long = "a".repeat(600);
    expect(sanitize(long)).toHaveLength(500);
  });

  it("preserves safe content under 500 chars", () => {
    const input = "This is a safe string with numbers 123 and symbols !@#$%^&*()";
    expect(sanitize(input)).toBe(input);
  });

  it("handles empty string", () => {
    expect(sanitize("")).toBe("");
  });

  it("handles string with only control characters", () => {
    expect(sanitize("\x00\x01\x02\x7F")).toBe("");
  });

  it("preserves unicode characters", () => {
    const input = "Bonjour ça va ? Émojis 🏀🔥";
    expect(sanitize(input)).toBe(input);
  });
});

describe("sanitizeLong", () => {
  it("truncates to custom maxLen", () => {
    const long = "x".repeat(3000);
    expect(sanitizeLong(long, 1000)).toHaveLength(1000);
  });

  it("uses default maxLen of 5000", () => {
    const long = "y".repeat(6000);
    expect(sanitizeLong(long)).toHaveLength(5000);
  });

  it("still removes control characters", () => {
    expect(sanitizeLong("test\x00value", 100)).toBe("testvalue");
  });
});