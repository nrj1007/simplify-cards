import { NextResponse } from "next/server";
import { logAskFeedback } from "@/lib/feedback-logs";
import type { RecommendationInput } from "@/lib/types";
import type { AskFeedbackValue } from "@/lib/feedback-logs";
import { logAnalyticsEvent } from "@/lib/analytics-logs";
import { buildFeedbackAnalyticsPayload } from "@/lib/analytics-events";

type FeedbackPayload = {
  query?: string;
  feedback?: AskFeedbackValue;
  summary?: string;
  cardIds?: string[];
  input?: RecommendationInput;
  comment?: string;
  source?: "ask" | "details";
  sessionId?: string;
  deviceType?: "mobile" | "tablet" | "desktop";
  referrer?: string;
};

export async function POST(request: Request) {
  const payload = (await request.json()) as FeedbackPayload;

  if (!payload.query?.trim() || !payload.summary?.trim() || !payload.feedback || !Array.isArray(payload.cardIds)) {
    return NextResponse.json({ error: "Invalid feedback payload" }, { status: 400 });
  }

  await logAskFeedback({
    query: payload.query.trim(),
    submittedAt: new Date().toISOString(),
    feedback: payload.feedback,
    summary: payload.summary.trim(),
    cardIds: payload.cardIds.filter((value): value is string => typeof value === "string"),
    input: payload.input ?? { query: payload.query.trim() },
    ...(payload.comment?.trim() ? { comment: payload.comment.trim() } : {}),
    source: payload.source === "details" ? "details" : "ask"
  });

  await logAnalyticsEvent(
    buildFeedbackAnalyticsPayload({
      query: payload.query.trim(),
      cardIds: payload.cardIds.filter((value): value is string => typeof value === "string"),
      feedback: payload.feedback,
      hasComment: Boolean(payload.comment?.trim()),
      feedbackSource: payload.source === "details" ? "details" : "ask",
      sessionId: payload.sessionId,
      deviceType: payload.deviceType,
      referrer: payload.referrer
    })
  );

  return NextResponse.json({ ok: true });
}
