export type AiProviderName = "gemini";

export type AiCallTrace = {
  schemaName: string;
  primaryProvider: AiProviderName;
  providerUsed: AiProviderName | null;
  fallbackProvider: null;
  fallbackUsed: boolean;
  success: boolean;
  primaryModel: string;
  fallbackModel: null;
};

type ProviderCallResult<T> = {
  result: T | null;
  model: string;
};

export type SchemaCallOptions = {
  systemPrompt: string;
  userPrompt: string;
  schemaName: string;
  schema: Record<string, unknown>;
};

export function getActiveProvider(): AiProviderName {
  return "gemini";
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

async function callGemini<T>(options: SchemaCallOptions): Promise<ProviderCallResult<T>> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const model = (process.env.GEMINI_ASK_MODEL ?? "gemini-2.0-flash").trim();
  if (!apiKey) {
    debugAi("Gemini key missing", { schemaName: options.schemaName, model });
    return { result: null, model };
  }
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
      return { result: null, model };
    }

    const payload = (await response.json()) as unknown;
    const text = (
      payload as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      }
    )?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text?.trim()) {
      debugAi("Gemini response had no extractable text", { schemaName: options.schemaName, model });
      return { result: null, model };
    }

    try {
      return { result: JSON.parse(text) as T, model };
    } catch (error) {
      debugAi("Gemini response JSON parse failed", {
        schemaName: options.schemaName,
        model,
        error: error instanceof Error ? error.message : String(error),
        rawText: text
      });
      return { result: null, model };
    }
  } catch (error) {
    debugAi("Gemini request failed", {
      schemaName: options.schemaName,
      model,
      error: error instanceof Error ? error.message : String(error)
    });
    return { result: null, model };
  }
}

export async function callAiWithSchemaDetailed<T>(
  options: SchemaCallOptions
): Promise<{ result: T | null; trace: AiCallTrace }> {
  try {
    const primary = getActiveProvider();
    debugAi("Starting AI schema call", { schemaName: options.schemaName, primaryProvider: primary });

    const primaryResponse = await callGemini<T>(options);
    if (primaryResponse.result !== null) {
      debugAi("Primary AI provider returned a result", {
        schemaName: options.schemaName,
        provider: primary
      });
      return {
        result: primaryResponse.result,
        trace: {
          schemaName: options.schemaName,
          primaryProvider: primary,
          providerUsed: primary,
          fallbackProvider: null,
          fallbackUsed: false,
          success: true,
          primaryModel: primaryResponse.model,
          fallbackModel: null
        }
      };
    }

    debugAi("Gemini returned null; OpenAI fallback is disabled", {
      schemaName: options.schemaName,
      primaryProvider: primary
    });
    return {
      result: null,
      trace: {
        schemaName: options.schemaName,
        primaryProvider: primary,
        providerUsed: null,
        fallbackProvider: null,
        fallbackUsed: false,
        success: false,
        primaryModel: primaryResponse.model,
        fallbackModel: null
      }
    };
  } catch (error) {
    const primary = getActiveProvider();
    debugAi("AI schema call threw unexpectedly", {
      schemaName: options.schemaName,
      error: error instanceof Error ? error.message : String(error)
    });
    return {
      result: null,
      trace: {
        schemaName: options.schemaName,
        primaryProvider: primary,
        providerUsed: null,
        fallbackProvider: null,
        fallbackUsed: false,
        success: false,
        primaryModel: (process.env.GEMINI_ASK_MODEL ?? "gemini-2.0-flash").trim(),
        fallbackModel: null
      }
    };
  }
}

export async function callAiWithSchema<T>(options: SchemaCallOptions): Promise<T | null> {
  const response = await callAiWithSchemaDetailed<T>(options);
  return response.result;
}
