# SEO Landing Pages for SimplifyCards

> Status: **implemented.** The app now has ten crawlable SEO landing pages powered by the
> existing `scoreCards` ranking engine, included in the sitemap, linked from the footer, and locked
> by `tests/seo-landing-golden.test.ts`.

## Context
SimplifyCards currently relies on `/ask?query=...` for high-intent credit-card searches. Those
are JS-driven, query-param URLs that don't rank well and shouldn't be SEO targets. The goal is
**10 dedicated, crawlable, server-rendered SEO landing pages** — each with its own route, unique
title/description, canonical URL, H1, intro, a ranked grounded card list, "how we picked",
"things to check", FAQ, affiliate disclosure, last-updated date, and a CTA that funnels users
into the existing `/ask` flow. The page must hold enough crawlable content to rank **without**
depending on the AI result.

Hard constraints (from the request): don't change the visual theme, the card data model, or
affiliate/apply links; **never invent** card benefits/fees/rewards/eligibility — surface only
existing fields; where a field is missing show the fallback **"Check issuer terms before
applying."**; keep `/ask?query=...` only as a CTA.

Confirmed decisions: list **up to 10** cards per page; link the new pages from a **footer
"Popular guides" group + in-page cross-links** (navbar untouched); emit **FAQPage + ItemList
JSON-LD**.

**Rankings are dynamic, engine-driven, and auto-updating.** Each page does NOT hardcode or
hand-pick cards. It ranks via the existing scoring engine `scoreCards` (`lib/recommend.ts`) — the
same engine behind `/ask` and `/recommend` — so the list reflects the live card dataset and
scoring logic. When card data or scoring changes, the pages regenerate on the next build/deploy
(same as `/cards/[id]` static generation), and a **golden snapshot test** locks the ordered card
ids per page so any ranking change is a reviewable git diff, refreshed with `npx vitest run -u`
(same workflow as the existing `tests/ranking-golden.test.ts`).

## Approach: config-driven + one reusable component
All 10 pages share one structure, so drive them from a single config array and render with one
shared server component. Each route file is a ~4-line wrapper. Reuse existing helpers — no new
scoring logic, no schema changes.

### Existing pieces to reuse
- **`lib/recommend.ts → scoreCards(input: RecommendationInput): CardScore[]`** — the ranking
  engine. Routes a free-text `query` (or structured fields `wantsLounge` / `wantsLifetimeFree` /
  `maxAnnualFee` / `spend`) through its intent modes (category-focus, fuel, segment, forex, lounge,
  UPI, envelope) and returns all cards ranked. This is the single source of truth for ordering.
- `lib/seo.ts → buildPageMetadata({title, description, path})` — already sets canonical
  (`alternates.canonical`), robots index/follow, OpenGraph, Twitter via `metadataBase`.
- `lib/card-index.ts` (via `@/lib/cards`): `cards`, `getCardById`, `stripScoringAnnotations`.
- `lib/lounge.ts → getTotalLoungeAccess(card)` (`number | "unlimited"`).
- `lib/card-detail.ts → deriveBestFor(card)` (grounded `{icon,title,desc}` array, first item = headline
  use case + key benefit) and `formatRupeesCompact(value)`.
- `app/ui/PageHero.tsx`, `app/ui/CardTile.tsx`, CSS classes `.page-shell/.page-hero/.page-content/.container/.panel/.btn/.tag`.

### New file: `lib/seo-landing.ts` (server-only)
Defines everything data-side:
- `type SeoLandingConfig = { slug; title; description; h1; eyebrow; intro; ctaQuery; howWePicked: string; thingsToCheck: string[]; faqs: {q;a}[]; ranking: RecommendationInput }`.
  The `ranking` is fed straight to the engine — no bespoke per-page selection code.
- `SEO_LANDINGS: SeoLandingConfig[]` — the 10 configs. Selection is **uniform**:
  `selectCardsForLanding(config)` = `scoreCards(config.ranking).slice(0, 10).map(s => s.card)`.
  The `ranking` inputs reuse the exact phrasings already locked in `tests/ranking-golden.test.ts`
  so SEO pages rank identically to `/ask` for the same intent:
  1. `/best-credit-cards-india` → `{ query: "best credit card" }`
  2. `/best-cashback-credit-cards-india` → `{ query: "best cashback card" }`
  3. `/best-travel-credit-cards-india` → `{ query: "best travel card" }`
  4. `/best-lounge-access-credit-cards-india` → `{ wantsLounge: true }`
  5. `/best-lifetime-free-credit-cards-india` → `{ wantsLifetimeFree: true }`
  6. `/best-fuel-credit-cards-india` → `{ query: "best card for fuel" }`
  7. `/best-rupay-credit-cards-india` → `{ query: "best rupay card" }`
  8. `/best-premium-credit-cards-india` → `{ query: "best premium card" }`
  9. `/best-credit-cards-for-online-shopping` → `{ query: "best online shopping card" }`
  10. `/best-credit-cards-for-beginners-india` → `{ query: "best beginner card" }`
  (The engine returns all cards ranked; we take the top 10. No hand-picking, no padding.)
- `getSeoLanding(slug)` lookup; `SEO_LANDING_SLUGS` (exported for sitemap).
- `buildSeoLandingMetadata(slug)` → wraps `buildPageMetadata({title, description, path:"/"+slug})`.
- `deriveCardSummary(card)` → grounded display row, all from real fields with the required fallback:
  - `name`, `issuer`.
  - `annualFee`: `card.annualFee === 0 ? "Lifetime free (no annual fee)" : formatRupeesCompact(card.annualFee)`.
  - `bestUseCase`: `deriveBestFor(card)[0]?.title` → else `card.bestFor` joined → else `"General everyday spending."`.
  - `keyBenefit`: `deriveBestFor(card)[0]?.desc` → else top `rewards[].displayRate` → else **"Check issuer terms before applying."**.
  - `limitation`: first of — a `card.exclusions[0]` (via `stripScoringAnnotations`), or
    `feeWaiverSpend` note (`"Renewal fee waived only on <amt> annual spend."`), or
    `"Top reward categories are capped monthly."` if a `rewards[].capMonthly` exists — else
    **"Check issuer terms before applying."**.
  - `href`: `/cards/${card.id}`.
- `buildLandingJsonLd(config, cards)` → array of `FAQPage` (from `faqs`) + `ItemList`
  (positions → `https://www.simplifycards.in/cards/<id>`).
- `landingLastUpdated(cards)` → most recent `card.lastVerified` among the listed cards, formatted
  (e.g. "June 2026") — grounded, not invented.

### New file: `app/ui/SeoLandingPage.tsx` (server component)
Props `{ slug }`. Looks up config, runs `selectCardsForLanding`, maps `deriveCardSummary`, renders
inside a `.seo-landing` wrapper using existing chrome:
- `<PageHero eyebrow title={h1} lead={intro} />` (H1 comes from PageHero's `<h1>`).
- Ranked list: each card a `.panel` row showing rank #, name, issuer, annual fee, best use case,
  key reward/benefit, major limitation, and a `Details` link to `/cards/<id>` (apply/affiliate
  links untouched — Apply stays on the card detail page; we do not duplicate or alter them here).
- "How we picked these cards" section (from `howWePicked`).
- "Things to check before applying" section (`thingsToCheck` list).
- FAQ section (`faqs`, plain `<h3>`/`<p>`).
- CTA section: button text **"Ask SimplifyCards about this"** → `` `/ask?query=${encodeURIComponent(ctaQuery)}` `` (cast `as Route` per typedRoutes).
- Affiliate disclosure line (same wording as the footer disclosure) + "Last updated: <date>".
- Cross-links: a "Related guides" list linking the other SEO slugs + `/finder`, `/compare`.
- `<script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(buildLandingJsonLd(...))}} />`.

### New: 10 route files — `app/<slug>/page.tsx`
Each is a thin wrapper, e.g. `app/best-credit-cards-india/page.tsx`:
```tsx
import type { Metadata } from "next";
import { buildSeoLandingMetadata } from "@/lib/seo-landing";
import SeoLandingPage from "@/app/ui/SeoLandingPage";
export const metadata: Metadata = buildSeoLandingMetadata("best-credit-cards-india");
export default function Page() { return <SeoLandingPage slug="best-credit-cards-india" />; }
```

### New file: `tests/seo-landing-golden.test.ts`
Mirrors `tests/ranking-golden.test.ts`. Iterates `SEO_LANDINGS`, runs `scoreCards(config.ranking)`,
and snapshots `{ [slug]: orderedTop10CardIds }` via `toMatchSnapshot()`. This is the "auto-update
like golden snapshots" guarantee: data/scoring changes surface as a per-page reviewable diff and
are accepted with `npx vitest run -u` (per project note, move untracked WIP card JSONs out of
`data/cards/` before `-u` so they don't leak into the committed snapshot).

### Edits
- `app/sitemap.ts` — add the 10 slugs (import `SEO_LANDING_SLUGS`, map to `buildCanonicalUrl`,
  `changeFrequency: "weekly"`, `priority: 0.8`).
- `app/layout.tsx` — add a "Popular guides" column to `.footer-grid` linking the 10 new pages.
- `app/globals.css` — a small **scoped** `.seo-landing` block (card rows, FAQ spacing) and footer
  guides list. Reuse existing tokens/classes only — **no palette/theme/token changes**.

## Metadata (titles/descriptions/canonicals)
Canonical for every page = `https://www.simplifycards.in/<slug>` (auto from `buildPageMetadata`).
Use the two examples verbatim from the request; for the other 8, unique title pattern
`Best … Credit Cards in India 2026 | SimplifyCards` with a unique one-line description tied to
the search intent. H1 mirrors the search phrase (e.g. "Best Travel Credit Cards in India").

## Grounding / fallbacks (explicit)
- Every displayed value traces to a real `CreditCard` field or an existing derivation in
  `lib/card-detail.ts` / `lib/lounge.ts`. No new card claims.
- Missing key benefit or limitation → **"Check issuer terms before applying."**
- FAQ answers are generic/safe (how ranking works, "verify with the issuer", what the category
  means) — they never assert card-specific numbers.

## Verification
1. `npx tsc --noEmit` — TypeScript passes (typedRoutes: confirm the `/ask?query=` CTA and any
   string hrefs are cast `as Route`).
2. `npm run lint`.
3. `npm test` — including the new `seo-landing-golden` snapshot; first run writes the snapshot,
   then confirm a clean re-run passes (deterministic). Verify the snapshot ids match what the live
   pages render.
4. `npm run build` — build passes and the 10 new static routes appear in the route manifest.
5. `next dev --webpack` on port 3001 (per repo note for this win32/arm64 box), spot-check 3 pages
   (`/best-credit-cards-india`, `/best-lounge-access-credit-cards-india`,
   `/best-credit-cards-for-online-shopping`): H1 present, ~10 grounded cards, FAQ, CTA links to
   `/ask?query=...`, "Check issuer terms before applying." appears only where data is genuinely
   missing.
6. View-source / DevTools: each page has exactly one `<link rel="canonical">` =
   `https://www.simplifycards.in/<slug>`, `robots` allows indexing (no `noindex`), and a valid
   `application/ld+json` block.
7. `/sitemap.xml` lists all 10 new routes.

## Deliverables to report after implementation
1. Routes added (the 10 slugs). 2. Files changed (new + edited list). 3. How cards are selected
per page (the engine-driven ranking table above). 4. Confirmation sitemap updated. 5. Missing-data
fallbacks used ("Check issuer terms before applying." + grounded-derivation fallbacks).
