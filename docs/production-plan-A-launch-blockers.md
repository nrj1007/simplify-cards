# Production Plan A — Launch Blockers

This document tracks critical launch blockers that must be resolved before releasing Card AI India to production (Vercel).

## Launch Blockers list

### 1. Ask AI Endpoint Hard-500s in Production (UX Review #1)
*   **Context:** If AI environment variables (`GEMINI_API_KEY` / `OPENAI_API_KEY`) are missing, or if the API request to Gemini/OpenAI fails (due to rate limits, network outages, etc.), the `/api/ask` endpoint should not hard-500. Instead, it must fail gracefully, returning a deterministic answer and search results from the local grounded database.
*   **Current State:** `lib/ask-ai.ts` already has fallback paths when the AI provider returns `null`, but if any unhandled error occurs during the request parsing, card scoring, or result grouping, the API route crashes with a 500 error.
*   **Resolution Plan:**
    1.  Wrap the POST handler in `app/api/ask/route.ts` in a robust try-catch block.
    2.  If an exception is caught, fall back to calling the deterministic `answerFromCards` function using the local card index, generating a skimmable database-grounded summary (`buildFallbackSummary`), and returning it with a low-confidence/offline metadata flag.
    3.  Ensure the client-side UI handles this response gracefully.

## Checklist

- [x] Wrap the POST handler in `app/api/ask/route.ts` with try-catch and return a graceful database-fallback response.
- [x] Add a unit test to verify that the `/api/ask` route handler behaves gracefully and returns valid JSON even when the inner logic throws or fails.
- [x] Verify that missing `GEMINI_API_KEY` / `OPENAI_API_KEY` doesn't cause a crash.
