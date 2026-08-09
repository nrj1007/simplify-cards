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

describe("/api/ask Route Handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAskCache();
    vi.mocked(getAskResultCacheStatus).mockReturnValue(undefined);
    vi.mocked(resolveDirectCardDetailQuery).mockReturnValue(null);
    vi.mocked(setAskResultCacheStatus).mockImplementation((result) => result);
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
