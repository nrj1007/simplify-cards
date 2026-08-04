import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { callAiWithSchemaDetailed, getActiveProvider } from "../lib/ai-provider";

const originalProvider = process.env.AI_PROVIDER;
const originalOpenAiKey = process.env.OPENAI_API_KEY;
const originalOpenAiEnabled = process.env.ENABLE_OPENAI_AI;
const originalGeminiKey = process.env.GEMINI_API_KEY;
const originalFetch = global.fetch;

const schemaCall = {
  systemPrompt: "system",
  userPrompt: "user",
  schemaName: "test_schema",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: { value: { type: "string" } },
    required: ["value"]
  }
};

function geminiResponse(value: string) {
  return {
    ok: true,
    json: async () => ({
      candidates: [
        { content: { parts: [{ text: JSON.stringify({ value }) }] } }
      ]
    })
  } as unknown as Response;
}

function openAiResponse(value: string) {
  return {
    ok: true,
    json: async () => ({
      output_text: JSON.stringify({ value })
    })
  } as unknown as Response;
}

function failedResponse() {
  return {
    ok: false,
    status: 500,
    statusText: "boom"
  } as unknown as Response;
}

describe("getActiveProvider", () => {
  beforeEach(() => {
    delete process.env.AI_PROVIDER;
    delete process.env.OPENAI_API_KEY;
    delete process.env.ENABLE_OPENAI_AI;
    delete process.env.GEMINI_API_KEY;
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    if (originalProvider === undefined) delete process.env.AI_PROVIDER;
    else process.env.AI_PROVIDER = originalProvider;
    if (originalOpenAiKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalOpenAiKey;
    if (originalOpenAiEnabled === undefined) delete process.env.ENABLE_OPENAI_AI;
    else process.env.ENABLE_OPENAI_AI = originalOpenAiEnabled;
    if (originalGeminiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalGeminiKey;
    global.fetch = originalFetch;
    vi.restoreAllMocks();
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

  it("keeps OpenAI off when AI_PROVIDER is openai without the enable flag", () => {
    process.env.AI_PROVIDER = "openai";
    expect(getActiveProvider()).toBe("gemini");
  });

  it("allows OpenAI only when explicitly enabled", () => {
    process.env.AI_PROVIDER = "openai";
    process.env.ENABLE_OPENAI_AI = "1";
    expect(getActiveProvider()).toBe("openai");
  });

  it("returns provider trace when gemini succeeds", async () => {
    process.env.AI_PROVIDER = "openai";
    process.env.GEMINI_API_KEY = "test-gemini";
    global.fetch = vi.fn(async () => geminiResponse("ok")) as typeof fetch;

    const response = await callAiWithSchemaDetailed<{ value: string }>(schemaCall);

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

  it("does not call OpenAI fallback when gemini fails and OpenAI is disabled", async () => {
    process.env.AI_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "test-gemini";
    process.env.OPENAI_API_KEY = "test-openai";
    global.fetch = vi.fn(async () => failedResponse()) as typeof fetch;

    const response = await callAiWithSchemaDetailed<{ value: string }>(schemaCall);

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

  it("can call OpenAI when explicitly enabled", async () => {
    process.env.AI_PROVIDER = "openai";
    process.env.ENABLE_OPENAI_AI = "1";
    process.env.OPENAI_API_KEY = "test-openai";
    global.fetch = vi.fn(async () => openAiResponse("ok")) as typeof fetch;

    const response = await callAiWithSchemaDetailed<{ value: string }>(schemaCall);

    expect(response.result).toEqual({ value: "ok" });
    expect(response.trace).toMatchObject({
      primaryProvider: "openai",
      providerUsed: "openai",
      fallbackProvider: "gemini",
      fallbackUsed: false,
      success: true
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("uses OpenAI fallback only when explicitly enabled", async () => {
    process.env.AI_PROVIDER = "gemini";
    process.env.ENABLE_OPENAI_AI = "1";
    process.env.GEMINI_API_KEY = "test-gemini";
    process.env.OPENAI_API_KEY = "test-openai";
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(failedResponse())
      .mockResolvedValueOnce(openAiResponse("fallback")) as typeof fetch;

    const response = await callAiWithSchemaDetailed<{ value: string }>(schemaCall);

    expect(response.result).toEqual({ value: "fallback" });
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
