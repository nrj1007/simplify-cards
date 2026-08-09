import { describe, expect, it, vi, beforeEach } from "vitest";
import { POST } from "../app/api/ask/route";
import {
  answerQuestion,
  buildFallbackSummary,
  getAskResultCacheStatus,
  resolveDirectCardDetailQuery,
  setAskResultCacheStatus
} from "../lib/ask-ai";
import { clearAskCache } from "../lib/ask-cache";
import { clearAskBotSignals } from "../lib/ask-bot-signals";
import { clearAskRateLimit } from "../lib/ask-rate-limit";
import { logAnalyticsEvent } from "../lib/analytics-logs";
import { answerFromCards } from "../lib/recommend";

vi.mock("../lib/ask-ai", () => ({
  answerQuestion: vi.fn(),
  buildFallbackSummary: vi.fn(),
  getAskResultCacheStatus: vi.fn(),
  resolveDirectCardDetailQuery: vi.fn(),
  setAskResultCacheStatus: vi.fn((result) => result)
}));

vi.mock("../lib/recommend", async () => {
  const actual = await vi.importActual<typeof import("../lib/recommend")>("../lib/recommend");
  return {
    ...actual,
    answerFromCards: vi.fn()
  };
});

vi.mock("../lib/analytics-logs", () => ({
  logAnalyticsEvent: vi.fn()
}));

describe("/api/ask Route Handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAskCache();
    clearAskBotSignals();
    clearAskRateLimit();
    vi.mocked(getAskResultCacheStatus).mockReturnValue(undefined);
    vi.mocked(resolveDirectCardDetailQuery).mockReturnValue(null);
    vi.mocked(setAskResultCacheStatus).mockImplementation((result) => result);
    vi.mocked(logAnalyticsEvent).mockResolvedValue({} as any);
  });

  it("successfully returns the AI answer when answerQuestion resolves", async () => {
    const mockInput = { query: "best travel card" };
    const mockResult = { summary: "Mocked AI Summary", cards: [] };

    vi.mocked(answerQuestion).mockResolvedValue(mockResult as any);
    vi.mocked(getAskResultCacheStatus).mockReturnValue("HIT");

    const request = new Request("http://localhost/api/ask", {
      method: "POST",
      body: JSON.stringify(mockInput)
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(response.headers.get("X-Ask-Cache")).toBe("HIT");

    const data = await response.json();
    expect(data).toEqual({
      ...mockResult,
      analyticsMetadata: expect.objectContaining({
        ask_cache_hit: true,
        ask_cache_status: "HIT",
        result_count: 0
      })
    });
    expect(answerQuestion).toHaveBeenCalledWith(mockInput);
  });

  it("returns repeated normalized Ask API responses from cache before running the Ask engine", async () => {
    const mockResult = {
      summary: "Mocked travel cards",
      cards: [{ card: { id: "axis-atlas", name: "Axis Atlas" } }],
      meta: { intent: "top-cards" }
    };

    vi.mocked(answerQuestion).mockResolvedValue(mockResult as any);
    vi.mocked(getAskResultCacheStatus)
      .mockReturnValueOnce("MISS")
      .mockReturnValueOnce("MISS")
      .mockReturnValueOnce("HIT")
      .mockReturnValueOnce("HIT");

    const first = await POST(
      new Request("http://localhost/api/ask", {
        method: "POST",
        body: JSON.stringify({ query: " Best   Travel Card " })
      })
    );
    const second = await POST(
      new Request("http://localhost/api/ask", {
        method: "POST",
        body: JSON.stringify({ query: "best travel card" })
      })
    );

    expect(first.headers.get("X-Ask-Cache")).toBe("MISS");
    expect(second.headers.get("X-Ask-Cache")).toBe("HIT");
    expect(answerQuestion).toHaveBeenCalledTimes(1);
    expect(setAskResultCacheStatus).toHaveBeenCalledWith(expect.objectContaining({ summary: "Mocked travel cards" }), "HIT");
  });

  it("logs suspicious Ask bot signals without blocking the request", async () => {
    const mockResult = {
      summary: "Mocked answer",
      cards: [{ card: { id: "axis-atlas", name: "Axis Atlas" } }],
      meta: { intent: "top-cards" }
    };

    vi.mocked(answerQuestion).mockResolvedValue(mockResult as any);
    vi.mocked(getAskResultCacheStatus).mockReturnValue("MISS");

    const response = await POST(
      new Request("http://localhost/api/ask", {
        method: "POST",
        headers: {
          "x-forwarded-for": "203.0.113.30",
          "user-agent": "Mozilla/5.0 Chrome/120.0"
        },
        body: JSON.stringify({
          query:
            "Is the Smart Credit Card a good fit for me? with spend rs 75k+ with spend rs 25k-75k for travel for lounge access for low annual fee"
        })
      })
    );

    expect(response.status).toBe(200);
    expect(logAnalyticsEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event_name: "ask_bot_signal_detected",
        page: "api/ask",
        source: "ask",
        metadata: expect.objectContaining({
          bot_signal_action: "log",
          bot_signal_rules: expect.arrayContaining(["generated_query_pattern", "empty_referrer"]),
          bot_signal_ip_hash: expect.any(String),
          bot_signal_query_hash: expect.any(String),
          bot_signal_query_pattern_hash: expect.any(String),
          request_path: "/api/ask"
        })
      })
    );
    expect(answerQuestion).toHaveBeenCalledTimes(1);
  });

  it("rate limits an IP after 100 Ask requests in one day", async () => {
    const mockResult = {
      summary: "Mocked answer",
      cards: [{ card: { id: "axis-atlas", name: "Axis Atlas" } }],
      meta: { intent: "top-cards" }
    };

    vi.mocked(answerQuestion).mockResolvedValue(mockResult as any);
    vi.mocked(getAskResultCacheStatus).mockReturnValue("MISS");

    for (let index = 0; index < 100; index += 1) {
      const response = await POST(
        new Request("http://localhost/api/ask", {
          method: "POST",
          headers: { "x-forwarded-for": "203.0.113.10" },
          body: JSON.stringify({ query: `best travel card ${index}` })
        })
      );
      expect(response.status).toBe(200);
    }

    const blocked = await POST(
      new Request("http://localhost/api/ask", {
        method: "POST",
        headers: { "x-forwarded-for": "203.0.113.10" },
        body: JSON.stringify({ query: "another travel card" })
      })
    );

    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("X-Ask-Rate-Limit")).toBe("ip_daily_limit");
    await expect(blocked.json()).resolves.toMatchObject({ reason: "ip_daily_limit", limit: 100 });
    expect(logAnalyticsEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event_name: "ask_rate_limited",
        metadata: expect.objectContaining({
          rate_limit_reason: "ip_daily_limit",
          rate_limit_limit: 100
        })
      })
    );
  });

  it("rate limits the same query from one IP after 20 requests in one day", async () => {
    const mockResult = {
      summary: "Mocked answer",
      cards: [{ card: { id: "axis-atlas", name: "Axis Atlas" } }],
      meta: { intent: "top-cards" }
    };

    vi.mocked(answerQuestion).mockResolvedValue(mockResult as any);
    vi.mocked(getAskResultCacheStatus).mockReturnValue("MISS");

    for (let index = 0; index < 20; index += 1) {
      const response = await POST(
        new Request("http://localhost/api/ask", {
          method: "POST",
          headers: { "x-forwarded-for": "203.0.113.20" },
          body: JSON.stringify({ query: " Best   Travel Card " })
        })
      );
      expect(response.status).toBe(200);
    }

    const blocked = await POST(
      new Request("http://localhost/api/ask", {
        method: "POST",
        headers: { "x-forwarded-for": "203.0.113.20" },
        body: JSON.stringify({ query: "best travel card" })
      })
    );

    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("X-Ask-Rate-Limit")).toBe("ip_query_daily_limit");
    await expect(blocked.json()).resolves.toMatchObject({ reason: "ip_query_daily_limit", limit: 20 });
    expect(logAnalyticsEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event_name: "ask_rate_limited",
        metadata: expect.objectContaining({
          rate_limit_reason: "ip_query_daily_limit",
          rate_limit_limit: 20
        })
      })
    );
  });

  it("returns a direct-card redirect instruction without running the Ask engine", async () => {
    const mockInput = { query: "Axis Atlas" };
    vi.mocked(resolveDirectCardDetailQuery).mockReturnValue("axis-atlas");

    const request = new Request("http://localhost/api/ask", {
      method: "POST",
      body: JSON.stringify(mockInput)
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("X-Ask-Cache")).toBe("SKIP");
    await expect(response.json()).resolves.toEqual({ directCardId: "axis-atlas" });
    expect(resolveDirectCardDetailQuery).toHaveBeenCalledWith(mockInput);
    expect(answerQuestion).not.toHaveBeenCalled();
  });

  it("returns database fallback when answerQuestion throws an error", async () => {
    const mockInput = { query: "best travel card" };
    const mockCardsResult = {
      cards: [{ card: { id: "test-card", name: "Test Card" } }]
    };

    vi.mocked(answerQuestion).mockRejectedValue(new Error("AI connection failed"));
    vi.mocked(answerFromCards).mockReturnValue(mockCardsResult as any);
    vi.mocked(buildFallbackSummary).mockReturnValue("Mocked Fallback Summary");

    const request = new Request("http://localhost/api/ask", {
      method: "POST",
      body: JSON.stringify(mockInput)
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.summary).toBe("Mocked Fallback Summary");
    expect(data.highlights).toContain("Database fallback (AI offline)");
    expect(data.meta.intent).toBe("unsupported");
    expect(answerFromCards).toHaveBeenCalledWith(mockInput);
    expect(buildFallbackSummary).toHaveBeenCalledWith(mockInput, mockCardsResult.cards);
  });

  it("handles malformed JSON request body gracefully", async () => {
    const mockCardsResult = {
      cards: []
    };

    vi.mocked(answerQuestion).mockRejectedValue(new Error("AI error"));
    vi.mocked(answerFromCards).mockReturnValue(mockCardsResult as any);
    vi.mocked(buildFallbackSummary).mockReturnValue("Fallback for empty query");

    const request = new Request("http://localhost/api/ask", {
      method: "POST",
      body: "not a json string"
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.summary).toBe("Fallback for empty query");
    expect(answerFromCards).toHaveBeenCalledWith({ query: "" });
  });

  it("returns double fallback when both answerQuestion and buildFallbackSummary/answerFromCards throw an error", async () => {
    const mockInput = { query: "best travel card" };

    vi.mocked(answerQuestion).mockRejectedValue(new Error("AI connection failed"));
    vi.mocked(answerFromCards).mockImplementation(() => {
      throw new Error("Local database scoring failed");
    });

    const request = new Request("http://localhost/api/ask", {
      method: "POST",
      body: JSON.stringify(mockInput)
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.summary).toContain("encountered an issue. Please try again later.");
    expect(data.cards).toEqual([]);
    expect(data.meta.intent).toBe("unsupported");
  });
});
