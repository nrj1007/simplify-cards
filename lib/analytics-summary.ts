import { getCardById } from "./cards";
import type { AnalyticsSource, StoredAnalyticsEvent } from "./analytics";
import {
  isDurableRecordStorageConfigured,
  isVercelRuntime,
  readKeyedDurableRecord,
  upsertDurableRecord
} from "./durable-records";

export type AnalyticsDailySummary = {
  date: string;
  updated_at: string;
  total_events: number;
  event_counts: Record<string, number>;
  page_counts: Record<string, number>;
  source_counts: Record<string, number>;
  device_counts: Record<string, number>;
  ask_queries: Record<string, number>;
  apply_clicks_by_card: Record<string, number>;
  apply_clicks_by_card_source: Record<string, Partial<Record<AnalyticsSource, number>>>;
  zero_result_queries: StoredAnalyticsEvent[];
};

export type AnalyticsReviewSummary = {
  eventsLoaded: number;
  last30DayEvents: number;
  topAskQueries: Array<{ label: string; count: number }>;
  applyRows: Array<{ cardId: string; cardName: string; count: number }>;
  sourceBreakdown: Array<{
    cardId: string;
    cardName: string;
    count: number;
    sources: Array<{ source: AnalyticsSource; count: number }>;
  }>;
  zeroResultQueries: StoredAnalyticsEvent[];
  dailyUsageRows: Array<{ date: string; count: number }>;
};

const MAX_STORED_QUERY_LABELS = 250;
const MAX_STORED_ZERO_RESULT_QUERIES = 100;

function emptyDailySummary(date: string, now = new Date().toISOString()): AnalyticsDailySummary {
  return {
    date,
    updated_at: now,
    total_events: 0,
    event_counts: {},
    page_counts: {},
    source_counts: {},
    device_counts: {},
    ask_queries: {},
    apply_clicks_by_card: {},
    apply_clicks_by_card_source: {},
    zero_result_queries: []
  };
}

function addCount(counts: Record<string, number>, label: string | undefined, amount = 1) {
  const normalized = label?.trim();
  if (!normalized) return;
  counts[normalized] = (counts[normalized] ?? 0) + amount;
}

function sortedCountRows(counts: Record<string, number>) {
  return Object.entries(counts)
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}

function pruneCountMap(counts: Record<string, number>, maxEntries: number) {
  return Object.fromEntries(sortedCountRows(counts).slice(0, maxEntries).map((row) => [row.label, row.count]));
}

function isZeroResultEvent(event: StoredAnalyticsEvent) {
  return (
    event.event_name === "ask_result_rendered" &&
    Boolean(event.query) &&
    ((event.card_ids?.length ?? 0) === 0 || event.metadata?.intent === "unsupported")
  );
}

export function getAnalyticsDateKeys(days: number, now = new Date()) {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - index);
    return date.toISOString().slice(0, 10);
  });
}

export function addEventToDailySummary(summary: AnalyticsDailySummary, event: StoredAnalyticsEvent) {
  summary.total_events += 1;
  summary.updated_at = new Date().toISOString();
  addCount(summary.event_counts, event.event_name);
  addCount(summary.page_counts, event.page);
  addCount(summary.source_counts, event.source);
  addCount(summary.device_counts, event.device_type);

  if (event.event_name === "ask_query_submitted") {
    addCount(summary.ask_queries, event.query);
    summary.ask_queries = pruneCountMap(summary.ask_queries, MAX_STORED_QUERY_LABELS);
  }

  if (event.event_name === "apply_clicked" && event.card_id) {
    addCount(summary.apply_clicks_by_card, event.card_id);
    const sourceCounts = summary.apply_clicks_by_card_source[event.card_id] ?? {};
    addCount(sourceCounts, event.source);
    summary.apply_clicks_by_card_source[event.card_id] = sourceCounts;
  }

  if (isZeroResultEvent(event)) {
    summary.zero_result_queries = [event, ...summary.zero_result_queries]
      .sort((left, right) => right.received_at.localeCompare(left.received_at))
      .slice(0, MAX_STORED_ZERO_RESULT_QUERIES);
  }

  return summary;
}

export function buildDailySummaryFromEvents(date: string, events: StoredAnalyticsEvent[]) {
  return events.reduce((summary, event) => addEventToDailySummary(summary, event), emptyDailySummary(date));
}

export async function updateAnalyticsDailySummary(event: StoredAnalyticsEvent) {
  if (!isVercelRuntime() || !isDurableRecordStorageConfigured()) return;

  const date = event.received_at.slice(0, 10);
  if (!date) return;

  const existing = await readKeyedDurableRecord<AnalyticsDailySummary>("analytics-daily", date).catch(() => null);
  const summary = addEventToDailySummary(existing ?? emptyDailySummary(date), event);
  await upsertDurableRecord("analytics-daily", date, summary);
}

export async function readAnalyticsDailySummaries(dateKeys: string[]) {
  if (!isVercelRuntime() || !isDurableRecordStorageConfigured()) return [];

  const summaries = await Promise.all(
    dateKeys.map(async (date) => readKeyedDurableRecord<AnalyticsDailySummary>("analytics-daily", date).catch(() => null))
  );

  return summaries.filter((summary): summary is AnalyticsDailySummary => summary !== null);
}

export function mergeDailySummaries(
  summaries: AnalyticsDailySummary[],
  dailyDateKeys: string[],
  eventWindowDateKeys: string[]
): AnalyticsReviewSummary {
  const topAskQueryCounts: Record<string, number> = {};
  const applyCounts: Record<string, number> = {};
  const applySourceCounts: Record<string, Partial<Record<AnalyticsSource, number>>> = {};
  const zeroResultQueries: StoredAnalyticsEvent[] = [];
  const dailyCounts = new Map(dailyDateKeys.map((date) => [date, 0]));
  const eventWindowDateSet = new Set(eventWindowDateKeys);
  let eventsLoaded = 0;
  let last30DayEvents = 0;

  for (const summary of summaries) {
    eventsLoaded += summary.total_events;
    if (eventWindowDateSet.has(summary.date)) last30DayEvents += summary.total_events;
    if (dailyCounts.has(summary.date)) dailyCounts.set(summary.date, summary.total_events);

    for (const [query, count] of Object.entries(summary.ask_queries)) addCount(topAskQueryCounts, query, count);
    for (const [cardId, count] of Object.entries(summary.apply_clicks_by_card)) addCount(applyCounts, cardId, count);

    for (const [cardId, sourceCounts] of Object.entries(summary.apply_clicks_by_card_source)) {
      const merged = applySourceCounts[cardId] ?? {};
      for (const [source, count] of Object.entries(sourceCounts)) addCount(merged, source, count);
      applySourceCounts[cardId] = merged;
    }

    zeroResultQueries.push(...summary.zero_result_queries);
  }

  const applyRows = sortedCountRows(applyCounts).map((row) => {
    const card = getCardById(row.label);
    return {
      cardId: row.label,
      cardName: card?.name ?? row.label,
      count: row.count
    };
  });

  return {
    eventsLoaded,
    last30DayEvents,
    topAskQueries: sortedCountRows(topAskQueryCounts).slice(0, 25),
    applyRows,
    sourceBreakdown: applyRows.slice(0, 10).map((row) => ({
      ...row,
      sources: Object.entries(applySourceCounts[row.cardId] ?? {})
        .map(([source, count]) => ({ source: source as AnalyticsSource, count }))
        .sort((left, right) => right.count - left.count || left.source.localeCompare(right.source))
    })),
    zeroResultQueries: zeroResultQueries
      .sort((left, right) => right.received_at.localeCompare(left.received_at))
      .slice(0, 50),
    dailyUsageRows: dailyDateKeys.map((date) => ({ date, count: dailyCounts.get(date) ?? 0 }))
  };
}
