"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRef, useState } from "react";

type Update = {
  title: string;
  summary: string;
  publishedAt: string;
  sourceLabel: string;
  sourceUrl?: string;
  cardId: string;
  cardName: string;
  cardIssuer: string;
};

const PAGE_SIZE = 10;

function monthKey(publishedAt: string) {
  return publishedAt.slice(0, 7);
}

function monthLabel(key: string) {
  return new Date(`${key}-01T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function dateLabel(publishedAt: string) {
  return new Date(`${publishedAt}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

export default function UpdatesBrowser({ updates }: { updates: Update[] }) {
  const [page, setPage] = useState(0);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const pageCount = Math.ceil(updates.length / PAGE_SIZE);
  const start = page * PAGE_SIZE;
  const visibleUpdates = updates.slice(start, start + PAGE_SIZE);
  const grouped = new Map<string, Update[]>();

  for (const update of visibleUpdates) {
    const key = monthKey(update.publishedAt);
    grouped.set(key, [...(grouped.get(key) ?? []), update]);
  }

  function selectPage(nextPage: number) {
    setPage(nextPage);
    window.requestAnimationFrame(() => titleRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  return (
    <div className="updates-cards-shell">
      <section className="updates-simple-title" aria-labelledby="updates-page-title">
        <h1 id="updates-page-title" ref={titleRef}>Latest Updates</h1>
      </section>

      {updates.length === 0 ? (
        <p className="updates-empty">No updates yet. Check back soon.</p>
      ) : (
        <>
          <div className="updates-page-status" aria-live="polite">
            Showing {start + 1}–{Math.min(start + PAGE_SIZE, updates.length)} of {updates.length} updates · Page {page + 1} of {pageCount}
          </div>
          <div className="updates-rows-stack">
            {Array.from(grouped.entries()).map(([key, monthUpdates], monthIndex) => (
              <section className="updates-row" aria-labelledby={`updates-month-${monthIndex}`} key={key}>
                <div className="updates-row-head">
                  <h2 id={`updates-month-${monthIndex}`}>{monthLabel(key)}</h2>
                </div>
                <div className="updates-list">
                  {monthUpdates.map((update) => (
                    <article className="updates-tile" key={`${update.cardId}-${update.publishedAt}-${update.title}`}>
                      <div className="updates-tile-meta">
                        <Link className="updates-card-name" href={`/cards/${update.cardId}` as Route}>{update.cardName}</Link>
                        <time className="updates-date" dateTime={update.publishedAt}>{dateLabel(update.publishedAt)}</time>
                      </div>
                      <div className="updates-tile-art">
                        <span className="updates-issuer">{update.cardIssuer}</span>
                        <h3 className="updates-title">{update.title}</h3>
                      </div>
                      <div className="updates-tile-copy">
                        <p className="updates-summary">{update.summary}</p>
                        {update.sourceUrl ? (
                          <a className="updates-source" href={update.sourceUrl} rel="nofollow noopener noreferrer" target="_blank">
                            Source: {update.sourceLabel} ↗
                          </a>
                        ) : (
                          <span className="updates-source updates-source-plain">Source: {update.sourceLabel}</span>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
          <nav className="updates-pagination" aria-label="Updates pagination">
            {Array.from({ length: pageCount }, (_, index) => (
              <button
                className="updates-page-button"
                type="button"
                aria-current={index === page ? "page" : undefined}
                aria-label={`Go to updates page ${index + 1}`}
                onClick={() => selectPage(index)}
                key={index}
              >
                {index + 1}
              </button>
            ))}
          </nav>
        </>
      )}
    </div>
  );
}
