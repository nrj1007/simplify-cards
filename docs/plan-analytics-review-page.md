# Plan 4 — Analytics review page at /review/analytics

## Context

`lib/analytics-logs.ts` appends `StoredAnalyticsEvent` JSONL records to a log file under
`data/` every time `POST /api/analytics` is called. `AnalyticsMount` fires events from the
client (page views, apply clicks) and the ask/feedback routes fire server-side events on
`ask_query_submitted`, `feedback_submitted`, etc.

Nothing reads these logs. The `/review/` section has `questions`, `community`, and `inbox` pages
but no analytics page. The product team has no visibility into:
- Which queries users are actually asking
- Which cards are getting apply clicks and from which pages
- How many queries return zero results
- Daily usage trends

This plan adds a server-rendered `/review/analytics` page that reads the JSONL log and surfaces
the most useful aggregations — no database, just in-memory grouping of the flat log on each
server render (acceptable at current traffic scale).

## Files to change / add

### 1. `lib/analytics-logs.ts` — add `readAnalyticsLog()`

Currently the file has only write/path helpers — `getAnalyticsEventsLogPath()`,
`appendAnalyticsEvent()`, and `logAnalyticsEvent()` (the public write entry, called by the
api/feedback routes). Add a read helper:

```ts
export async function readAnalyticsLog(limit = 5000): Promise<StoredAnalyticsEvent[]> {
  const logPath = getAnalyticsEventsLogPath();
  try {
    const raw = await fs.readFile(logPath, "utf-8");
    const lines = raw.trim().split("\n").filter(Boolean);
    // Read last `limit` lines to avoid loading unbounded history
    return lines
      .slice(-limit)
      .map((line) => {
        try { return JSON.parse(line) as StoredAnalyticsEvent; }
        catch { return null; }
      })
      .filter((e): e is StoredAnalyticsEvent => e !== null);
  } catch {
    return []; // log file doesn't exist yet
  }
}
```

### 2. `app/review/analytics/page.tsx` (new)

Server component. Reads the log, groups by event type, and renders four panels.

**Field shape (important):** `StoredAnalyticsEvent` (`lib/analytics.ts`) is **flat** — fields
are top-level on the event, not nested under a `payload` key. The fields are `event_name`,
`received_at` (ISO timestamp — this is the only timestamp, there is no `stored_at`),
`session_id`, `page`, `source`, `query?`, `card_id?`, `card_ids?`, `device_type`, `referrer`,
`metadata?`. Reference them as `event.query`, `event.card_id`, `event.received_at`, etc.

**Panel A — Top ask queries (last 30 days)**
Group `ask_query_submitted` events by `event.query`, count occurrences, sort descending,
show top 25. Helps identify popular queries and scoring gaps.

**Panel B — Apply clicks by card**
Group `apply_clicked` events by `event.card_id`, count occurrences, join card name from the
in-memory card index (`getCardById`), sort descending, show top 20. Shows which cards are
converting.

**Panel C — Apply source breakdown**
For the top-10 clicked cards, show the breakdown by `event.source` (ask / finder / recommend /
details / compare). Helps understand which page drives most affiliate traffic.

**Panel D — Zero-result / unsupported queries**
Pull `ask_result_rendered` events where `event.card_ids` is empty (`(event.card_ids?.length ?? 0)
=== 0`) — that event carries the result card list in `card_ids` (see `app/ask/page.tsx`), so an
empty array is the zero-result signal. Also include events where `event.metadata?.intent ===
"unsupported"` if that key is present. Show the raw `event.query` strings, newest first, limit 50.
Cross-reference with the existing `/review/questions` unsupported log.

**Panel E — Daily usage (simple)**
Group all events by calendar date (`event.received_at.slice(0, 10)`), count total events per day,
show a text table for the last 14 days. Enough to see if traffic is growing.

Structure (reuse the review layout):

```tsx
// app/review/analytics/page.tsx
import { readAnalyticsLog } from "@/lib/analytics-logs";
import { getCardById } from "@/lib/cards";

export const dynamic = "force-dynamic"; // never cache — always fresh log

export default async function AnalyticsReviewPage() {
  const events = await readAnalyticsLog(10000);
  // ... derive the five panels
  return (
    <div className="container">
      <h1>Analytics</h1>
      {/* panels */}
    </div>
  );
}
```

Use `export const dynamic = "force-dynamic"` so the page is never statically cached — the log
file changes with every request.

### 3. `app/review/layout.tsx` — no change needed

The existing review layout already applies `noindex` metadata, so `/review/analytics` is
automatically noindexed.

## Aggregation notes

- Date-filter to last 30 days for panels A–C; last 14 days for panel E. Filter by
  `new Date(event.received_at) > thirtyDaysAgo`.
- Do the grouping in the server component, not in `analytics-logs.ts` — the log module stays
  a thin I/O layer; aggregation is view-specific logic.
- If the log file is empty or missing, show an "No data yet" state in each panel gracefully.

## What NOT to do

- Don't add a database or caching layer yet — JSONL is fine until traffic demands otherwise.
- Don't expose this page publicly — it's already behind `/review/` which is `noindex` and
  the `robots.ts` disallows it from crawlers.
- Don't add real-time streaming — a simple server render on each page load is correct here.
