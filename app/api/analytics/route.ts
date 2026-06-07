import { NextResponse } from "next/server";
import { logAnalyticsEvent } from "@/lib/analytics-logs";
import { validateAnalyticsEventPayload } from "@/lib/analytics";

export async function POST(request: Request) {
  const payload = await request.json();
  const validation = validateAnalyticsEventPayload(payload);

  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  await logAnalyticsEvent(validation.value);
  return NextResponse.json({ ok: true });
}
