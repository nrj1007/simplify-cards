import { NextResponse } from "next/server";
import { validateAnalyticsEventPayload } from "@/lib/analytics";
import { logAnalyticsEvent } from "@/lib/analytics-logs";
import { getCardById } from "@/lib/cards";
import { cardCtaHref } from "@/lib/card-links";

const EVENT_NAMES = new Set(["apply_clicked", "details_clicked"]);

function safeInternalPath(value: string | null) {
  if (!value || !value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  return value;
}

function redirectFallback(request: Request) {
  return new URL("/", request.url);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const eventName = url.searchParams.get("event_name") ?? "";
  const source = url.searchParams.get("source") ?? "";
  const page = url.searchParams.get("page") ?? "";
  const cardId = url.searchParams.get("card_id") ?? "";
  const href = safeInternalPath(url.searchParams.get("href"));
  const kind = url.searchParams.get("kind");

  const destination =
    kind === "external" && cardId
      ? (() => {
          const card = getCardById(cardId);
          return card ? new URL(cardCtaHref(card)) : redirectFallback(request);
        })()
      : href
        ? new URL(href, request.url)
        : redirectFallback(request);

  if (EVENT_NAMES.has(eventName)) {
    const validation = validateAnalyticsEventPayload({
      event_name: eventName,
      page,
      source,
      card_id: cardId || undefined,
      metadata: {
        tracking_mode: "server_redirect",
        destination_kind: kind === "external" ? "external" : "internal"
      }
    });

    if (validation.ok) {
      await logAnalyticsEvent(validation.value);
    }
  }

  return NextResponse.redirect(destination, { status: 302 });
}
