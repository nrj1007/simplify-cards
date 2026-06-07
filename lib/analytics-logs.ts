import fs from "node:fs/promises";
import path from "node:path";
import { buildStoredAnalyticsEvent, type AnalyticsEventPayload, type StoredAnalyticsEvent } from "./analytics";

export function getAnalyticsEventsLogPath() {
  return process.env.ANALYTICS_LOG_PATH ?? path.join(process.cwd(), "data", "analytics", "events.jsonl");
}

export async function appendAnalyticsEvent(event: StoredAnalyticsEvent) {
  const logPath = getAnalyticsEventsLogPath();
  await fs.mkdir(path.dirname(logPath), { recursive: true });
  await fs.appendFile(logPath, `${JSON.stringify(event)}\n`, "utf8");
  return event;
}

export async function logAnalyticsEvent(payload: AnalyticsEventPayload) {
  const event = buildStoredAnalyticsEvent(payload);
  await appendAnalyticsEvent(event);
  return event;
}
