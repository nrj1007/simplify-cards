# Plan B — Trust & disclosure pages (E-E-A-T)

## Context
SimplifyCards is a financial-products comparison site — a "Your Money or Your Life" (YMYL) topic
where Google weighs **E-E-A-T** (Experience, Expertise, Authoritativeness, Trust) heavily, and where
ad/affiliate networks (e.g. AdSense, card affiliate programs) expect clear disclosures. The site
ranks and scores cards but has **no page explaining how**, and its affiliate disclosure is only
embedded inside Terms + a footer line. Two dedicated pages close this gap and strengthen both SEO
trust signals and compliance.

This plan adds two new content pages that mirror the existing About/legal page pattern. It assumes
the About/Contact/Privacy/Terms work (already on `main`, commit `b58814b`) as the template.

## Files to change / add

### 1. Methodology — "How we rate cards" (`app/methodology/page.tsx`, new `/methodology`)
Server component using the established pattern (`.page-shell` → `PageHero` → `.page-content` →
`.container` → `.about-grid` / `.panel.about-card`), like `app/about/page.tsx`.
Content is **grounded in the real scoring engine** (no invented claims), summarised from
`lib/AGENTS.md` and `lib/recommend.ts` for a general audience:
- **Verified-data-first principle** — every number traces to the manually verified `data/cards/`
  dataset; the AI phrases, never invents (core project principle in `AGENTS.md`).
- **How fit is scored** — net value after fees in rupees + relevance, at realistic spend; mention
  the ranking modes at a high level (category-focus, fuel, segment/fee-band, forex, lounge, UPI)
  without exposing internals. Reference `scoreCards` behaviour described in `lib/AGENTS.md`.
- **What we surface** — fees, reward caps, exclusions, redemption value, lounge conditions shown
  alongside headline benefits.
- **Limitations & verification** — terms change; always confirm with the issuer. Link to `/contact`
  for corrections and to `/about`.
- Metadata via `buildPageMetadata({ title: "How We Rate Cards", description: "...", path: "/methodology" })`.

### 2. Affiliate / Advertising Disclosure (`app/disclosure/page.tsx`, new `/disclosure`)
Same page pattern; uses the `legal-page` styling already added in `app/globals.css` for long-form.
Content (consistent with existing Terms §4 and the footer disclosure line, expanded):
- Plain-language statement that some "Apply" buttons are affiliate/`rel="sponsored"` links and may
  earn commission; "Check official site" links are non-affiliate (`rel="nofollow"`) — matches the
  repo convention in `AGENTS.md`.
- Commission never changes the card's terms or our rankings; ranking is value-based (link to
  `/methodology`).
- "Not financial advice" reminder; link to `/terms` and `/privacy`.
- Contact `contact@simplifycards.in` for questions.
- Metadata via `buildPageMetadata({ title: "Advertising Disclosure", ..., path: "/disclosure" })`.

### 3. Footer links — `app/layout.tsx`
Add both pages to the existing **Company** group (currently About, Contact us, Privacy Policy,
Terms & Conditions): insert `How we rate cards` (`/methodology`) and `Advertising Disclosure`
(`/disclosure`). Inline `href`s need no `as Route` cast once the routes exist (existing Company
links use `as Route`; match the surrounding style). Six items in one column may be tall — if so,
keep Product+Company balanced, or leave as-is and confirm visually after build.

### 4. Cross-links for E-E-A-T weight
- **`app/about/page.tsx`** — add a link to `/methodology` from the "Data first, AI second" card
  (it already has a `/contact` link to follow as a pattern).
- Optionally, surface a small "How we rate cards" link near rankings on `/recommend` and the SEO
  "best …" landing pages — defer unless the user wants it; the footer + about links are enough to
  start.

### 5. SEO — `app/sitemap.ts`
Add `/methodology` and `/disclosure` to `STATIC_ROUTES` (line 7), alongside the existing
`/about`,`/contact`,`/privacy`,`/terms`.

## Reuse notes
- Template pages: `app/about/page.tsx` (grid layout), `app/privacy/page.tsx` / `app/terms/page.tsx`
  (`legal-page` long-form layout already styled in `app/globals.css`).
- `buildPageMetadata` — `lib/seo.ts`. `PageHero` — `app/ui/PageHero.tsx`.
- Classes already defined: `.legal-page`, `.legal-updated`, `.text-link`, `.about-grid`,
  `.panel.about-card`, `.about-list` (`app/globals.css`). No new CSS expected.
- Source material (do NOT invent): project principle in root `AGENTS.md`; scoring/ranking-mode
  descriptions in `lib/AGENTS.md` and `lib/recommend.ts`; affiliate link conventions in `AGENTS.md`.

## Verification
1. `npm run dev` (`next dev --webpack` on this box).
2. Visit `/methodology` and `/disclosure` — hero + panels render, internal links (`/contact`,
   `/terms`, `/privacy`, `/methodology`) work, no overlap.
3. Footer shows both new links under Company on every page; they navigate (no 404, no typedRoutes
   TS error).
4. `/about` links out to `/methodology`.
5. `npm run build` then `npm run lint` — must pass (typedRoutes picks up new routes at build).
6. Confirm `/sitemap.xml` lists `/methodology` and `/disclosure`.
7. Commit and push to `main` per the repo workflow.

## Sequencing note
Plan B depends only on the page pattern, not on Plan A. Recommended order: **Plan A first**
(launch blockers — especially `/review` protection), then Plan B (trust pages). They touch a couple
of the same files (`app/layout.tsx` footer, `app/sitemap.ts`, `app/about/page.tsx`), so do them in
sequence to avoid trivial conflicts.
