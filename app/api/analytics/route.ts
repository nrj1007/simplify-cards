import { NextResponse } from "next/server";
import { logAnalyticsEvent } from "@/lib/analytics-logs";
import { validateAnalyticsEventPayload } from "@/lib/analytics";
import { buildRequestAnalyticsMetadata } from "@/lib/analytics-request";

export async function POST(request: Request) {
  const payload = await request.json();
  const validation = validateAnalyticsEventPayload(payload);

  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  await logAnalyticsEvent({
    ...validation.value,
    metadata: {
      ...(validation.value.metadata ?? {}),
      ...buildRequestAnalyticsMetadata(request)
    }
  });
  return NextResponse.json({ ok: true });
}
