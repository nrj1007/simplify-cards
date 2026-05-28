import { NextResponse } from "next/server";
import { logAskFeedback } from "@/lib/feedback-logs";
import type { RecommendationInput } from "@/lib/types";

export async function POST(request: Request) {
  let returnTo = "/ask";

  function buildAskRedirectUrl(baseUrl: string, input: RecommendationInput, query: string) {
    const redirectUrl = new URL("/ask", baseUrl);
    redirectUrl.searchParams.set("query", input.query?.trim() || query);

    if (typeof input.maxAnnualFee === "number" && !Number.isNaN(input.maxAnnualFee)) {
      redirectUrl.searchParams.set("maxAnnualFee", String(input.maxAnnualFee));
    }

    return redirectUrl;
  }

  try {
    const formData = await request.formData();

    const query = String(formData.get("query") ?? "").trim();
    const summary = String(formData.get("summary") ?? "").trim();
    const feedbackValue = String(formData.get("feedback") ?? "").trim();
    returnTo = String(formData.get("returnTo") ?? "/ask").trim() || "/ask";
    const inputRaw = String(formData.get("input") ?? "").trim();
    const cardIds = formData
      .getAll("cardId")
      .map((value) => String(value).trim())
      .filter(Boolean);

    if (!query || !summary || (feedbackValue !== "up" && feedbackValue !== "down")) {
      return NextResponse.redirect(new URL("/ask", request.url), { status: 303 });
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
      input
    });

    const redirectUrl = buildAskRedirectUrl(request.url, input, query);
    redirectUrl.searchParams.set("feedbackSaved", feedbackValue);
    redirectUrl.hash = "answer";

    return NextResponse.redirect(redirectUrl, { status: 303 });
  } catch {
    const redirectUrl = new URL(returnTo, request.url);
    redirectUrl.searchParams.set("feedbackError", "1");
    redirectUrl.hash = "answer";
    return NextResponse.redirect(redirectUrl, { status: 303 });
  }
}
