# Plan 5 — Conversation context in Ask (follow-up queries)

## Context

The `/ask` sidebar has a "Ask a follow-up" box (`AskQueryForm` with `multiline` prop). When
submitted it navigates to `/ask?query=<new query>` — a completely fresh request with no
knowledge of the previous question or results.

`AskAiResult.meta.needsFollowUp` is already set (`true` for `best-fit` / `top-cards` intents)
and `lib/ask-ai.ts` declares the field, but nothing in the UI or API reads it to seed the next
query. A user who asks "best card for dining" and follows up with "which has lounge access too?"
gets an entirely new ranking from scratch rather than a refinement.

`RecommendationInput` in `lib/types.ts` has no context fields today.

This plan wires the full loop: the ask page passes previous query + top card IDs through the URL,
the API reads them, and `answerQuestion` uses them to bias the follow-up ranking and seed the
AI phrasing prompt with prior context.

## Scope boundaries

- Only follow-up queries (sidebar box on `/ask` results). The landing-page AskBox is unchanged.
- Context is URL-encoded (query params), not stored server-side — no session, no cookie, no DB.
- The AI uses context only to phrase the summary better and to bias the card shortlist; the
  deterministic scorer still runs on all cards.
- Two context hops maximum — context from hop N-1 only (no chaining of infinite depth).

## Files to change

### 1. `lib/types.ts` — extend `RecommendationInput`

```ts
export type RecommendationInput = {
  query?: string;
  maxAnnualFee?: number;
  wantsLounge?: boolean;
  wantsLifetimeFree?: boolean;
  spend?: SpendProfile;
  rankingStrategy?: RankingStrategyName;
  resultStrategy?: ResultStrategyName;
  // NEW — follow-up context (optional, populated by the ask page)
  previousQuery?: string;
  contextCardIds?: string[];   // top 3–5 card ids from the previous result
};
```

### 2. `app/ask/page.tsx` — read and propagate context params

**a) Parse context from searchParams:**

```ts
// in parseInput()
function parseInput(params: {
  query?: string;
  maxAnnualFee?: string;
  prevQuery?: string;      // NEW
  ctxCards?: string;       // NEW — comma-separated card ids
}): RecommendationInput | null {
  const query = params.query?.trim();
  if (!query) return null;
  return {
    query,
    ...(params.maxAnnualFee ? { maxAnnualFee: Number(params.maxAnnualFee) } : {}),
    ...(params.prevQuery ? { previousQuery: params.prevQuery } : {}),
    ...(params.ctxCards
      ? { contextCardIds: params.ctxCards.split(",").slice(0, 5) }
      : {})
  };
}
```

Update the `Props.searchParams` type to include `prevQuery?: string` and `ctxCards?: string`.

**b) Build the follow-up URL with context:**

After the ask result is resolved (i.e. `result.cards` is available), derive the context to pass
to the follow-up box:

```ts
const topCardIds = result.cards.slice(0, 5).map((c) => c.card.id).join(",");
const currentQuery = encodeURIComponent(input.query ?? "");
```

**c) Pass context to `AskQueryForm` in the follow-up sidebar:**

Replace the bare `<AskQueryForm … />` with a version that includes hidden params:

```tsx
<AskQueryForm
  ariaLabel="Ask a follow-up credit card question"
  buttonLabel="Ask follow-up →"
  multiline
  placeholder="…"
  contextParams={{
    prevQuery: input.query,
    ctxCards: topCardIds
  }}
/>
```

### 3. `app/ui/AskQueryForm.tsx` — accept and forward contextParams

Add an optional `contextParams?: Record<string, string>` prop. When present, render hidden
`<input type="hidden">` fields inside the form so the Next.js form action includes them in the
URL:

```tsx
type Props = {
  // existing props…
  contextParams?: Record<string, string>;
};

// Inside the <form> element:
{contextParams &&
  Object.entries(contextParams).map(([k, v]) => (
    <input key={k} type="hidden" name={k} value={v} />
  ))}
```

The form's action should already be a GET to `/ask` — the hidden fields will be appended as
query params automatically.

### 4. `lib/ask-ai.ts` — use context in `answerQuestion`

**a) Boost context card IDs in the ranked shortlist:**

At the top of `answerQuestion`, if `input.contextCardIds` is set, fetch those cards and push
them to the front of the candidate list before running the standard shortlist selection. This
ensures cards from the previous result stay visible in refinement queries.

```ts
// After scoreCards() returns the ranked list, boost context cards:
if (input.contextCardIds?.length) {
  const contextSet = new Set(input.contextCardIds);
  scored.sort((a, b) => {
    const aCtx = contextSet.has(a.card.id) ? 1 : 0;
    const bCtx = contextSet.has(b.card.id) ? 1 : 0;
    return bCtx - aCtx || 0; // stable: don't reverse original order among non-context cards
  });
}
```

**b) Seed the AI summary prompt with prior context:**

In the `callAiWithSchemaDetailed` prompt that generates the human-readable summary, prepend a
context header when `previousQuery` is set:

```ts
const contextPreamble = input.previousQuery
  ? `The user previously asked: "${input.previousQuery}". This is a follow-up question.\n\n`
  : "";

const prompt = `${contextPreamble}Question: ${input.query}\n\n${cardContext}`;
```

This is the only place AI is used — it's still grounded in the same card shortlist.

## What NOT to do

- Don't store session state server-side — URL params are sufficient and simpler.
- Don't pass the full previous result JSON through the URL — only the query string and top card
  IDs (5 ids × ~20 chars = ~100 chars, well within URL limits).
- Don't change the scoring weights based on context — just boost context card visibility and
  improve the AI phrasing. The deterministic scorer must remain neutral.
- Don't activate context on the landing-page AskBox or the `/recommend` flow.

## Verification

1. Ask "best card for dining" → note the top 3 cards.
2. Use the follow-up box and ask "which has lounge access too?".
3. Confirm the top cards from step 1 are still present and ranked (not dropped), and the AI
   summary acknowledges the follow-up context.
4. Check URL contains `prevQuery=best+card+for+dining&ctxCards=<ids>`.
5. A fresh `/ask?query=which+has+lounge+access+too` (no context params) should give the normal
   broad result — context must not leak between independent sessions.
