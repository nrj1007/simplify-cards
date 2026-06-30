import type { Metadata, Route } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import PageHero from "@/app/ui/PageHero";
import { getAllUpdates, type CardUpdateWithMeta } from "@/lib/card-content";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Latest Credit Card Updates",
  description:
    "Recent Indian credit card changes: reward devaluations, new benefits, fee revisions, and lounge policy updates — verified against official sources.",
  path: "/latest"
});

function monthKey(publishedAt: string) {
  return publishedAt.slice(0, 7); // "2026-05"
}

function monthLabel(key: string) {
  return new Date(`${key}-01T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function entryDateLabel(publishedAt: string) {
  return new Date(`${publishedAt}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

export default function LatestPage() {
  const updates = getAllUpdates(100);

  const byMonth = new Map<string, CardUpdateWithMeta[]>();
  for (const update of updates) {
    const key = monthKey(update.publishedAt);
    const group = byMonth.get(key);
    if (group) {
      group.push(update);
    } else {
      byMonth.set(key, [update]);
    }
  }

  return (
    <div className="page-shell">
      <PageHero
        eyebrow="News & Updates"
        title="Latest card changes"
        lead="Verified reward devaluations, benefit updates, and fee revisions — as we confirm them against official sources."
      />

      <section className="page-content">
        <div className="container">
          {updates.length === 0 ? (
            <p className="muted">No updates yet. Check back soon.</p>
          ) : (
            Array.from(byMonth.entries()).map(([key, monthUpdates]) => (
              <section className="latest-month-group" key={key}>
                <h2 className="latest-month-heading">{monthLabel(key)}</h2>
                <div className="latest-feed">
                  {monthUpdates.map((update) => (
                    <article className="panel latest-entry" key={`${update.cardId}-${update.publishedAt}-${update.title}`}>
                      <div className="latest-entry-meta">
                        <Link className="latest-card-name" href={`/cards/${update.cardId}` as Route}>
                          {update.cardName}
                        </Link>
                        <span className="latest-issuer">{update.cardIssuer}</span>
                        <time className="latest-date" dateTime={update.publishedAt}>
                          {entryDateLabel(update.publishedAt)}
                        </time>
                      </div>
                      <h3 className="latest-title">{update.title}</h3>
                      <p className="latest-summary">{update.summary}</p>
                      {update.sourceUrl ? (
                        <a
                          className="latest-source"
                          href={update.sourceUrl}
                          rel="nofollow noopener noreferrer"
                          target="_blank"
                        >
                          Source: {update.sourceLabel} <ExternalLink size={14} />
                        </a>
                      ) : (
                        <span className="latest-source latest-source-plain">Source: {update.sourceLabel}</span>
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
