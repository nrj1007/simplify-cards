# Card AI India — project guide

A Next.js app for **Indian credit-card discovery, comparison, and grounded Q&A**. It holds
~209 manually-verified cards and helps a user find, compare, and decide on a card based on
their spending — then explains the fees, rewards, caps, and trade-offs.

## Core principle (read this first)
**The AI is never the source of truth.** Every answer, ranking, and recommendation is grounded
in the verified card dataset (`data/cards/`). When the app can't answer confidently it says so
and logs the question for review (`data/question-logs/`) instead of guessing. Card content the
user sees must come from real fields, not invented text. Keep this in mind for any feature that
surfaces card information.

## Stack
- **Next.js 16** (App Router) with `typedRoutes: true`, **React 19**, **TypeScript** (strict).
- **No CSS framework** — one global stylesheet, `app/globals.css`, with a hand-rolled design
  system (see `app/CLAUDE.md`). Icons via `lucide-react`. Image processing via `sharp`.
- **Vitest** for unit tests (`tests/` mirrors `lib/`).
- Card data is plain JSON on disk, read at server start by `lib/card-index.ts`.

## Commands
```bash
npm install
npm run dev          # http://localhost:3000
npm run build
npm test             # vitest
npm run lint
npm run validate:cards   # validates every data/cards/**/*.json against the schema
```
- **Dev server note:** the repo's `dev` script is plain `next dev`. On some Windows/ARM setups
  Turbopack fails — use `next dev --webpack` there. If the dev server throws
  `__webpack_modules__ is not a function` or `Restoring pack failed`, the webpack dev cache is
  corrupt: delete `.next/dev/cache` (or all of `.next`) and restart.

## Repo layout
```
app/            Next.js App Router — pages, API routes, UI components   (see app/CLAUDE.md)
lib/            Server-side engine: data loading, scoring, Q&A, calc     (see lib/CLAUDE.md)
data/           Card data + generated logs (one JSON per card)
scripts/        Maintenance/ingestion scripts + Windows .ps1 helpers
skills/         Agent skills (verify-card-details, community-signals)
tests/          Vitest unit tests (one per lib module)
```

## Features / routes
| Route | What it does |
|---|---|
| `/` | Landing — value prop, hero AskBox, how-it-works, use-cases, popular cards, trust |
| `/ask` | Grounded Q&A — exact card, ranked matches, comparisons, honest "no result" |
| `/recommend` | Spend-based recommender — sliders → ranked cards by net value after fees |
| `/compare` | Two-card side-by-side (`?a=<id>&b=<id>`) |
| `/calculator` | Standalone reward calculator with bank→card pickers (`?card=<id>`) |
| `/finder` | Filter cards by issuer / use-case / max fee |
| `/cards/[id]` | Card detail page (statically generated for every card) |
| `/review/*` | Internal review tooling (questions, community, inbox) |
| `POST /api/ask`, `GET /api/cards`, `POST /api/recommend`, `POST /api/feedback`, `/api/debug-ranking` | JSON endpoints backing the pages |

## Data model
- **One JSON file per card** under `data/cards/<issuer>/<card-id>.json` (a single object, not
  an array). `id` is globally unique. `lib/card-index.ts` reads `data/cards/**/*.json` at load
  time — **adding a card is just dropping a file**, no import list to update.
- The card shape is the `CreditCard` type in **`lib/types.ts`**.
- **Authoring/updating cards:** follow **`data/cards/card_data_instructions.md`** (conventions,
  exclusion codes, redemption/lounge fields, scoring annotations) and run `npm run validate:cards`.
- `data/card-content.json` holds non-schema editorial content (tips, dated updates) keyed by
  card id, served via `lib/card-content.ts`.
- Generated/append-only logs live under `data/question-logs/`, `data/community-signals/`,
  `data/telegram-inbox/` — these are data, not code.

## Conventions & gotchas
- **typedRoutes is on.** Inline `<Link href={`/cards/${id}`}>` works, but a `string`-typed href
  variable does not — cast it `as Route` (`import type { Route } from "next"`). New routes only
  enter the generated route map after a build; `next dev --webpack` doesn't regenerate it, so
  references to brand-new routes may need `as Route` too.
- **`lib/` is server-only.** `card-index.ts` (and anything importing it) reads the filesystem.
  Never import these into a `"use client"` component — pass derived data down as props instead.
- **Defensive rendering.** Card-detail sections render only when their data exists; missing data
  hides the section (no placeholder text). Preserve this when editing.
- **Don't fabricate card info.** Surfaced values must trace to real fields or transparent
  derivations (e.g. `lib/card-detail.ts`). See `lib/CLAUDE.md`.
- Apply/affiliate links use `rel="nofollow sponsored"` and an affiliate disclosure is shown
  near every Apply CTA.

## Where to read next
- **`lib/CLAUDE.md`** — the scoring/Q&A/calculator engine and module map.
- **`app/CLAUDE.md`** — pages, components, the design system, and frontend conventions.
- **`README.md`** — quick start. **`data/cards/card_data_instructions.md`** — card authoring.
