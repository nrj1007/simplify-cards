import { describe, expect, it, vi, beforeEach } from "vitest";
import { POST } from "../app/api/ask/route";
import { answerQuestion } from "../lib/ask-ai";
import { answerFromCards } from "../lib/recommend";

vi.mock("../lib/ask-ai", () => ({
  answerQuestion: vi.fn()
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
  });

  it("successfully returns the AI answer when answerQuestion resolves", async () => {
    const mockInput = { query: "best travel card" };
    const mockResult = { summary: "Mocked AI Summary", cards: [] };

    vi.mocked(answerQuestion).mockResolvedValue(mockResult as any);

    const request = new Request("http://localhost/api/ask", {
      method: "POST",
      body: JSON.stringify(mockInput)
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toEqual(mockResult);
    expect(answerQuestion).toHaveBeenCalledWith(mockInput);
  });

  it("returns database fallback when answerQuestion throws an error", async () => {
    const mockInput = { query: "best travel card" };
    const mockFallbackResult = {
      summary: "Deterministic Fallback",
      cards: [{ card: { name: "Test Card" } }]
    };

    vi.mocked(answerQuestion).mockRejectedValue(new Error("AI connection failed"));
    vi.mocked(answerFromCards).mockReturnValue(mockFallbackResult as any);

    const request = new Request("http://localhost/api/ask", {
      method: "POST",
      body: JSON.stringify(mockInput)
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.summary).toContain("encountered an error processing your query");
    expect(data.highlights).toContain("Database fallback (AI offline)");
    expect(data.meta.intent).toBe("unsupported");
    expect(answerFromCards).toHaveBeenCalledWith(mockInput);
  });

  it("handles malformed JSON request body gracefully", async () => {
    const mockFallbackResult = {
      summary: "Fallback for empty query",
      cards: []
    };

    vi.mocked(answerQuestion).mockRejectedValue(new Error("AI error"));
    vi.mocked(answerFromCards).mockReturnValue(mockFallbackResult as any);

    // Request with malformed JSON body
    const request = new Request("http://localhost/api/ask", {
      method: "POST",
      body: "not a json string"
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.summary).toContain("encountered an error processing your query");
    expect(answerFromCards).toHaveBeenCalledWith({ query: "" });
  });
});
