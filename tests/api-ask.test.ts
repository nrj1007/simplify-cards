import { describe, expect, it, vi, beforeEach } from "vitest";
import { POST } from "../app/api/ask/route";
import { answerQuestion, buildFallbackSummary, getAskResultCacheStatus } from "../lib/ask-ai";
import { answerFromCards } from "../lib/recommend";

vi.mock("../lib/ask-ai", () => ({
  answerQuestion: vi.fn(),
  buildFallbackSummary: vi.fn(),
  getAskResultCacheStatus: vi.fn()
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
    vi.mocked(getAskResultCacheStatus).mockReturnValue(undefined);
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
    expect(data).toEqual(mockResult);
    expect(answerQuestion).toHaveBeenCalledWith(mockInput);
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
