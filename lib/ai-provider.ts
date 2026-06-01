type AiProviderName = "openai" | "gemini";

export type SchemaCallOptions = {
  systemPrompt: string;
  userPrompt: string;
  schemaName: string;
  schema: Record<string, unknown>;
};

export function getActiveProvider(): AiProviderName {
  const env = process.env.AI_PROVIDER?.split("#")[0]?.toLowerCase().trim();
  if (env === "gemini") return "gemini";
  return "openai";
}

function isAiDebugEnabled() {
  return process.env.DEBUG_AI === "1";
}

function debugAi(message: string, details?: Record<string, unknown>) {
  if (!isAiDebugEnabled()) return;
  if (details) {
    console.warn(`[ai-provider] ${message}`, details);
    return;
  }
  console.warn(`[ai-provider] ${message}`);
}

// Gemini uses a subset of OpenAPI 3.0; strip additionalProperties and convert anyOf nullables.
function toGeminiSchema(schema: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(schema)) {
    if (key === "additionalProperties") continue;

    if (key === "properties" && value && typeof value === "object") {
      result.properties = Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([propKey, propValue]) => {
          if (propValue && typeof propValue === "object") {
            const prop = propValue as Record<string, unknown>;
            if (Array.isArray(prop.anyOf)) {
              const hasNull = (prop.anyOf as Array<{ type?: string }>).some((item) => item.type === "null");
              const nonNull = (prop.anyOf as Array<{ type?: string }>).find((item) => item.type !== "null");
              if (hasNull && nonNull) return [propKey, { ...nonNull, nullable: true }];
            }
          }
          return [propKey, propValue];
        })
      );
    } else {
      result[key] = value;
    }
  }

  return result;
}

function extractOpenAiText(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;

  const directOutputText = (payload as { output_text?: unknown }).output_text;
  if (typeof directOutputText === "string" && directOutputText.trim()) return directOutputText.trim();

  const output = (payload as { output?: unknown }).output;
  if (!Array.isArray(output)) return null;

  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;

    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      const text = (part as { text?: unknown }).text;
      if (typeof text === "string" && text.trim()) return text.trim();
    }
  }

  return null;
}

async function callOpenAi<T>(options: SchemaCallOptions): Promise<T | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    debugAi("OpenAI key missing", { schemaName: options.schemaName });
    return null;
  }

  const model = process.env.OPENAI_ASK_MODEL ?? "gpt-4o-mini";

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "system",
            content: [{ type: "input_text", text: options.systemPrompt }],
          },
          {
            role: "user",
            content: [{ type: "input_text", text: options.userPrompt }],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: options.schemaName,
            strict: true,
            schema: options.schema,
          },
        },
      }),
    });

    if (!response.ok) {
      debugAi("OpenAI returned non-OK response", {
        schemaName: options.schemaName,
        model,
        status: response.status,
        statusText: response.statusText
      });
      return null;
    }

    const payload = (await response.json()) as unknown;
    const rawText = extractOpenAiText(payload);
    if (!rawText) {
      debugAi("OpenAI response had no extractable text", { schemaName: options.schemaName, model });
      return null;
    }

    return JSON.parse(rawText) as T;
  } catch (error) {
    debugAi("OpenAI request failed", {
      schemaName: options.schemaName,
      model,
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}

async function callGemini<T>(options: SchemaCallOptions): Promise<T | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    debugAi("Gemini key missing", { schemaName: options.schemaName });
    return null;
  }

  const model = (process.env.GEMINI_ASK_MODEL ?? "gemini-2.0-flash").trim();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: options.systemPrompt }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: options.userPrompt }],
          },
        ],
        generationConfig: {
          response_mime_type: "application/json",
          response_schema: toGeminiSchema(options.schema),
        },
      }),
    });

    if (!response.ok) {
      debugAi("Gemini returned non-OK response", {
        schemaName: options.schemaName,
        model,
        status: response.status,
        statusText: response.statusText
      });
      return null;
    }

    const payload = (await response.json()) as unknown;
    const text = (
      payload as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      }
    )?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text?.trim()) {
      debugAi("Gemini response had no extractable text", { schemaName: options.schemaName, model });
      return null;
    }

    try {
      return JSON.parse(text) as T;
    } catch (error) {
      debugAi("Gemini response JSON parse failed", {
        schemaName: options.schemaName,
        model,
        error: error instanceof Error ? error.message : String(error),
        rawText: text
      });
      return null;
    }
  } catch (error) {
    debugAi("Gemini request failed", {
      schemaName: options.schemaName,
      model,
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}

export async function callAiWithSchema<T>(options: SchemaCallOptions): Promise<T | null> {
  try {
    const primary = getActiveProvider();
    debugAi("Starting AI schema call", { schemaName: options.schemaName, primaryProvider: primary });

    const primaryResult = await (primary === "gemini" ? callGemini<T>(options) : callOpenAi<T>(options));
    if (primaryResult !== null) {
      debugAi("Primary AI provider returned a result", {
        schemaName: options.schemaName,
        provider: primary
      });
      return primaryResult;
    }

    const fallback = primary === "gemini" ? "openai" : "gemini";
    debugAi("Primary AI provider returned null, trying fallback", {
      schemaName: options.schemaName,
      primaryProvider: primary,
      fallbackProvider: fallback
    });

    const fallbackResult = await (primary === "gemini" ? callOpenAi<T>(options) : callGemini<T>(options));
    if (fallbackResult !== null) {
      debugAi("Fallback AI provider returned a result", {
        schemaName: options.schemaName,
        provider: fallback
      });
      return fallbackResult;
    }

    debugAi("Both AI providers returned null", {
      schemaName: options.schemaName,
      primaryProvider: primary,
      fallbackProvider: fallback
    });
    return null;
  } catch (error) {
    debugAi("AI schema call threw unexpectedly", {
      schemaName: options.schemaName,
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}
