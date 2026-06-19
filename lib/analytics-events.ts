import type { AskAiResult } from "./ask-ai";
import type { AnalyticsDeviceType, AnalyticsEventPayload } from "./analytics";
import type { CreditCard, RecommendResult, RecommendationInput, SpendProfile } from "./types";

export function isVerifiedByUser(card: CreditCard) {
  return (card.internalNotes ?? []).some((note) => /verified by user/i.test(note));
}

export function buildAskResultMetadata(result: AskAiResult) {
  return {
    intent: result.meta?.intent ?? "unsupported",
    confidence: result.meta?.confidence ?? "low",
    result_count: result.cards.length,
    top_card_id: result.cards[0]?.card.id ?? null,
    needs_database_update: Boolean(result.needsDatabaseUpdate),
    display_mode: result.displayMode ?? "default",
    ai_used: result.meta?.ai?.aiUsed ?? false,
    ai_providers_used: result.meta?.ai?.providersUsed ?? [],
    ai_fallback_used: result.meta?.ai?.fallbackUsed ?? false,
    ai_calls: result.meta?.ai?.calls ?? []
  };
}

export function buildCardDetailMetadata(card: CreditCard) {
  return {
    issuer: card.issuer,
    verified_by_user: isVerifiedByUser(card),
    apply_url_present: Boolean(card.applyUrl),
    image_present: Boolean(card.imageUrl)
  };
}

export function summarizeSpendProfile(spend: SpendProfile) {
  return Object.fromEntries(
    Object.entries(spend)
      .filter(([, value]) => typeof value === "number" && value > 0)
      .map(([key, value]) => [key, value])
  );
}

export function buildRecommendationMetadata(
  spend: SpendProfile,
  maxAnnualFee: string,
  wantsLounge: boolean,
  wantsLifetimeFree: boolean,
  results: RecommendResult[]
) {
  return {
    max_annual_fee: maxAnnualFee === "" ? null : Number(maxAnnualFee),
    wants_lounge: wantsLounge,
    wants_lifetime_free: wantsLifetimeFree,
    spend_summary: summarizeSpendProfile(spend),
    top_3_card_ids: results.slice(0, 3).map((result) => result.id)
  };
}

export function buildFeedbackAnalyticsPayload(input: {
  query: string;
  cardIds: string[];
  feedback: "up" | "down";
  hasComment: boolean;
  feedbackSource: "ask" | "details";
  sessionId?: string;
  deviceType?: AnalyticsDeviceType;
  referrer?: string;
}): AnalyticsEventPayload {
  return {
    event_name: "feedback_submitted" as const,
    page: input.feedbackSource === "details" ? "cards/[id]" : "ask",
    source: input.feedbackSource === "details" ? "details" : "ask",
    query: input.query,
    card_ids: input.cardIds,
    session_id: input.sessionId,
    device_type: input.deviceType,
    referrer: input.referrer,
    metadata: {
      feedback: input.feedback,
      has_comment: input.hasComment,
      feedback_source: input.feedbackSource
    }
  };
}
