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
- **`card-links.ts`** — resolves the correct apply/affiliate URL for a card (`applyUrl` vs
  `affiliateUrl`); centralises the affiliate vs non-affiliate link decision.
- **`card-usp.ts`** — `getCardUsp(card)`: one-line marketing USP for a card. Returns a curated
  string for popular cards, otherwise synthesises a short line from the card's fields. Shared by
  `/ask` results and the `/recommend` DTO.
- **`exclusion-constants.ts`** — exclusion code ↔ spend-category mapping.
- **`equitas-privilege.ts`** — Equitas Privilege tier definitions (Blue / Silver / Gold / Platinum
  / Diamond) for the Equitas Privilege card's tier-based reward model.
- **`reward-rate-parse.ts`** — `parseDisplayRate()`: parses human `displayRate` strings
  (e.g. `"72 Reward Points / Rs 200 spent"`) back to a numeric earn rate (units per ₹100).
  Used only by maintenance scripts and the card validator — the runtime engines use `reward.rate`
  directly.

## Recommendation / scoring engine
- **`recommend.ts`** — the scoring core. `scoreCards(input)` returns all cards scored & sorted;
  `answerFromCards(input)` builds a recommendation. Score = `valueScore + relevanceWeight *
  relevanceScore` where `valueScore` includes `estimatedNetValue` in **rupees**, so raw
  `fitScore` is large and unbounded (normalize for display, never show it raw). Also exports
  `defaultSpendProfile`, `requestedTopCardCount`, and `milestoneRulesForCard()` (per-card
  milestone value/threshold rules used by the calculator).
  - **`scoreCards` routes a query to one of several ranking modes** instead of always using the
    broad envelope blend (`blendAnnualSpendLevels` `[120000, 300000, 600000]` — Rs 10k/25k/50k
    per month — with `blendAnnualSpendLevelWeights` `[1.5, 1.25, 1]`, used only for broad
    no-spend queries):
    - **Category focus** (`categoryFocusConfigs` / `detectCategoryFocus`) — "best dining/grocery/
      online/amazon/flipkart/swiggy/utilities/rent/entertainment card". Scored at a realistic
      per-category spend (`categoryFocusMonthlySpend`) and ranked by the reward earned **on that
      category** (fee/joining-independent), so the specialist wins. Config flags: `spendCategory`
      (real category → focused spend), `matchPositioning` (merchant co-brands carry the brand in
      the name, e.g. HDFC Swiggy), `matchByEarning` (rent/utilities — rewarding the category at
      all is the signal, not acceleration), plus a per-card `categoryFocusTags` override.
    - **Fuel** (`shouldRestrictToFuelCards`) — restricts to fuel cards, realistic fuel spend.
    - **Segment** — disjoint fee bands (beginner ≤1k, mid-premium 1k–5k, premium 5k–10k,
      super-premium 10k+), filtered to cards matching all named segments, scored at a tier
      representative spend.
    - **Forex** — 50% international spend with the card's `forexMarkup` deducted as a real cost.
    - **Lounge / international lounge** — `wantsLounge` (+ overseas-only via `wantsInternationalLounge`).
    - **UPI** (`shouldRestrictToUpiCards`) — restricts to UPI/RuPay cards; per-card reward economics
      pick the best option (base vs a paid membership, e.g. Kiwi Neon `paidRewardOptions`) via
      `bestRewardEconomicsForCard`.
- **`ranking-strategies.ts`** — `RankingStrategy` type and the two named strategies:
  `"absolute-blend"` (weighted average over spend levels) and `"max-yield"` (best single spend
  level per card). `scoreCards` selects between these based on the query intent.
- **`result-strategies.ts`** — `ResultStrategy` type: controls how the already-ranked card list
  is **presented**. `"single-list"` returns one flat list; `"reward-type-split"` partitions into
  titled sections (e.g. points vs cashback). Orthogonal to ranking strategy.
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

## SEO / metadata
- **`seo.ts`** — shared constants (`SITE_NAME = "SimplifyCards"`, `SITE_URL`) and helpers:
  `buildCanonicalUrl`, `buildOpenGraphImages`, `buildPageMetadata`. Import this instead of
  hardcoding site strings.
- **`seo-landing.ts`** — `SeoLandingConfig` type and `SEO_LANDINGS` array (10 pre-defined slugs,
  e.g. `best-credit-cards-india`). `selectCardsForLanding`, `selectSectionsForLanding`,
  `buildSeoLandingMetadata`, and `buildLandingJsonLd` power the `/best-*` pages.
- **`seo-comparisons.ts`** — `SeoComparisonConfig` type and `SEO_COMPARISONS` array for
  `/compare/[pair]` static pages. `getSeoComparison`, `getSeoComparisonCards`,
  `comparisonDisplayName`, and `buildComparisonJsonLd` power those pages.

## Analytics
- **`analytics.ts`** — shared types and constants: `AnalyticsEventName`, `AnalyticsEventPayload`,
  `StoredAnalyticsEvent`. The event registry lives here (e.g. `ask_query_submitted`,
  `apply_clicked`). Import from here for type safety — never hardcode event name strings.
- **`analytics-client.ts`** *(client)* — session management (UUID in `sessionStorage`) and
  `trackEvent(payload)` (POSTs to `/api/analytics`). Import this only in client components.
- **`analytics-events.ts`** — server-side helpers that build typed `AnalyticsEventPayload`
  objects for common events (e.g. `buildAskResultEvent`, `buildApplyClickEvent`). Pages call
  these to assemble payloads; `analytics-client.ts` sends them.
- **`analytics-logs.ts`** — server-side log persistence: appends `StoredAnalyticsEvent` records
  to a JSONL file under `data/`. Called only from `POST /api/analytics`.

## Utility
- **`loading-copy.ts`** — copy strings for per-page loading states (titles and subtitles shown
  while API calls are in flight). Centralised so UX copy can be updated in one place.

## Logs & ingestion
- **`question-logs.ts`**, **`feedback-logs.ts`** — append-only logs (unsupported questions, page
  feedback) under `data/`.
- **`community-signals.ts`**, **`telegram-inbox.ts`** — ingestion/scoring of external signals.

## Testing
Every module has a sibling in `tests/` (e.g. `recommend.test.ts`, `ask-ai.test.ts`,
`reward-calculator.test.ts`). Run `npm test`. When you change scoring or derivation logic, update
/add tests there.
