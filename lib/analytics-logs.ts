import fs from "node:fs/promises";
import path from "node:path";
import { buildStoredAnalyticsEvent, type AnalyticsEventPayload, type StoredAnalyticsEvent } from "./analytics";

export function getAnalyticsEventsLogPath() {
  if (process.env.NODE_ENV === "test" && process.env.ANALYTICS_LOG_PATH) {
    return process.env.ANALYTICS_LOG_PATH;
  }

  return path.join(/*turbopackIgnore: true*/ process.cwd(), "data", "analytics", "events.jsonl");
}

function canPersistAnalyticsToFilesystem() {
  return process.env.VERCEL !== "1";
}

export async function appendAnalyticsEvent(event: StoredAnalyticsEvent) {
  if (!canPersistAnalyticsToFilesystem()) return event;

  try {
    const logPath = getAnalyticsEventsLogPath();
    await fs.mkdir(path.dirname(logPath), { recursive: true });
    await fs.appendFile(logPath, `${JSON.stringify(event)}\n`, "utf8");
  } catch (error) {
    console.error("Failed to write to analytics event log:", error);
  }
  return event;
}

export async function readAnalyticsLog(limit = 5000): Promise<StoredAnalyticsEvent[]> {
  if (!canPersistAnalyticsToFilesystem()) return [];

  const logPath = getAnalyticsEventsLogPath();

  try {
    const raw = await fs.readFile(logPath, "utf-8");
    const lines = raw.trim().split("\n").filter(Boolean);

    return lines
      .slice(-limit)
      .map((line) => {
        try {
          return JSON.parse(line) as StoredAnalyticsEvent;
        } catch {
          return null;
        }
      })
      .filter((event): event is StoredAnalyticsEvent => event !== null);
  } catch {
    return [];
  }
}

export async function logAnalyticsEvent(payload: AnalyticsEventPayload) {
  const event = buildStoredAnalyticsEvent(payload);
  await appendAnalyticsEvent(event);
  return event;
}
