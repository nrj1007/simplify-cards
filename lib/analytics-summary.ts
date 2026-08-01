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
  ask_result_count: number;
  ask_anonymous_result_count: number;
  ask_empty_referrer_result_count: number;
  apply_clicks_by_card: Record<string, number>;
  apply_clicks_by_card_source: Record<string, Partial<Record<AnalyticsSource, number>>>;
  ai_result_count: number;
  ai_schema_call_count: number;
  ai_provider_attempt_count: number;
  ai_successful_schema_call_count: number;
  ai_failed_schema_call_count: number;
  ai_fallback_result_count: number;
  ai_calls_by_purpose: Record<string, number>;
  ai_provider_attempts: Record<string, number>;
  ai_results_by_intent: Record<string, number>;
  zero_result_queries: StoredAnalyticsEvent[];
  bot_like_ask_queries: StoredAnalyticsEvent[];
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
  botLikeAskQueries: StoredAnalyticsEvent[];
  dailyUsageRows: Array<{ date: string; count: number }>;
  aiUsage: {
    resultCount: number;
    schemaCallCount: number;
    providerAttemptCount: number;
    successfulSchemaCallCount: number;
    failedSchemaCallCount: number;
    fallbackResultCount: number;
    callsByPurpose: Array<{ label: string; count: number }>;
    providerAttempts: Array<{ label: string; count: number }>;
    resultsByIntent: Array<{ label: string; count: number }>;
  };
  askSignals: {
    resultCount: number;
    anonymousResultCount: number;
    emptyReferrerResultCount: number;
    botLikeQueryCount: number;
  };
};

const MAX_STORED_QUERY_LABELS = 250;
const MAX_STORED_ZERO_RESULT_QUERIES = 100;
const MAX_STORED_BOT_LIKE_QUERIES = 100;

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
    ask_result_count: 0,
    ask_anonymous_result_count: 0,
    ask_empty_referrer_result_count: 0,
    apply_clicks_by_card: {},
    apply_clicks_by_card_source: {},
    ai_result_count: 0,
    ai_schema_call_count: 0,
    ai_provider_attempt_count: 0,
    ai_successful_schema_call_count: 0,
    ai_failed_schema_call_count: 0,
    ai_fallback_result_count: 0,
    ai_calls_by_purpose: {},
    ai_provider_attempts: {},
    ai_results_by_intent: {},
    zero_result_queries: [],
    bot_like_ask_queries: []
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

function metadataNumber(event: StoredAnalyticsEvent, key: string) {
  const value = event.metadata?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function metadataString(event: StoredAnalyticsEvent, key: string) {
  const value = event.metadata?.[key];
  return typeof value === "string" ? value : undefined;
}

function metadataBoolean(event: StoredAnalyticsEvent, key: string) {
  return event.metadata?.[key] === true;
}

function getAiCallRows(event: StoredAnalyticsEvent) {
  const calls = event.metadata?.ai_calls;
  return Array.isArray(calls) ? calls.filter((call): call is Record<string, unknown> => typeof call === "object" && call !== null) : [];
}

function countProviderAttempts(call: Record<string, unknown>) {
  let attempts = 0;
  if (typeof call.primary_provider === "string") attempts += 1;
  if (call.fallback_used === true && typeof call.fallback_provider === "string") attempts += 1;
  return attempts;
}

function isBotLikeAskQuery(event: StoredAnalyticsEvent) {
  if (event.event_name !== "ask_result_rendered" || !event.query) return false;
  const normalized = event.query.toLowerCase();
  const generatedModifierMatches =
    normalized.match(/\bwith\s+(?:monthly\s+)?spend\b/g)?.length ?? 0;
  const generatedMatterMatches =
    normalized.match(/\bfor\s+(?:travel|cashback|(?:airport\s+)?lounge(?:\s+access)?|low\s+annual\s+fee)\b/g)?.length ?? 0;

  return generatedModifierMatches + generatedMatterMatches >= 4;
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

  if (event.event_name === "ask_result_rendered") {
    summary.ask_result_count = (summary.ask_result_count ?? 0) + 1;
    if (event.session_id === "anonymous") {
      summary.ask_anonymous_result_count = (summary.ask_anonymous_result_count ?? 0) + 1;
    }
    if (!event.referrer) {
      summary.ask_empty_referrer_result_count = (summary.ask_empty_referrer_result_count ?? 0) + 1;
    }

    const aiCalls = getAiCallRows(event);
    if (aiCalls.length > 0 || metadataBoolean(event, "ai_attempted") || metadataBoolean(event, "ai_used")) {
      const schemaCallCount = metadataNumber(event, "ai_schema_call_count") || aiCalls.length;
      const providerAttemptCount =
        metadataNumber(event, "ai_provider_attempt_count") ||
        aiCalls.reduce((total, call) => total + countProviderAttempts(call), 0);

      summary.ai_result_count = (summary.ai_result_count ?? 0) + 1;
      summary.ai_schema_call_count = (summary.ai_schema_call_count ?? 0) + schemaCallCount;
      summary.ai_provider_attempt_count = (summary.ai_provider_attempt_count ?? 0) + providerAttemptCount;
      summary.ai_successful_schema_call_count =
        (summary.ai_successful_schema_call_count ?? 0) +
        (metadataNumber(event, "ai_successful_schema_call_count") ||
          aiCalls.filter((call) => call.success === true).length);
      summary.ai_failed_schema_call_count =
        (summary.ai_failed_schema_call_count ?? 0) +
        (metadataNumber(event, "ai_failed_schema_call_count") ||
          aiCalls.filter((call) => call.success === false).length);
      if (metadataBoolean(event, "ai_fallback_used")) {
        summary.ai_fallback_result_count = (summary.ai_fallback_result_count ?? 0) + 1;
      }
      addCount(summary.ai_results_by_intent, metadataString(event, "intent"));

      for (const call of aiCalls) {
        addCount(summary.ai_calls_by_purpose, typeof call.purpose === "string" ? call.purpose : undefined);
        addCount(summary.ai_provider_attempts, typeof call.primary_provider === "string" ? call.primary_provider : undefined);
        if (call.fallback_used === true) {
          addCount(summary.ai_provider_attempts, typeof call.fallback_provider === "string" ? call.fallback_provider : undefined);
        }
      }
    }
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

  if (isBotLikeAskQuery(event)) {
    summary.bot_like_ask_queries = [event, ...(summary.bot_like_ask_queries ?? [])]
      .sort((left, right) => right.received_at.localeCompare(left.received_at))
      .slice(0, MAX_STORED_BOT_LIKE_QUERIES);
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
  const botLikeAskQueries: StoredAnalyticsEvent[] = [];
  const dailyCounts = new Map(dailyDateKeys.map((date) => [date, 0]));
  const eventWindowDateSet = new Set(eventWindowDateKeys);
  let eventsLoaded = 0;
  let last30DayEvents = 0;
  let askResultCount = 0;
  let askAnonymousResultCount = 0;
  let askEmptyReferrerResultCount = 0;
  let aiResultCount = 0;
  let aiSchemaCallCount = 0;
  let aiProviderAttemptCount = 0;
  let aiSuccessfulSchemaCallCount = 0;
  let aiFailedSchemaCallCount = 0;
  let aiFallbackResultCount = 0;
  const aiCallsByPurpose: Record<string, number> = {};
  const aiProviderAttempts: Record<string, number> = {};
  const aiResultsByIntent: Record<string, number> = {};

  for (const summary of summaries) {
    eventsLoaded += summary.total_events;
    if (eventWindowDateSet.has(summary.date)) last30DayEvents += summary.total_events;
    if (dailyCounts.has(summary.date)) dailyCounts.set(summary.date, summary.total_events);

    for (const [query, count] of Object.entries(summary.ask_queries)) addCount(topAskQueryCounts, query, count);
    for (const [cardId, count] of Object.entries(summary.apply_clicks_by_card)) addCount(applyCounts, cardId, count);
    askResultCount += summary.ask_result_count ?? 0;
    askAnonymousResultCount += summary.ask_anonymous_result_count ?? 0;
    askEmptyReferrerResultCount += summary.ask_empty_referrer_result_count ?? 0;
    aiResultCount += summary.ai_result_count ?? 0;
    aiSchemaCallCount += summary.ai_schema_call_count ?? 0;
    aiProviderAttemptCount += summary.ai_provider_attempt_count ?? 0;
    aiSuccessfulSchemaCallCount += summary.ai_successful_schema_call_count ?? 0;
    aiFailedSchemaCallCount += summary.ai_failed_schema_call_count ?? 0;
    aiFallbackResultCount += summary.ai_fallback_result_count ?? 0;

    for (const [purpose, count] of Object.entries(summary.ai_calls_by_purpose ?? {})) addCount(aiCallsByPurpose, purpose, count);
    for (const [provider, count] of Object.entries(summary.ai_provider_attempts ?? {})) addCount(aiProviderAttempts, provider, count);
    for (const [intent, count] of Object.entries(summary.ai_results_by_intent ?? {})) addCount(aiResultsByIntent, intent, count);

    for (const [cardId, sourceCounts] of Object.entries(summary.apply_clicks_by_card_source)) {
      const merged = applySourceCounts[cardId] ?? {};
      for (const [source, count] of Object.entries(sourceCounts)) addCount(merged, source, count);
      applySourceCounts[cardId] = merged;
    }

    zeroResultQueries.push(...summary.zero_result_queries);
    botLikeAskQueries.push(...(summary.bot_like_ask_queries ?? []));
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
    botLikeAskQueries: botLikeAskQueries
      .sort((left, right) => right.received_at.localeCompare(left.received_at))
      .slice(0, 50),
    dailyUsageRows: dailyDateKeys.map((date) => ({ date, count: dailyCounts.get(date) ?? 0 })),
    aiUsage: {
      resultCount: aiResultCount,
      schemaCallCount: aiSchemaCallCount,
      providerAttemptCount: aiProviderAttemptCount,
      successfulSchemaCallCount: aiSuccessfulSchemaCallCount,
      failedSchemaCallCount: aiFailedSchemaCallCount,
      fallbackResultCount: aiFallbackResultCount,
      callsByPurpose: sortedCountRows(aiCallsByPurpose),
      providerAttempts: sortedCountRows(aiProviderAttempts),
      resultsByIntent: sortedCountRows(aiResultsByIntent)
    },
    askSignals: {
      resultCount: askResultCount,
      anonymousResultCount: askAnonymousResultCount,
      emptyReferrerResultCount: askEmptyReferrerResultCount,
      botLikeQueryCount: botLikeAskQueries.length
    }
  };
}
