import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getOrCreateSessionId, trackEvent } from "../lib/analytics-client";

type StorageMap = Map<string, string>;

function createLocalStorage() {
  const store: StorageMap = new Map();

  return {
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
    removeItem(key: string) {
      store.delete(key);
    },
    clear() {
      store.clear();
    }
  };
}

describe("analytics client helper", () => {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const originalNavigator = globalThis.navigator;
  const originalFetch = globalThis.fetch;
  const originalLocalStorage = globalThis.localStorage;
  const originalClientAnalytics = process.env.NEXT_PUBLIC_SC_CLIENT_ANALYTICS;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal("window", { innerWidth: 1280 });
    vi.stubGlobal("document", { referrer: "http://localhost/ask" });
    vi.stubGlobal("localStorage", createLocalStorage());
  });

  afterEach(() => {
    if (originalWindow === undefined) delete (globalThis as Record<string, unknown>).window;
    else vi.stubGlobal("window", originalWindow);

    if (originalDocument === undefined) delete (globalThis as Record<string, unknown>).document;
    else vi.stubGlobal("document", originalDocument);

    if (originalNavigator === undefined) delete (globalThis as Record<string, unknown>).navigator;
    else vi.stubGlobal("navigator", originalNavigator);

    if (originalFetch === undefined) delete (globalThis as Record<string, unknown>).fetch;
    else vi.stubGlobal("fetch", originalFetch);

    if (originalLocalStorage === undefined) delete (globalThis as Record<string, unknown>).localStorage;
    else vi.stubGlobal("localStorage", originalLocalStorage);

    if (originalClientAnalytics === undefined) delete process.env.NEXT_PUBLIC_SC_CLIENT_ANALYTICS;
    else process.env.NEXT_PUBLIC_SC_CLIENT_ANALYTICS = originalClientAnalytics;
  });

  it("creates and reuses a stable anonymous session id", () => {
    const first = getOrCreateSessionId();
    const second = getOrCreateSessionId();

    expect(first).toBeTruthy();
    expect(second).toBe(first);
  });

  it("falls back to fetch when sendBeacon does not accept the event", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchSpy);
    vi.stubGlobal("navigator", {
      sendBeacon: vi.fn(() => false)
    });

    trackEvent({
      event_name: "ask_query_submitted",
      page: "ask",
      source: "ask",
      query: "axis atlas"
    });

    await Promise.resolve();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("allows client analytics to be explicitly disabled", async () => {
    process.env.NEXT_PUBLIC_SC_CLIENT_ANALYTICS = "0";
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchSpy);
    vi.stubGlobal("navigator", {
      sendBeacon: vi.fn(() => false)
    });

    trackEvent({
      event_name: "card_detail_viewed",
      page: "cards/[id]",
      source: "details",
      card_id: "hdfc-infinia-metal"
    });

    await Promise.resolve();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
