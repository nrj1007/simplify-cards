# Plan 7 — Card news / changelog page at /latest

## Context

`data/card-content.json` currently holds 20 cards' editorial content: 31 updates (devaluations,
benefit changes, new features) and 20 tips. `lib/card-content.ts` exposes `getCardContent(cardId)`
which returns up to 3 updates sorted newest-first, and `hasCardContent(cardId)`.

This data is only surfaced on individual card detail pages (via `getCardContent`). There is no
aggregated view, so:
- Users who visit once have no reason to return
- Search engines see no "freshness signal" page
- Devaluations and benefit changes (high-intent queries) have no dedicated URL

A `/latest` page — a chronological feed of card updates across all cards — directly addresses
these gaps. It drives repeat visits ("what changed this month?"), earns long-tail queries
("SBI Cashback devaluation 2026"), and gives the editorial team a visible output surface
that motivates keeping `card-content.json` up to date.

## Files to change / add

### 1. `lib/card-content.ts` — add `getAllUpdates(limit?)`

```ts
import { cards } from "./cards"; // import the card index for name/issuer lookup

export type CardUpdateWithMeta = CardUpdate & {
  cardId: string;
  cardName: string;
  cardIssuer: string;
};

export function getAllUpdates(limit = 50): CardUpdateWithMeta[] {
  const result: CardUpdateWithMeta[] = [];

  for (const card of cards) {
    const entry = cardContent[card.id];
    if (!entry?.updates) continue;
    for (const update of entry.updates) {
      result.push({
        ...update,
        cardId: card.id,
        cardName: card.name,
        cardIssuer: card.issuer
      });
    }
  }

  return result
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, limit);
}
```

No circular import: `lib/cards.ts` re-exports `lib/card-index.ts`; `lib/card-content.ts`
currently only imports the JSON. Adding `cards` from `./cards` is safe because `card-index.ts`
does not import `card-content.ts`.

### 2. `app/latest/page.tsx` (new)

Server component. Groups updates by month and renders a clean timeline feed.

```tsx
import Link from "next/link";
import type { Metadata, Route } from "next";
import { getAllUpdates } from "@/lib/card-content";
import { buildPageMetadata } from "@/lib/seo";
import PageHero from "@/app/ui/PageHero";

export const metadata: Metadata = buildPageMetadata({
  title: "Latest Card Updates — SimplifyCards",
  description:
    "Recent Indian credit card changes: reward devaluations, new benefits, fee revisions, and lounge policy updates. Updated as changes are verified.",
  path: "/latest"
});

export default function LatestPage() {
  const updates = getAllUpdates(100);

  // Group by "Month Year"
  const byMonth = new Map<string, typeof updates>();
  for (const u of updates) {
    const monthKey = u.publishedAt.slice(0, 7); // "2026-05"
    if (!byMonth.has(monthKey)) byMonth.set(monthKey, []);
    byMonth.get(monthKey)!.push(u);
  }

  const monthLabel = (key: string) =>
    new Date(key + "-01").toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  return (
    <div className="page-shell">
      <PageHero
        eyebrow="News & Updates"
        title="Latest card changes"
        lead="Verified reward devaluations, benefit updates, and fee revisions — as they happen."
      />
      <section className="page-content">
        <div className="container">
          {updates.length === 0 ? (
            <p className="muted">No updates yet.</p>
          ) : (
            Array.from(byMonth.entries()).map(([monthKey, monthUpdates]) => (
              <section key={monthKey} className="latest-month-group">
                <h2 className="latest-month-heading">{monthLabel(monthKey)}</h2>
                <div className="latest-feed">
                  {monthUpdates.map((u, i) => (
                    <article key={i} className="latest-entry panel">
                      <div className="latest-entry-meta">
                        <Link href={`/cards/${u.cardId}` as Route} className="latest-card-name">
                          {u.cardName}
                        </Link>
                        <span className="latest-issuer">{u.cardIssuer}</span>
                        <time className="latest-date" dateTime={u.publishedAt}>
                          {new Date(u.publishedAt).toLocaleDateString("en-IN", {
                            day: "numeric", month: "short", year: "numeric"
                          })}
                        </time>
                      </div>
                      <h3 className="latest-title">{u.title}</h3>
                      <p className="latest-summary">{u.summary}</p>
                      {u.sourceUrl && (
                        <a
                          href={u.sourceUrl}
                          target="_blank"
                          rel="nofollow noopener noreferrer"
                          className="latest-source"
                        >
                          Source: {u.sourceLabel}
                        </a>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
```

### 3. `app/sitemap.ts` — add `/latest`

In `STATIC_ROUTES`:

```ts
const STATIC_ROUTES = [
  "/", "/ask", "/recommend", "/finder", "/calculator", "/compare",
  "/about", "/contact", "/privacy", "/terms", "/methodology", "/disclosure",
  "/latest"   // ADD
];
```

Change frequency `"weekly"`, priority `0.8`.

### 4. Nav / footer — link to `/latest`

Add a "Latest" or "Card News" link to the footer (under `app/layout.tsx` or the footer
section of `globals.css`). This is a low-friction entry point that signals freshness to
crawlers visiting from the homepage.

Optionally: add a "New" badge or update count to the footer link when there are updates in
the last 30 days (derive server-side in `app/layout.tsx` using `getAllUpdates`).

### 5. `app/globals.css` — add `.latest-*` styles

Minimal additions — the card detail page's `.update-entry` styles are a good reference for
the entry shape. Use `.panel` for the card wrapper and reuse `.page-hero-lead` for the lead.

## Card-content editorial workflow

This plan makes the feed more visible, which should motivate keeping it current. The editorial
workflow stays the same:
- When a card benefit changes, add an entry to `data/card-content.json` under the card's ID.
- Use `publishedAt: "YYYY-MM-DD"` (ISO date, string).
- `sourceType: "manual"` for direct issuer verification; `"technofino"` for community-sourced.
- Run `npm run validate:cards` (card JSON) and `npx tsc --noEmit` after any content change.

## Verification

1. Visit `/latest` — confirm updates appear grouped by month, newest first.
2. Click a card name — confirm it links to the correct `/cards/<id>` page.
3. Click a source link — confirm it opens the external source with `rel="nofollow"`.
4. If no updates exist yet, confirm the page renders a graceful empty state.
5. Check page source for correct `<title>` and `<meta name="description">`.
6. Confirm `/latest` appears in the sitemap output (`/sitemap.xml`).
