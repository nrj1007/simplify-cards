# UX Review — credit-card-ai.vercel.app
Reviewed: 2026-05-30. Issues ordered by impact.

## Critical

- [ ] **#1 — Ask 500s in production.** AI env vars not set in Vercel. Also: route should never hard-500; wrap the AI call so a failed connection still renders a deterministic answer or a graceful fallback instead of a raw error screen.

- [x] **#2 — Default example query returns "no matching cards".** Replaced with empty textarea + placeholder + 4 example query chips linking to /ask?query=… The prefilled Ask query ("Best card for online shopping and lounge access under Rs 5000 fee") logs as an Unsupported Question. First impression is "the product is broken." Fix: either change default to a query the engine answers well, fix matching so this obvious query returns real results, or activate the intended fallback path.

## High

- [x] **#3 — Internal ops tooling exposed in public nav.** Review / Inbox / Signals are admin pages — one literally tells users to run `npm run ingest:technofino-content` with internal file paths. Remove from primary nav; gate behind `/admin` or auth.

- [x] **#4 — "Sample Card" nav link is a hardcoded dev stub.** Points to `/cards/sbi-cashback`. Replace with "Browse" or drop it.

- [x] **#5 — "Ask" has no nav entry.** The headline feature is only reachable from the homepage hero. Add **Ask** to the nav. Suggested nav: `Ask · Finder · Compare`.

## Medium

- [x] **#6 — "Ad slot" placeholder text is live in production.** Two dashed empty boxes render on homepage and finder. Hide until real content exists.

- [x] **#7 — Hero chips look interactive but do nothing.** Cashback / Lounge / Lifetime free are plain `<span>` elements styled like buttons. Make them prefill Ask or link into filtered Finder, or restyle so they don't read as interactive.

- [x] **#8 — Compare stacks cards vertically instead of a side-by-side table.** Already implemented — full `<table>` with Feature / Card A / Card B columns. Initial finding was a narrow-webview artifact.

- [x] **#9 — Implementation jargon in user-facing copy.** "Built lean with in-memory data for the MVP", "deterministic card engine", "keeps working even when the browser is having a strange day." Rewrite as user benefits.

- [x] **#10 — "No answer" state is a dead end.** "I found a likely match but it does not fit the current filters" offers no next step. Show closest cards and a link into the Finder.

## Polish

- [x] **#11 — No footer / legal disclaimer.** A money product needs: "not financial advice", data-accuracy note, affiliate disclosure for Apply links.

- [x] **#12 — Per-card SEO/OG metadata.** Every card detail page inherits the generic site title. Set `<title>` and OG tags per card.

- [x] **#13 — Rewards table has horizontal scrollbar on card detail pages.** Cosmetic but looks broken on narrow content.
