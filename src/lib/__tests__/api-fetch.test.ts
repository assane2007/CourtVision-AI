import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { apiFetch } from "@/lib/utils";

function mockFetchResponse(status: number, body?: unknown) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    headers: new Headers(),
  } as Response);
}

describe("apiFetch", () => {
  let localStorageMock: Record<string, string>;

  beforeEach(() => {
    localStorageMock = {};

    // The source accesses `typeof window !== "undefined"` and then
    // directly calls `localStorage.getItem(...)`. In Node (vitest),
    // neither `window` nor `localStorage` exist by default.
    // We stub both so the branch is entered and `localStorage` resolves.
    vi.stubGlobal("window", globalThis.window ?? {});
    vi.stubGlobal("document", { cookie: "" });
    vi.stubGlobal("localStorage", {
      getItem: vi.fn((key: string) => localStorageMock[key] ?? null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("successful response returns parsed JSON", async () => {
    const data = { id: "123", name: "test" };
    vi.stubGlobal("fetch", vi.fn(() => mockFetchResponse(200, data)));

    const result = await apiFetch<{ id: string; name: string }>("/api/test");
    expect(result).toEqual(data);
    expect(fetch).toHaveBeenCalledWith("/api/test", undefined);
  });

  it("401 error throws body error message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => mockFetchResponse(401, { error: "Session expirée. Veuillez vous reconnecter." })),
    );

    await expect(apiFetch("/api/test")).rejects.toThrow(
      "Session expirée. Veuillez vous reconnecter.",
    );
  });

  it("404 error throws body error message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => mockFetchResponse(404, { error: "Ressource introuvable." })),
    );

    await expect(apiFetch("/api/test")).rejects.toThrow(
      "Ressource introuvable.",
    );
  });

  it("429 error throws body error message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => mockFetchResponse(429, { error: "Trop de requêtes. Veuillez patienter." })),
    );

    await expect(apiFetch("/api/test")).rejects.toThrow(
      "Trop de requêtes. Veuillez patienter.",
    );
  });

  it("500 error throws body error message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => mockFetchResponse(500, { error: "Erreur serveur. Veuillez réessayer plus tard." })),
    );

    await expect(apiFetch("/api/test")).rejects.toThrow(
      "Erreur serveur. Veuillez réessayer plus tard.",
    );
  });

  it("custom error message from response body is used (for non-special status codes)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => mockFetchResponse(422, { error: "Validation échouée" })),
    );

    await expect(apiFetch("/api/test")).rejects.toThrow("Validation échouée");
  });

  it("401 uses body error message when present", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => mockFetchResponse(401, { error: "Custom 401 msg" })),
    );

    await expect(apiFetch("/api/test")).rejects.toThrow(
      "Custom 401 msg",
    );
  });

  it("passes options through to fetch", async () => {
    vi.stubGlobal("fetch", vi.fn(() => mockFetchResponse(200, {})));

    await apiFetch("/api/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ foo: "bar" }),
    });

    const call = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toBe("/api/test");
    expect(call[1]?.method).toBe("POST");
  });

  it("error without body throws generic error", async () => {
    vi.stubGlobal("fetch", vi.fn(() => mockFetchResponse(500, undefined)));

    await expect(apiFetch("/api/test")).rejects.toThrow(
      "Cannot read properties of undefined",
    );
  });
});