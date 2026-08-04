import { afterEach, describe, expect, it, vi } from "vitest";
import { callAiWithSchemaDetailed, getActiveProvider } from "../lib/ai-provider";

const originalProvider = process.env.AI_PROVIDER;
const originalGeminiKey = process.env.GEMINI_API_KEY;
const originalFetch = global.fetch;

describe("getActiveProvider", () => {
  afterEach(() => {
    if (originalProvider === undefined) delete process.env.AI_PROVIDER;
    else process.env.AI_PROVIDER = originalProvider;
    if (originalGeminiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalGeminiKey;
    global.fetch = originalFetch;
  });

  it("parses plain gemini provider", () => {
    process.env.AI_PROVIDER = "gemini";
    expect(getActiveProvider()).toBe("gemini");
  });

  it("ignores inline comments in AI_PROVIDER", () => {
    process.env.AI_PROVIDER = 'gemini   # switch to "openai" to use OpenAI instead';
    expect(getActiveProvider()).toBe("gemini");
  });

  it("uses gemini even for unknown values", () => {
    process.env.AI_PROVIDER = "something-else";
    expect(getActiveProvider()).toBe("gemini");
  });

  it("returns provider trace when gemini succeeds", async () => {
    process.env.AI_PROVIDER = "openai";
    process.env.GEMINI_API_KEY = "test-gemini";
    global.fetch = vi.fn(async () =>
      ({
        ok: true,
        json: async () => ({
          candidates: [
            { content: { parts: [{ text: JSON.stringify({ value: "ok" }) }] } }
          ]
        })
      }) as unknown as Response
    ) as typeof fetch;

    const response = await callAiWithSchemaDetailed<{ value: string }>({
      systemPrompt: "system",
      userPrompt: "user",
      schemaName: "test_schema",
      schema: {
        type: "object",
        additionalProperties: false,
        properties: { value: { type: "string" } },
        required: ["value"]
      }
    });

    expect(response.result).toEqual({ value: "ok" });
    expect(response.trace).toMatchObject({
      schemaName: "test_schema",
      primaryProvider: "gemini",
      providerUsed: "gemini",
      fallbackProvider: null,
      fallbackUsed: false,
      success: true
    });
  });

  it("does not call OpenAI fallback when gemini fails", async () => {
    process.env.AI_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "test-gemini";
    global.fetch = vi.fn(
      async () =>
        ({
          ok: false,
          status: 500,
          statusText: "boom"
        }) as unknown as Response
    ) as typeof fetch;

    const response = await callAiWithSchemaDetailed<{ value: string }>({
      systemPrompt: "system",
      userPrompt: "user",
      schemaName: "test_schema",
      schema: {
        type: "object",
        additionalProperties: false,
        properties: { value: { type: "string" } },
        required: ["value"]
      }
    });

    expect(response.result).toBeNull();
    expect(response.trace).toMatchObject({
      primaryProvider: "gemini",
      providerUsed: null,
      fallbackProvider: null,
      fallbackUsed: false,
      success: false
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
