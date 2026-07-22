import fs from "node:fs/promises";
import path from "node:path";
import { buildStoredAnalyticsEvent, type AnalyticsEventPayload, type StoredAnalyticsEvent } from "./analytics";
import {
  isDurableRecordStorageConfigured,
  isVercelRuntime,
  readDurableRecords,
  writeUniqueDurableRecord
} from "./durable-records";

export function getAnalyticsEventsLogPath() {
  if (process.env.NODE_ENV === "test" && process.env.ANALYTICS_LOG_PATH) {
    return path.join(
      /*turbopackIgnore: true*/ process.cwd(),
      "data",
      "analytics",
      path.basename(process.env.ANALYTICS_LOG_PATH)
    );
  }

  return path.join(/*turbopackIgnore: true*/ process.cwd(), "data", "analytics", "events.jsonl");
}

function canPersistAnalyticsToFilesystem() {
  return !isVercelRuntime();
}

export async function appendAnalyticsEvent(event: StoredAnalyticsEvent) {
  if (!canPersistAnalyticsToFilesystem()) {
    if (isDurableRecordStorageConfigured()) {
      try {
        await writeUniqueDurableRecord("analytics", event, event.received_at);
      } catch (error) {
        console.error("Failed to persist analytics event to durable storage:", error);
      }
    }

    console.info(JSON.stringify({ log_type: "analytics_event", ...event }));
    return event;
  }

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
  if (!canPersistAnalyticsToFilesystem()) {
    if (!isDurableRecordStorageConfigured()) {
      throw new Error("Durable analytics storage is not configured");
    }

    const entries = await readDurableRecords<StoredAnalyticsEvent>("analytics", limit);
    return entries.sort((left, right) => left.received_at.localeCompare(right.received_at));
  }

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
