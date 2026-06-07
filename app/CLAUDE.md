# app/ — frontend (App Router)

Next.js App Router pages, API routes, UI components, and the single global stylesheet. Pages are
**server components** that call `lib/` and render; interactive widgets are isolated client
components.

## Layout
```
layout.tsx        Root chrome: .app-shell > sticky .navbar (.nav-links) + <main> + .footer
globals.css       The entire design system + every component style (no CSS framework)
page.tsx          Landing
ask/  recommend/  compare/  calculator/  finder/  cards/[id]/  review/   Page routes
api/              Route handlers: ask, cards, recommend, feedback, debug-ranking
ui/               Shared components
```

## UI components (`app/ui/`)
- **`PageHero.tsx`** — shared full-bleed hero (eyebrow + title + lead) used by `recommend`,
  `finder`, `compare`, `calculator`. Wrap such a page in `<div className="page-shell">` →
  `<PageHero …/>` → `<section className="page-content"><div className="container">…`.
- **`AskBox.tsx`** — the ask input; `variant="default" | "hero"` (the hero variant is the landing
  search with prompt chips).
- **`RewardCalculator.tsx`** *(client)* — the real per-card reward/value calculator (category
  sliders → points, rupee value across redemption options, milestones). Reused on the card detail
  page and `/calculator`. Don't reimplement reward math in pages — pass `card` + `milestones`
  (`milestoneRulesForCard(card)` from `lib/recommend`).
- **`CalculatorPicker.tsx`** *(client)* — bank→card cascading dropdowns for `/calculator`;
  navigates to `?card=<id>`.
- **`RecommendCalculator.tsx`** *(client)* — spend sliders for `/recommend`; debounced POST to
  `/api/recommend`.
- **`CardTile.tsx`**, **`LoungeInfo.tsx`**, **`AskFeedback.tsx`** *(client)*,
  **`VerificationBadge.tsx`** — card grid tile, lounge-conditions popover, 👍/👎 feedback, and the
  data-verification badge.

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
  (`lib/card-detail.ts`); render a section only when its data exists. Apply CTAs use
  `rel="nofollow sponsored"` and show the affiliate disclosure.
- **`searchParams` are awaited** (`const params = await searchParams`) — App Router async params.

## API routes (`app/api/*/route.ts`)
`ask` (POST → `answerQuestion`), `cards` (GET list), `recommend` (POST → scored results),
`feedback` (POST, logged to `data/`), `debug-ranking` (dev introspection). They return the
trimmed DTOs from `lib/`, keeping the full curated dataset server-side.
