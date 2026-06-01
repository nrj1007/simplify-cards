import { afterEach, describe, expect, it } from "vitest";
import { getActiveProvider } from "../lib/ai-provider";

const originalProvider = process.env.AI_PROVIDER;

describe("getActiveProvider", () => {
  afterEach(() => {
    if (originalProvider === undefined) delete process.env.AI_PROVIDER;
    else process.env.AI_PROVIDER = originalProvider;
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
});
