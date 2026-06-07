export const analyticsEventNames = [
  "ask_query_submitted",
  "ask_result_rendered",
  "card_detail_viewed",
  "compare_viewed",
  "recommendation_generated",
  "feedback_submitted",
  "apply_clicked",
  "details_clicked",
  "filter_used"
] as const;

export const analyticsSources = ["ask", "finder", "compare", "recommend", "details"] as const;
export const analyticsDeviceTypes = ["mobile", "tablet", "desktop"] as const;

export type AnalyticsEventName = (typeof analyticsEventNames)[number];
export type AnalyticsSource = (typeof analyticsSources)[number];
export type AnalyticsDeviceType = (typeof analyticsDeviceTypes)[number];

export type AnalyticsMetadata = Record<string, unknown>;

export type AnalyticsEventPayload = {
  event_name: AnalyticsEventName;
  page: string;
  source: AnalyticsSource;
  query?: string;
  card_id?: string;
  card_ids?: string[];
  metadata?: AnalyticsMetadata;
  session_id?: string;
  device_type?: AnalyticsDeviceType;
  referrer?: string;
};

export type StoredAnalyticsEvent = {
  event_name: AnalyticsEventName;
  received_at: string;
  session_id: string;
  page: string;
  source: AnalyticsSource;
  query?: string;
  card_id?: string;
  card_ids?: string[];
  device_type: AnalyticsDeviceType;
  referrer: string;
  metadata?: AnalyticsMetadata;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAnalyticsEventName(value: unknown): value is AnalyticsEventName {
  return typeof value === "string" && (analyticsEventNames as readonly string[]).includes(value);
}

function isAnalyticsSource(value: unknown): value is AnalyticsSource {
  return typeof value === "string" && (analyticsSources as readonly string[]).includes(value);
}

function isAnalyticsDeviceType(value: unknown): value is AnalyticsDeviceType {
  return typeof value === "string" && (analyticsDeviceTypes as readonly string[]).includes(value);
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function normalizeCardIds(value: unknown) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return null;

  const cardIds = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);

  return cardIds;
}

export function validateAnalyticsEventPayload(payload: unknown):
  | { ok: true; value: AnalyticsEventPayload }
  | { ok: false; error: string } {
  if (!isPlainObject(payload)) {
    return { ok: false, error: "Payload must be an object" };
  }

  if (!isAnalyticsEventName(payload.event_name)) {
    return { ok: false, error: "Unknown analytics event name" };
  }

  if (!isAnalyticsSource(payload.source)) {
    return { ok: false, error: "Unknown analytics source" };
  }

  const page = normalizeOptionalString(payload.page);
  if (!page) {
    return { ok: false, error: "Page is required" };
  }

  const cardIds = normalizeCardIds(payload.card_ids);
  if (cardIds === null) {
    return { ok: false, error: "card_ids must be an array of strings" };
  }

  if (payload.metadata !== undefined && !isPlainObject(payload.metadata)) {
    return { ok: false, error: "metadata must be an object" };
  }

  if (payload.device_type !== undefined && !isAnalyticsDeviceType(payload.device_type)) {
    return { ok: false, error: "device_type must be mobile, tablet, or desktop" };
  }

  return {
    ok: true,
    value: {
      event_name: payload.event_name,
      page,
      source: payload.source,
      query: normalizeOptionalString(payload.query),
      card_id: normalizeOptionalString(payload.card_id),
      card_ids: cardIds,
      metadata: payload.metadata as AnalyticsMetadata | undefined,
      session_id: normalizeOptionalString(payload.session_id),
      device_type: payload.device_type,
      referrer: normalizeOptionalString(payload.referrer)
    }
  };
}

export function buildStoredAnalyticsEvent(
  payload: AnalyticsEventPayload,
  receivedAt = new Date().toISOString()
): StoredAnalyticsEvent {
  return {
    event_name: payload.event_name,
    received_at: receivedAt,
    session_id: payload.session_id ?? "anonymous",
    page: payload.page,
    source: payload.source,
    ...(payload.query ? { query: payload.query } : {}),
    ...(payload.card_id ? { card_id: payload.card_id } : {}),
    ...(payload.card_ids && payload.card_ids.length > 0 ? { card_ids: payload.card_ids } : {}),
    device_type: payload.device_type ?? "desktop",
    referrer: payload.referrer ?? "",
    ...(payload.metadata ? { metadata: payload.metadata } : {})
  };
}
