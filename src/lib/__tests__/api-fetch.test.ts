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
    expect(fetch).toHaveBeenCalledWith("/api/test", expect.objectContaining({
      headers: expect.any(Object),
    }));
  });

  it("401 error throws French session-expired message", async () => {
    vi.stubGlobal("fetch", vi.fn(() => mockFetchResponse(401)));

    await expect(apiFetch("/api/test")).rejects.toThrow(
      "Session expirée. Veuillez vous reconnecter.",
    );
  });

  it("404 error throws French not-found message", async () => {
    vi.stubGlobal("fetch", vi.fn(() => mockFetchResponse(404)));

    await expect(apiFetch("/api/test")).rejects.toThrow(
      "Ressource introuvable.",
    );
  });

  it("429 error throws French rate-limit message", async () => {
    vi.stubGlobal("fetch", vi.fn(() => mockFetchResponse(429)));

    await expect(apiFetch("/api/test")).rejects.toThrow(
      "Trop de requêtes. Veuillez patienter.",
    );
  });

  it("500 error throws French server-error message", async () => {
    vi.stubGlobal("fetch", vi.fn(() => mockFetchResponse(500)));

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

  it("401 overrides custom error message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => mockFetchResponse(401, { error: "Custom 401 msg" })),
    );

    // 401 always uses the hardcoded French message, ignoring body
    await expect(apiFetch("/api/test")).rejects.toThrow(
      "Session expirée. Veuillez vous reconnecter.",
    );
  });

  it("adds Bearer token when localStorage has session token", async () => {
    localStorageMock["nextauth.session-token"] = "abc123";
    vi.stubGlobal("fetch", vi.fn(() => mockFetchResponse(200, {})));

    await apiFetch("/api/test");

    const call = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const headers = call[1]?.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer abc123");
  });

  it("does not add Authorization header when no session token exists", async () => {
    vi.stubGlobal("fetch", vi.fn(() => mockFetchResponse(200, {})));

    await apiFetch("/api/test");

    const call = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const headers = call[1]?.headers as Record<string, string>;
    expect(headers["Authorization"]).toBeUndefined();
  });
});