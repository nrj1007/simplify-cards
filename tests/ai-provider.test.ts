import { afterEach, describe, expect, it, vi } from "vitest";
import { callAiWithSchemaDetailed, getActiveProvider } from "../lib/ai-provider";

const originalProvider = process.env.AI_PROVIDER;
const originalOpenAiKey = process.env.OPENAI_API_KEY;
const originalGeminiKey = process.env.GEMINI_API_KEY;
const originalFetch = global.fetch;

describe("getActiveProvider", () => {
  afterEach(() => {
    if (originalProvider === undefined) delete process.env.AI_PROVIDER;
    else process.env.AI_PROVIDER = originalProvider;
    if (originalOpenAiKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalOpenAiKey;
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

  it("defaults to openai for unknown values", () => {
    process.env.AI_PROVIDER = "something-else";
    expect(getActiveProvider()).toBe("openai");
  });

  it("returns provider trace when the primary provider succeeds", async () => {
    process.env.AI_PROVIDER = "openai";
    process.env.OPENAI_API_KEY = "test-openai";
    delete process.env.GEMINI_API_KEY;
    global.fetch = vi.fn(async () =>
      ({
        ok: true,
        json: async () => ({
          output: [
            {
              content: [{ text: JSON.stringify({ value: "ok" }) }]
            }
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
      primaryProvider: "openai",
      providerUsed: "openai",
      fallbackProvider: "gemini",
      fallbackUsed: false,
      success: true
    });
  });

  it("records fallback usage when the primary provider fails and the fallback succeeds", async () => {
    process.env.AI_PROVIDER = "gemini";
    process.env.OPENAI_API_KEY = "test-openai";
    process.env.GEMINI_API_KEY = "test-gemini";
    global.fetch = vi
      .fn()
      .mockImplementationOnce(
        async () =>
          ({
            ok: false,
            status: 500,
            statusText: "boom"
          }) as unknown as Response
      )
      .mockImplementationOnce(
        async () =>
          ({
            ok: true,
            json: async () => ({
              output: [
                {
                  content: [{ text: JSON.stringify({ value: "fallback-ok" }) }]
                }
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

    expect(response.result).toEqual({ value: "fallback-ok" });
    expect(response.trace).toMatchObject({
      primaryProvider: "gemini",
      providerUsed: "openai",
      fallbackProvider: "openai",
      fallbackUsed: true,
      success: true
    });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
