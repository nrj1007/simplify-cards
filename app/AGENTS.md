# app/ — frontend (App Router)

Next.js App Router pages, API routes, UI components, and the single global stylesheet. Pages are
**server components** that call `lib/` and render; interactive widgets are isolated client
components.

## Layout
```
layout.tsx        Root chrome: .app-shell > sticky .navbar (.nav-links) + <main> + .footer
globals.css       The entire design system + every component style (no CSS framework)
page.tsx          Landing
ask/  recommend/  compare/(tool)/  compare/[pair]/  calculator/  finder/  cards/[id]/
best-*/           SEO landing pages (10 slugs, driven by lib/seo-landing.ts)
feedback/         User feedback form
methodology/  disclosure/  about/  contact/  privacy/  terms/   Editorial/legal pages
review/           Internal review tooling (questions, community, inbox)
api/              Route handlers: ask, cards, recommend, feedback, analytics, debug-ranking
ui/               Shared components
```

## UI components (`app/ui/`)
- **`PageHero.tsx`** — shared full-bleed hero (eyebrow + title + lead) used by `recommend`,
  `finder`, `compare`, `calculator`. Wrap such a page in `<div className="page-shell">` →
  `<PageHero …/>` → `<section className="page-content"><div className="container">…`.
- **`AskBox.tsx`** — the ask input; `variant="default" | "hero"` (the hero variant is the landing
  search with prompt chips).
- **`AskQueryForm.tsx`** *(client)* — controlled form wrapping `AskBox` for the `/ask` page;
  manages query state and submission.
- **`AskResultsLoadingBoundary.tsx`** *(client)* — Suspense-style loading shell for ask results
  while the API call is in flight.
- **`RewardCalculator.tsx`** *(client)* — the real per-card reward/value calculator (category
  sliders → points, rupee value across redemption options, milestones). Reused on the card detail
  page and `/calculator`. Don't reimplement reward math in pages — pass `card` + `milestones`
  (`milestoneRulesForCard(card)` from `lib/recommend`). The "transfer to airline miles / hotel
  points" line shows the **max transfer ratio** across the card's `airlinePartners` (parsing
  `"2:1"` → 0.5) and `transferPartnerValuations[].transferRatio` (e.g. Marriott 1:1 → 1.0) — not a
  rupee figure. The card-detail page derives the same "upto X airmile per point" value.
- **`CalculatorPicker.tsx`** *(client)* — bank→card cascading dropdowns for `/calculator`;
  navigates to `?card=<id>`.
- **`RecommendCalculator.tsx`** *(client)* — spend sliders for `/recommend`; debounced POST to
  `/api/recommend`.
- **`CardTile.tsx`**, **`LoungeInfo.tsx`**, **`AskFeedback.tsx`** *(client)*,
  **`VerificationBadge.tsx`** — card grid tile, lounge-conditions popover, 👍/👎 feedback, and the
  data-verification badge.
- **`CardImageFallback.tsx`** — renders a placeholder when a card image is missing.
- **`FinderFilterForm.tsx`** *(client)* — the filter controls for `/finder` (issuer, use-case, max
  fee dropdowns); drives URL search params.
- **`NavigationProgress.tsx`** *(client)* — thin top progress bar shown during route transitions.
- **`TrackedLink.tsx`** *(client)* — `<a>` wrapper that fires an analytics event before navigating;
  use for apply / details links instead of bare `<a>`.
- **`AnalyticsMount.tsx`** *(client)* — renders once in the root layout; bootstraps the client-side
  analytics session and fires `page_view` on route changes via `lib/analytics-client.ts`.
- **`SeoLandingPage.tsx`** — shared render component for all `/best-*` SEO landing pages; driven
  by a `SeoLandingConfig` from `lib/seo-landing.ts`.
- **`SeoComparisonPage.tsx`** — shared render component for `/compare/[pair]` SEO pages; driven
  by a `SeoComparisonConfig` from `lib/seo-comparisons.ts`.

## Design system (in `globals.css`)
- **Palette / tokens** at `:root`: cream/teal/navy (`--cream`, `--teal`, `--navy`, `--gold`,
  `--line`, `--radius-lg`, `--shadow-soft`, …). Font is Inter.
- **Chrome:** `.app-shell` (rounded framed container) → `.navbar` → `.main` → `.footer`.
- **Inner-page pattern:** `.page-shell` (opts the page out of `.main` padding for a full-bleed
  hero) → `.page-hero` (gradient + grid-pattern background, `.page-eyebrow`, `h1`,
  `.page-hero-lead`) → `.page-content` → `.container`. Panels use `.panel` (rounded, soft shadow).
- **Scope page-specific CSS** to avoid collisions: e.g. calculator/landing/ask tweaks are
  namespaced (`.ask-results …`, `.calc-standalone …`). When restyling shared classes (`.stat`,
  `.badge`, `.compare-card`) for one page, scope under a page wrapper class rather than editing
  the global rule.
- Mobile: most multi-column grids collapse around 980px / 760px / 640px media queries.

## Conventions
- **typedRoutes is on.** Inline template `href`s to known routes are fine; a `string`-typed href
  variable must be cast `as Route` (`import type { Route } from "next"`). Same for `router.push`.
- **Server/client boundary.** Pages (server) import from `@/lib/*` and may read card data;
  client components (`"use client"`) must receive data as props — never import `lib/card-index`
  (it touches the filesystem) into a client component.
- **Grounded + defensive UI.** Show only real card fields or transparent derivations
  (`lib/card-detail.ts`); render a section only when its data exists. Non-affiliate issuer links
  should be labelled "Check official site" and use `rel="nofollow"`. Reserve "Apply" and
  `rel="sponsored"` only for explicitly marked affiliate links.
- **`searchParams` are awaited** (`const params = await searchParams`) — App Router async params.

## API routes (`app/api/*/route.ts`)
`ask` (POST → `answerQuestion`), `cards` (GET list), `recommend` (POST → scored results),
`feedback` (POST, logged to `data/`), `analytics` (POST, logged via `lib/analytics-logs.ts`),
`debug-ranking` (dev introspection). They return trimmed DTOs from `lib/`, keeping the full
curated dataset server-side.
