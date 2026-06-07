# lib/ — server-side engine

All modules here are **server-only** (several read the filesystem). Do not import them into
`"use client"` components — compute on the server and pass results down as props.

Everything is **deterministic and grounded in the card dataset** unless a module explicitly
calls the AI provider. The AI is used only to phrase/resolve, never as the source of card facts.

## Data layer
- **`card-index.ts`** — the heart of data loading. Reads every `data/cards/**/*.json` at module
  load, sorts by popularity, and builds lookup indexes (by issuer, tag, network, use-case,
  segment, redemption bucket, popularity band, reward category). Exposes `cards`, `getCardById`,
  and the `getCardsBy*` helpers. Also `stripScoringAnnotations()` (removes `(worth Rs …)` scoring
  hints embedded in benefit strings before display).
- **`cards.ts`** — thin re-export of `card-index.ts` (the public import surface: `import … from
  "@/lib/cards"`).
- **`types.ts`** — the data model: `CreditCard`, `Reward`, `Redemption`, `SpendCategory`,
  `CardScore`, `RecommendResult`, `RecommendationInput`. Changing `CreditCard` changes the schema
  every card JSON must satisfy.
- **`card-content.ts`** — editorial tips/updates from `data/card-content.json` (not part of the
  card schema).
- **`exclusion-constants.ts`** — exclusion code ↔ spend-category mapping.

## Recommendation / scoring engine
- **`recommend.ts`** — the scoring core. `scoreCards(input)` returns all cards scored & sorted;
  `answerFromCards(input)` builds a recommendation. Score = `valueScore + relevanceWeight *
  relevanceScore` where `valueScore` includes `estimatedNetValue` in **rupees**, so raw
  `fitScore` is large and unbounded (normalize for display, never show it raw). Also exports
  `defaultSpendProfile`, `requestedTopCardCount`, and `milestoneRulesForCard()` (per-card
  milestone value/threshold rules used by the calculator).
- **`recommend-result.ts`** — maps a full `CardScore` to the trimmed `RecommendResult` DTO sent
  to the browser (keeps the curated dataset server-side). Computes next-milestone / fee-waiver
  gaps.
- **`query-intent.ts`** — parses a free-text query into structured intent (use-cases, segments,
  issuers, networks, fee constraints, inferred spend) used by scoring and Q&A.

## Q&A (Ask)
- **`ask-ai.ts`** — orchestrates `POST /api/ask` and the `/ask` page. Classifies the query
  (specific card, card-detail question, card-family, top-cards, best-fit, unsupported), shortlists
  grounded cards, and returns an `AskAiResult` with `summary`, `cards`, `highlights`, and `meta`
  (intent + confidence + needs-follow-up). Logs unsupported questions for review. Uses
  `ai-provider.ts` only to phrase summaries / resolve fuzzy card names — never to invent facts.
- **`ai-provider.ts`** — wrapper for schema-constrained AI calls (`callAiWithSchema`).

## Per-card features
- **`reward-calculator.ts`** — `calculateRewards(card, spend)`: category spend × reward rate with
  monthly caps, post-cap rates, and exclusions. Powers the `RewardCalculator` UI. **Does not**
  include milestones (those come from `recommend.ts → milestoneRulesForCard`).
- **`lounge.ts`** — `getTotalLoungeAccess`, `getLoungeConditions`, `getMeaningfulLoungeConditions`
  (extracts lounge spend-conditions from benefit/notes text).
- **`card-detail.ts`** — *(on the card-detail-redesign work)* pure derivations for the decision
  sections: `deriveTake`, `deriveBestFor`/`deriveAvoidIf`, `deriveLoungeMilestoneRules`,
  `deriveExclusionsAndCaps`, `findAlternativeCards`/`alternativeIntent`. All rule-based over
  existing fields; each returns empty/null when there's no signal so the page can hide the
  section. No AI, no new schema.

## Logs & ingestion
- **`question-logs.ts`**, **`feedback-logs.ts`** — append-only logs (unsupported questions, page
  feedback) under `data/`.
- **`community-signals.ts`**, **`telegram-inbox.ts`** — ingestion/scoring of external signals.

## Testing
Every module has a sibling in `tests/` (e.g. `recommend.test.ts`, `ask-ai.test.ts`,
`reward-calculator.test.ts`). Run `npm test`. When you change scoring or derivation logic, update
/add tests there.
