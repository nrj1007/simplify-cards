import { NextResponse } from "next/server";
import { logAskFeedback } from "@/lib/feedback-logs";
import type { RecommendationInput } from "@/lib/types";

export async function POST(request: Request) {
  let returnTo = "/";
  let returnAnchor = "";

  try {
    const formData = await request.formData();

    const query = String(formData.get("query") ?? "").trim();
    const summary = String(formData.get("summary") ?? "").trim();
    const feedbackValue = String(formData.get("feedback") ?? "").trim();
    returnTo = String(formData.get("returnTo") ?? "/").trim() || "/";
    returnAnchor = String(formData.get("returnAnchor") ?? "").trim();
    const inputRaw = String(formData.get("input") ?? "").trim();
    const comment = String(formData.get("comment") ?? "").trim();
    const sourceValue = String(formData.get("source") ?? "").trim();
    const source = sourceValue === "details" ? "details" : "ask";
    const cardIds = formData
      .getAll("cardId")
      .map((value) => String(value).trim())
      .filter(Boolean);

    if (!query || !summary || (feedbackValue !== "up" && feedbackValue !== "down")) {
      return NextResponse.redirect(new URL(returnTo, request.url), { status: 303 });
    }

    let input: RecommendationInput = { query };
    if (inputRaw) {
      try {
        input = JSON.parse(inputRaw) as RecommendationInput;
      } catch {
        input = { query };
      }
    }

    await logAskFeedback({
      query,
      submittedAt: new Date().toISOString(),
      feedback: feedbackValue,
      summary,
      cardIds,
      input,
      ...(comment ? { comment } : {}),
      source
    });

    const redirectUrl = new URL(returnTo, request.url);
    redirectUrl.searchParams.set("feedbackSaved", feedbackValue);
    if (returnAnchor) redirectUrl.hash = returnAnchor;

    return NextResponse.redirect(redirectUrl, { status: 303 });
  } catch {
    const redirectUrl = new URL(returnTo, request.url);
    redirectUrl.searchParams.set("feedbackError", "1");
    if (returnAnchor) redirectUrl.hash = returnAnchor;
    return NextResponse.redirect(redirectUrl, { status: 303 });
  }
}
