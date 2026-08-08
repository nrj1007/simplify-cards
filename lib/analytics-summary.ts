import { getCardById } from "./cards";
import type { AnalyticsSource, StoredAnalyticsEvent } from "./analytics";
import {
  isDurableRecordStorageConfigured,
  isVercelRuntime,
  readKeyedDurableRecord,
  readKeyedDurableRecordWithMetadata,
  writeKeyedDurableRecord
} from "./durable-records";

export type AnalyticsDailySummary = {
  schema_version: number;
  date: string;
  updated_at: string;
  total_events: number;
  hourly_event_counts: Record<string, number>;
  event_counts: Record<string, number>;
  page_counts: Record<string, number>;
  source_counts: Record<string, number>;
  device_counts: Record<string, number>;
  request_path_counts: Record<string, number>;
  request_user_agent_family_counts: Record<string, number>;
  ask_queries: Record<string, number>;
  ask_cache_status_counts: Record<string, number>;
  ask_result_count: number;
  ask_anonymous_result_count: number;
  ask_empty_referrer_result_count: number;
  card_detail_views_by_card: Record<string, number>;
  card_detail_views_by_referrer_host: Record<string, number>;
  card_detail_views_by_traffic_class: Record<string, number>;
  card_detail_views_by_user_agent_family: Record<string, number>;
  card_detail_views_by_country: Record<string, number>;
  detail_clicks_by_card: Record<string, number>;
  detail_clicks_by_card_source: Record<string, Partial<Record<AnalyticsSource, number>>>;
  ask_detail_clicks_by_card: Record<string, number>;
  ask_query_to_card_detail_clicks: Record<string, number>;
  apply_clicks_by_card: Record<string, number>;
  apply_clicks_by_card_source: Record<string, Partial<Record<AnalyticsSource, number>>>;
  feedback_count: number;
  feedback_with_comment_count: number;
  feedback_by_value: Record<string, number>;
  feedback_by_source: Record<string, number>;
  feedback_events: StoredAnalyticsEvent[];
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
  askCacheRows: Array<{ label: string; count: number }>;
  requestPathRows: Array<{ label: string; count: number }>;
  requestUserAgentRows: Array<{ label: string; count: number }>;
  cardViewRows: Array<{ cardId: string; cardName: string; count: number }>;
  detailClickRows: Array<{ cardId: string; cardName: string; count: number }>;
  askDetailClickRows: Array<{ cardId: string; cardName: string; count: number }>;
  cardDetailApplyConversionRows: Array<{
    cardId: string;
    cardName: string;
    views: number;
    detailApplyClicks: number;
    conversionRate: number;
  }>;
  queryToCardRows: Array<{ query: string; cardId: string; cardName: string; count: number }>;
  cardViewReferrerRows: Array<{ label: string; count: number }>;
  cardViewTrafficRows: Array<{ label: string; count: number }>;
  cardViewUserAgentRows: Array<{ label: string; count: number }>;
  cardViewCountryRows: Array<{ label: string; count: number }>;
  applyRows: Array<{ cardId: string; cardName: string; count: number }>;
  sourceBreakdown: Array<{
    cardId: string;
    cardName: string;
    count: number;
    sources: Array<{ source: AnalyticsSource; count: number }>;
  }>;
  detailSourceBreakdown: Array<{
    cardId: string;
    cardName: string;
    count: number;
    sources: Array<{ source: AnalyticsSource; count: number }>;
  }>;
  feedbackEvents: StoredAnalyticsEvent[];
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
  feedback: {
    count: number;
    withCommentCount: number;
    withoutCommentCount: number;
    byValue: Array<{ label: string; count: number }>;
    bySource: Array<{ label: string; count: number }>;
  };
};

const MAX_STORED_QUERY_LABELS = 250;
const MAX_STORED_ZERO_RESULT_QUERIES = 100;
const MAX_STORED_BOT_LIKE_QUERIES = 100;
const MAX_STORED_FEEDBACK_EVENTS = 100;
const ANALYTICS_DAILY_SUMMARY_SCHEMA_VERSION = 2;
const ANALYTICS_DAILY_SUMMARY_WRITE_ATTEMPTS = 3;

function emptyDailySummary(date: string, now = new Date().toISOString()): AnalyticsDailySummary {
  return {
    schema_version: ANALYTICS_DAILY_SUMMARY_SCHEMA_VERSION,
    date,
    updated_at: now,
    total_events: 0,
    hourly_event_counts: {},
    event_counts: {},
    page_counts: {},
    source_counts: {},
    device_counts: {},
    request_path_counts: {},
    request_user_agent_family_counts: {},
    ask_queries: {},
    ask_cache_status_counts: {},
    ask_result_count: 0,
    ask_anonymous_result_count: 0,
    ask_empty_referrer_result_count: 0,
    card_detail_views_by_card: {},
    card_detail_views_by_referrer_host: {},
    card_detail_views_by_traffic_class: {},
    card_detail_views_by_user_agent_family: {},
    card_detail_views_by_country: {},
    detail_clicks_by_card: {},
    detail_clicks_by_card_source: {},
    ask_detail_clicks_by_card: {},
    ask_query_to_card_detail_clicks: {},
    apply_clicks_by_card: {},
    apply_clicks_by_card_source: {},
    feedback_count: 0,
    feedback_with_comment_count: 0,
    feedback_by_value: {},
    feedback_by_source: {},
    feedback_events: [],
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

function normalizeCountMap(value: unknown): Record<string, number> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};

  const counts: Record<string, number> = {};
  for (const [key, rawCount] of Object.entries(value)) {
    if (typeof rawCount === "number" && Number.isFinite(rawCount)) {
      counts[key] = rawCount;
    }
  }
  return counts;
}

function normalizeSourceCountMap(value: unknown): Record<string, Partial<Record<AnalyticsSource, number>>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};

  const counts: Record<string, Partial<Record<AnalyticsSource, number>>> = {};
  for (const [key, rawSourceCounts] of Object.entries(value)) {
    counts[key] = normalizeCountMap(rawSourceCounts) as Partial<Record<AnalyticsSource, number>>;
  }
  return counts;
}

function normalizeEventList(value: unknown) {
  return Array.isArray(value) ? (value.filter((item) => typeof item === "object" && item !== null) as StoredAnalyticsEvent[]) : [];
}

function normalizeDailySummary(value: AnalyticsDailySummary | null | undefined, date: string): AnalyticsDailySummary {
  const fallback = emptyDailySummary(date);
  if (typeof value !== "object" || value === null) return fallback;

  return {
    schema_version: ANALYTICS_DAILY_SUMMARY_SCHEMA_VERSION,
    date: typeof value.date === "string" && value.date ? value.date : date,
    updated_at: typeof value.updated_at === "string" && value.updated_at ? value.updated_at : fallback.updated_at,
    total_events: typeof value.total_events === "number" && Number.isFinite(value.total_events) ? value.total_events : 0,
    hourly_event_counts: normalizeCountMap(value.hourly_event_counts),
    event_counts: normalizeCountMap(value.event_counts),
    page_counts: normalizeCountMap(value.page_counts),
    source_counts: normalizeCountMap(value.source_counts),
    device_counts: normalizeCountMap(value.device_counts),
    request_path_counts: normalizeCountMap(value.request_path_counts),
    request_user_agent_family_counts: normalizeCountMap(value.request_user_agent_family_counts),
    ask_queries: normalizeCountMap(value.ask_queries),
    ask_cache_status_counts: normalizeCountMap(value.ask_cache_status_counts),
    ask_result_count: typeof value.ask_result_count === "number" && Number.isFinite(value.ask_result_count) ? value.ask_result_count : 0,
    ask_anonymous_result_count:
      typeof value.ask_anonymous_result_count === "number" && Number.isFinite(value.ask_anonymous_result_count)
        ? value.ask_anonymous_result_count
        : 0,
    ask_empty_referrer_result_count:
      typeof value.ask_empty_referrer_result_count === "number" && Number.isFinite(value.ask_empty_referrer_result_count)
        ? value.ask_empty_referrer_result_count
        : 0,
    card_detail_views_by_card: normalizeCountMap(value.card_detail_views_by_card),
    card_detail_views_by_referrer_host: normalizeCountMap(value.card_detail_views_by_referrer_host),
    card_detail_views_by_traffic_class: normalizeCountMap(value.card_detail_views_by_traffic_class),
    card_detail_views_by_user_agent_family: normalizeCountMap(value.card_detail_views_by_user_agent_family),
    card_detail_views_by_country: normalizeCountMap(value.card_detail_views_by_country),
    detail_clicks_by_card: normalizeCountMap(value.detail_clicks_by_card),
    detail_clicks_by_card_source: normalizeSourceCountMap(value.detail_clicks_by_card_source),
    ask_detail_clicks_by_card: normalizeCountMap(value.ask_detail_clicks_by_card),
    ask_query_to_card_detail_clicks: normalizeCountMap(value.ask_query_to_card_detail_clicks),
    apply_clicks_by_card: normalizeCountMap(value.apply_clicks_by_card),
    apply_clicks_by_card_source: normalizeSourceCountMap(value.apply_clicks_by_card_source),
    feedback_count: typeof value.feedback_count === "number" && Number.isFinite(value.feedback_count) ? value.feedback_count : 0,
    feedback_with_comment_count:
      typeof value.feedback_with_comment_count === "number" && Number.isFinite(value.feedback_with_comment_count)
        ? value.feedback_with_comment_count
        : 0,
    feedback_by_value: normalizeCountMap(value.feedback_by_value),
    feedback_by_source: normalizeCountMap(value.feedback_by_source),
    feedback_events: normalizeEventList(value.feedback_events),
    ai_result_count: typeof value.ai_result_count === "number" && Number.isFinite(value.ai_result_count) ? value.ai_result_count : 0,
    ai_schema_call_count:
      typeof value.ai_schema_call_count === "number" && Number.isFinite(value.ai_schema_call_count) ? value.ai_schema_call_count : 0,
    ai_provider_attempt_count:
      typeof value.ai_provider_attempt_count === "number" && Number.isFinite(value.ai_provider_attempt_count)
        ? value.ai_provider_attempt_count
        : 0,
    ai_successful_schema_call_count:
      typeof value.ai_successful_schema_call_count === "number" && Number.isFinite(value.ai_successful_schema_call_count)
        ? value.ai_successful_schema_call_count
        : 0,
    ai_failed_schema_call_count:
      typeof value.ai_failed_schema_call_count === "number" && Number.isFinite(value.ai_failed_schema_call_count)
        ? value.ai_failed_schema_call_count
        : 0,
    ai_fallback_result_count:
      typeof value.ai_fallback_result_count === "number" && Number.isFinite(value.ai_fallback_result_count)
        ? value.ai_fallback_result_count
        : 0,
    ai_calls_by_purpose: normalizeCountMap(value.ai_calls_by_purpose),
    ai_provider_attempts: normalizeCountMap(value.ai_provider_attempts),
    ai_results_by_intent: normalizeCountMap(value.ai_results_by_intent),
    zero_result_queries: normalizeEventList(value.zero_result_queries),
    bot_like_ask_queries: normalizeEventList(value.bot_like_ask_queries)
  };
}

function addCount(counts: Record<string, number>, label: string | undefined, amount = 1) {
  const normalized = label?.trim();
  if (!normalized) return;
  counts[normalized] = (counts[normalized] ?? 0) + amount;
}

function eventHourKey(event: StoredAnalyticsEvent) {
  const receivedAt = new Date(event.received_at);
  if (!Number.isFinite(receivedAt.getTime())) return undefined;
  receivedAt.setUTCMinutes(0, 0, 0);
  return receivedAt.toISOString();
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

function metadataLabel(event: StoredAnalyticsEvent, key: string) {
  const value = metadataString(event, key)?.trim();
  return value || undefined;
}

function referrerHost(value: string | undefined) {
  if (!value) return undefined;
  try {
    return new URL(value).host;
  } catch {
    return undefined;
  }
}

const queryToCardSeparator = "\u001f";

function queryToCardKey(query: string, cardId: string) {
  return `${query}${queryToCardSeparator}${cardId}`;
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
  const normalizedSummary = normalizeDailySummary(summary, event.received_at.slice(0, 10));
  normalizedSummary.schema_version = ANALYTICS_DAILY_SUMMARY_SCHEMA_VERSION;
  summary = normalizedSummary;
  summary.total_events += 1;
  summary.updated_at = new Date().toISOString();
  addCount(summary.hourly_event_counts, eventHourKey(event));
  addCount(summary.event_counts, event.event_name);
  addCount(summary.page_counts, event.page);
  addCount(summary.source_counts, event.source);
  addCount(summary.device_counts, event.device_type);
  addCount(summary.request_path_counts, metadataLabel(event, "request_path") ?? event.page);
  addCount(summary.request_user_agent_family_counts, metadataLabel(event, "request_user_agent_family") ?? "unknown");

  if (event.event_name === "ask_query_submitted") {
    addCount(summary.ask_queries, event.query);
    summary.ask_queries = pruneCountMap(summary.ask_queries, MAX_STORED_QUERY_LABELS);
  }

  if (event.event_name === "ask_result_rendered") {
    summary.ask_result_count = (summary.ask_result_count ?? 0) + 1;
    addCount(summary.ask_cache_status_counts, metadataLabel(event, "ask_cache_status") ?? "UNKNOWN");
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

  if (event.event_name === "card_detail_viewed" && event.card_id) {
    addCount(summary.card_detail_views_by_card, event.card_id);
    addCount(
      summary.card_detail_views_by_referrer_host,
      metadataLabel(event, "request_referrer_host") ?? referrerHost(event.referrer) ?? "direct"
    );
    addCount(summary.card_detail_views_by_traffic_class, metadataBoolean(event, "request_user_agent_is_bot") ? "bot" : "human");
    addCount(summary.card_detail_views_by_user_agent_family, metadataLabel(event, "request_user_agent_family") ?? "unknown");
    addCount(summary.card_detail_views_by_country, metadataLabel(event, "request_country") ?? "unknown");
  }

  if (event.event_name === "details_clicked" && event.card_id) {
    addCount(summary.detail_clicks_by_card, event.card_id);
    const sourceCounts = summary.detail_clicks_by_card_source[event.card_id] ?? {};
    addCount(sourceCounts, event.source);
    summary.detail_clicks_by_card_source[event.card_id] = sourceCounts;

    if (event.source === "ask") {
      addCount(summary.ask_detail_clicks_by_card, event.card_id);
      if (event.query) addCount(summary.ask_query_to_card_detail_clicks, queryToCardKey(event.query, event.card_id));
    }
  }

  if (event.event_name === "apply_clicked" && event.card_id) {
    addCount(summary.apply_clicks_by_card, event.card_id);
    const sourceCounts = summary.apply_clicks_by_card_source[event.card_id] ?? {};
    addCount(sourceCounts, event.source);
    summary.apply_clicks_by_card_source[event.card_id] = sourceCounts;
  }

  if (event.event_name === "feedback_submitted") {
    summary.feedback_count = (summary.feedback_count ?? 0) + 1;
    if (metadataBoolean(event, "has_comment")) {
      summary.feedback_with_comment_count = (summary.feedback_with_comment_count ?? 0) + 1;
    }
    addCount(summary.feedback_by_value, metadataLabel(event, "feedback") ?? "unknown");
    addCount(summary.feedback_by_source, metadataLabel(event, "feedback_source") ?? event.source);
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

  if (event.event_name === "feedback_submitted") {
    summary.feedback_events = [event, ...(summary.feedback_events ?? [])]
      .sort((left, right) => right.received_at.localeCompare(left.received_at))
      .slice(0, MAX_STORED_FEEDBACK_EVENTS);
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

  for (let attempt = 0; attempt < ANALYTICS_DAILY_SUMMARY_WRITE_ATTEMPTS; attempt += 1) {
    const existing = await readKeyedDurableRecordWithMetadata<AnalyticsDailySummary>("analytics-daily", date).catch(() => null);
    const summary = addEventToDailySummary(normalizeDailySummary(existing?.value, date), event);

    try {
      await writeKeyedDurableRecord("analytics-daily", date, summary, existing?.etag ? { ifMatch: existing.etag } : { allowOverwrite: false });
      return;
    } catch (error) {
      if (attempt === ANALYTICS_DAILY_SUMMARY_WRITE_ATTEMPTS - 1) throw error;
    }
  }
}

export async function readAnalyticsDailySummaries(dateKeys: string[]) {
  if (!isVercelRuntime() || !isDurableRecordStorageConfigured()) return [];

  const summaries = await Promise.all(
    dateKeys.map(async (date) => readKeyedDurableRecord<AnalyticsDailySummary>("analytics-daily", date).catch(() => null))
  );

  return summaries
    .map((summary, index) => (summary === null ? null : normalizeDailySummary(summary, dateKeys[index] ?? "")))
    .filter((summary): summary is AnalyticsDailySummary => summary !== null);
}

export function buildLast24HourRowsFromSummaries(summaries: AnalyticsDailySummary[], now: Date) {
  const hourMs = 60 * 60 * 1000;
  const currentHourStart = new Date(now);
  currentHourStart.setUTCMinutes(0, 0, 0);

  const buckets = new Map<string, { label: string; count: number }>();
  const firstHourStart = new Date(currentHourStart.getTime() - 23 * hourMs);

  for (let index = 0; index < 24; index += 1) {
    const hour = new Date(firstHourStart.getTime() + index * hourMs);
    buckets.set(hour.toISOString(), {
      label: new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        hour12: false
      }).format(hour),
      count: 0
    });
  }

  for (const summary of summaries) {
    for (const [hourKey, count] of Object.entries(summary.hourly_event_counts ?? {})) {
      const bucket = buckets.get(hourKey);
      if (bucket) bucket.count += count;
    }
  }

  return [...buckets.values()];
}

export function mergeDailySummaries(
  summaries: AnalyticsDailySummary[],
  dailyDateKeys: string[],
  eventWindowDateKeys: string[]
): AnalyticsReviewSummary {
  const topAskQueryCounts: Record<string, number> = {};
  const askCacheStatusCounts: Record<string, number> = {};
  const requestPathCounts: Record<string, number> = {};
  const requestUserAgentCounts: Record<string, number> = {};
  const cardViewCounts: Record<string, number> = {};
  const cardViewReferrerCounts: Record<string, number> = {};
  const cardViewTrafficCounts: Record<string, number> = {};
  const cardViewUserAgentCounts: Record<string, number> = {};
  const cardViewCountryCounts: Record<string, number> = {};
  const detailClickCounts: Record<string, number> = {};
  const detailClickSourceCounts: Record<string, Partial<Record<AnalyticsSource, number>>> = {};
  const askDetailClickCounts: Record<string, number> = {};
  const queryToCardClickCounts: Record<string, number> = {};
  const applyCounts: Record<string, number> = {};
  const applySourceCounts: Record<string, Partial<Record<AnalyticsSource, number>>> = {};
  const feedbackByValueCounts: Record<string, number> = {};
  const feedbackBySourceCounts: Record<string, number> = {};
  const feedbackEvents: StoredAnalyticsEvent[] = [];
  const zeroResultQueries: StoredAnalyticsEvent[] = [];
  const botLikeAskQueries: StoredAnalyticsEvent[] = [];
  const dailyCounts = new Map(dailyDateKeys.map((date) => [date, 0]));
  const eventWindowDateSet = new Set(eventWindowDateKeys);
  let eventsLoaded = 0;
  let last30DayEvents = 0;
  let askResultCount = 0;
  let askAnonymousResultCount = 0;
  let askEmptyReferrerResultCount = 0;
  let feedbackCount = 0;
  let feedbackWithCommentCount = 0;
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
    for (const [status, count] of Object.entries(summary.ask_cache_status_counts ?? {})) addCount(askCacheStatusCounts, status, count);
    for (const [path, count] of Object.entries(summary.request_path_counts ?? {})) addCount(requestPathCounts, path, count);
    for (const [family, count] of Object.entries(summary.request_user_agent_family_counts ?? {})) addCount(requestUserAgentCounts, family, count);
    for (const [cardId, count] of Object.entries(summary.card_detail_views_by_card ?? {})) addCount(cardViewCounts, cardId, count);
    for (const [label, count] of Object.entries(summary.card_detail_views_by_referrer_host ?? {})) addCount(cardViewReferrerCounts, label, count);
    for (const [label, count] of Object.entries(summary.card_detail_views_by_traffic_class ?? {})) addCount(cardViewTrafficCounts, label, count);
    for (const [label, count] of Object.entries(summary.card_detail_views_by_user_agent_family ?? {})) addCount(cardViewUserAgentCounts, label, count);
    for (const [label, count] of Object.entries(summary.card_detail_views_by_country ?? {})) addCount(cardViewCountryCounts, label, count);
    for (const [cardId, count] of Object.entries(summary.detail_clicks_by_card ?? {})) addCount(detailClickCounts, cardId, count);
    for (const [cardId, count] of Object.entries(summary.ask_detail_clicks_by_card ?? {})) addCount(askDetailClickCounts, cardId, count);
    for (const [label, count] of Object.entries(summary.ask_query_to_card_detail_clicks ?? {})) addCount(queryToCardClickCounts, label, count);
    for (const [cardId, count] of Object.entries(summary.apply_clicks_by_card)) addCount(applyCounts, cardId, count);
    for (const [value, count] of Object.entries(summary.feedback_by_value ?? {})) addCount(feedbackByValueCounts, value, count);
    for (const [source, count] of Object.entries(summary.feedback_by_source ?? {})) addCount(feedbackBySourceCounts, source, count);
    askResultCount += summary.ask_result_count ?? 0;
    askAnonymousResultCount += summary.ask_anonymous_result_count ?? 0;
    askEmptyReferrerResultCount += summary.ask_empty_referrer_result_count ?? 0;
    feedbackCount += summary.feedback_count ?? 0;
    feedbackWithCommentCount += summary.feedback_with_comment_count ?? 0;
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

    for (const [cardId, sourceCounts] of Object.entries(summary.detail_clicks_by_card_source ?? {})) {
      const merged = detailClickSourceCounts[cardId] ?? {};
      for (const [source, count] of Object.entries(sourceCounts)) addCount(merged, source, count);
      detailClickSourceCounts[cardId] = merged;
    }

    feedbackEvents.push(...(summary.feedback_events ?? []));
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
  const cardViewRows = sortedCountRows(cardViewCounts).map((row) => {
    const card = getCardById(row.label);
    return {
      cardId: row.label,
      cardName: card?.name ?? row.label,
      count: row.count
    };
  });
  const detailClickRows = sortedCountRows(detailClickCounts).map((row) => {
    const card = getCardById(row.label);
    return {
      cardId: row.label,
      cardName: card?.name ?? row.label,
      count: row.count
    };
  });
  const askDetailClickRows = sortedCountRows(askDetailClickCounts).map((row) => {
    const card = getCardById(row.label);
    return {
      cardId: row.label,
      cardName: card?.name ?? row.label,
      count: row.count
    };
  });
  const cardDetailApplyConversionRows = sortedCountRows(cardViewCounts).map((row) => {
    const card = getCardById(row.label);
    const detailApplyClicks = applySourceCounts[row.label]?.details ?? 0;
    return {
      cardId: row.label,
      cardName: card?.name ?? row.label,
      views: row.count,
      detailApplyClicks,
      conversionRate: row.count > 0 ? detailApplyClicks / row.count : 0
    };
  });
  const queryToCardRows = sortedCountRows(queryToCardClickCounts)
    .slice(0, 50)
    .map((row) => {
      const [query, cardId] = row.label.split(queryToCardSeparator);
      const card = getCardById(cardId ?? "");
      return {
        query: query ?? row.label,
        cardId: cardId ?? "",
        cardName: card?.name ?? cardId ?? "",
        count: row.count
      };
    });

  return {
    eventsLoaded,
    last30DayEvents,
    topAskQueries: sortedCountRows(topAskQueryCounts).slice(0, 25),
    askCacheRows: sortedCountRows(askCacheStatusCounts),
    requestPathRows: sortedCountRows(requestPathCounts).slice(0, 25),
    requestUserAgentRows: sortedCountRows(requestUserAgentCounts).slice(0, 25),
    cardViewRows,
    detailClickRows,
    askDetailClickRows,
    cardDetailApplyConversionRows,
    queryToCardRows,
    cardViewReferrerRows: sortedCountRows(cardViewReferrerCounts).slice(0, 25),
    cardViewTrafficRows: sortedCountRows(cardViewTrafficCounts),
    cardViewUserAgentRows: sortedCountRows(cardViewUserAgentCounts).slice(0, 25),
    cardViewCountryRows: sortedCountRows(cardViewCountryCounts).slice(0, 25),
    applyRows,
    sourceBreakdown: applyRows.slice(0, 10).map((row) => ({
      ...row,
      sources: Object.entries(applySourceCounts[row.cardId] ?? {})
        .map(([source, count]) => ({ source: source as AnalyticsSource, count }))
        .sort((left, right) => right.count - left.count || left.source.localeCompare(right.source))
    })),
    detailSourceBreakdown: detailClickRows.slice(0, 10).map((row) => ({
      ...row,
      sources: Object.entries(detailClickSourceCounts[row.cardId] ?? {})
        .map(([source, count]) => ({ source: source as AnalyticsSource, count }))
        .sort((left, right) => right.count - left.count || left.source.localeCompare(right.source))
    })),
    feedbackEvents: feedbackEvents
      .sort((left, right) => right.received_at.localeCompare(left.received_at))
      .slice(0, 50),
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
    },
    feedback: {
      count: feedbackCount,
      withCommentCount: feedbackWithCommentCount,
      withoutCommentCount: Math.max(0, feedbackCount - feedbackWithCommentCount),
      byValue: sortedCountRows(feedbackByValueCounts),
      bySource: sortedCountRows(feedbackBySourceCounts)
    }
  };
}
