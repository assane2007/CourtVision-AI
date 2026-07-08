import { describe, it, expect } from "vitest";
import { formatDuration } from "@/lib/utils";

describe("formatDuration", () => {
  it("returns '—' for 0ms", () => {
    expect(formatDuration(0)).toBe("—");
  });

  it("returns '—' for negative values", () => {
    expect(formatDuration(-500)).toBe("—");
  });

  it("rounds 500ms down to '0s'", () => {
    expect(formatDuration(500)).toBe("0s");
  });

  it("formats 1500ms as '1s'", () => {
    expect(formatDuration(1500)).toBe("1s");
  });

  it("formats 30000ms as '30s'", () => {
    expect(formatDuration(30000)).toBe("30s");
  });

  it("formats 65000ms as '1min 5s'", () => {
    expect(formatDuration(65000)).toBe("1min 5s");
  });

  it("formats 120000ms as '2min 0s'", () => {
    expect(formatDuration(120000)).toBe("2min 0s");
  });
});