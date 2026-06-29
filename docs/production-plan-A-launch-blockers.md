# Plan A — Production launch blockers

## Context
Before SimplifyCards goes to production, four gaps make the site unsafe or unpolished for real
traffic. None are new marketing pages — they are protection, error handling, and platform assets
that every public site needs. This plan covers all four so the site can be productionised safely.

Findings that motivate this plan:
- **`/review/*` is publicly reachable and crawlable.** `app/review/{questions,community,inbox}/page.tsx`
  render internal question/feedback/community logs (e.g. `readUnsupportedQuestionLog()` from
  `lib/question-logs.ts`). There is **no middleware, no auth**, and `app/robots.ts` returns
  `allow: "/"`, so anyone — and search engines — can read this data.
- **No custom 404 or error boundary.** No `app/not-found.tsx`, `app/error.tsx`, or
  `app/global-error.tsx`. A bad `/cards/<id>` or a thrown render error shows Next's bare default.
- **No favicon / app icons / manifest.** No `app/favicon.ico`, `app/icon.*`, `app/apple-icon.*`,
  or `app/manifest.ts`. Tabs, bookmarks, and installs get the Next default mark.
- **No default social share image.** `lib/seo.ts:27` (`buildOpenGraphImages`) returns `undefined`
  when no `imageUrl` is passed, and no page passes one — every shared link has no preview image and
  falls back to Twitter `summary` cards.

Stack note: Next.js 16.2.6 App Router, React 19, server components, hand-rolled CSS in
`app/globals.css` (no framework). Per repo memory, on this Windows/ARM box run the dev server with
`next dev --webpack`.

## Files to change / add

### 1. Keep `/review/*` and `/api` out of search (chosen: noindex + robots disallow)
Approach per user decision — **no auth for now**; prevent crawling/indexing only. (The pages remain
publicly reachable by direct URL — see the caveat below.)

- **`app/review/layout.tsx`** (new) — add `export const metadata = { robots: { index: false, follow: false } }`
  so every review page (`questions`, `community`, `inbox`) is served `noindex, nofollow`.
- **`app/robots.ts`** — change the single rule to `allow: "/"` **plus** `disallow: ["/review", "/api"]`,
  so compliant crawlers skip them and they stay out of the sitemap-driven index.

**Caveat to keep in mind:** `noindex` + robots only stops search engines; anyone with the URL can
still open `/review/*` and read the question/feedback/community logs. This is acceptable for an
initial launch but is **not** real access control. Revisit Basic Auth (env-based middleware) or
moving the review tooling off the public app before it matters. Leave a `TODO` note to that effect.

### 2. Custom 404 + error boundary
Reuse the existing design system (`.page-shell` → `PageHero` → `.page-content` → `.container` →
`.panel`), mirroring `app/about/page.tsx`.
- **`app/not-found.tsx`** (new) — server component. Friendly "Page not found" with `PageHero` and
  CTA links back to `/`, `/ask`, `/finder`.
- **`app/error.tsx`** (new) — **client component** (`"use client"`, required for error boundaries).
  Accepts `{ error, reset }`; shows a recover message + a "Try again" button calling `reset()` and a
  link home. Keep copy generic (no stack traces in prod UI).
- **`app/global-error.tsx`** (new, optional but recommended) — minimal client boundary that renders
  its own `<html><body>` for errors thrown in the root layout itself.

### 3. Favicon, app icons, web manifest
Use Next 16 file-based metadata (zero config wiring):
- **`app/icon.svg`** (or `icon.png`) and **`app/apple-icon.png`** — a simple SimplifyCards mark
  (the navbar uses the lucide `CreditCard` glyph on teal `--brand #347d78`; render that to an asset).
  `app/favicon.ico` optional once `icon` exists.
- **`app/manifest.ts`** (new) — `MetadataRoute.Manifest`: `name`/`short_name` "SimplifyCards",
  `description` from `SITE_DESCRIPTION` (`lib/seo.ts`), `theme_color` `#347d78`, `background_color`
  `#f4f3ec` (`--cream`), `display: "standalone"`, icon entries.
- Source the mark from `public/images/` conventions or generate a small SVG; keep it lightweight.

### 4. Default Open Graph / Twitter share image
- **`app/opengraph-image.tsx`** (new) — Next `ImageResponse` (1200×630) rendering "SimplifyCards"
  + tagline on the cream/teal palette, **or** drop a static `app/opengraph-image.png`. Next applies
  it as the default OG/twitter image for all routes that don't set their own.
- **`lib/seo.ts`** — optionally make `buildOpenGraphImages` fall back to a site-wide default image URL
  when `imageUrl` is omitted, and switch the twitter `card` to `summary_large_image` by default, so
  even pages using `buildPageMetadata` advertise the image explicitly. (If the `app/opengraph-image`
  file convention is used, this is belt-and-braces — pick one to avoid double tags.)

## Reuse notes
- Page chrome/classes: `app/about/page.tsx` + `app/globals.css` (`.page-shell .page-hero
  .page-content .container .panel`), `app/ui/PageHero.tsx`.
- Metadata helper: `buildPageMetadata` / `SITE_DESCRIPTION` / `SITE_URL` in `lib/seo.ts`.
- Palette tokens in `app/globals.css:8-9` (`--brand #347d78`, `--brand-strong #276762`) and
  `--cream #f4f3ec`.

## Verification
1. `npm run dev` (use `next dev --webpack` on this box; clear `.next/dev/cache` if webpack cache breaks).
2. **Review noindex:** open `/review/questions` — page still loads (no auth), but view-source shows
   `<meta name="robots" content="noindex, nofollow">`. `/robots.txt` should `Disallow: /review` and
   `/api`, and `/sitemap.xml` must not list any `/review` URL.
3. **404:** visit `/this-does-not-exist` and `/cards/not-a-real-id` → branded not-found page.
4. **Error boundary:** temporarily throw in a page (revert after) → `error.tsx` renders with working
   "Try again".
5. **Icons/manifest:** check the browser tab favicon, `/manifest.webmanifest`, and devtools
   Application → Manifest.
6. **OG image:** view-source a page and confirm `og:image`/`twitter:image` resolve; validate one URL
   in a social debugger (or curl the `/opengraph-image` route).
7. `npm run build` then `npm run lint` — must pass.
8. Commit and push to `main` per the repo workflow.

## Historical Note on Ask API Fallback
> [!NOTE]
> The Ask API fallback implementation (wrapping `/api/ask` with try-catch and returning a local database fallback on AI failures) is entangled within the same commits for Plan A. While it was originally conceived as the first iteration of Plan A (and subsequently reverted), its implementation was preserved alongside the new Plan A release assets for safety and robustness.

