import { randomUUID } from "node:crypto";
import { createClient, type Client } from "@libsql/client/web";
import type { StoredAnalyticsEvent } from "./analytics";

let client: Client | undefined;

export function isActivityDatabaseConfigured() {
  return Boolean(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN);
}

function getClient() {
  if (!isActivityDatabaseConfigured()) throw new Error("Activity database is not configured");
  client ??= createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!
  });
  return client;
}

export async function storeActivityEvent(event: StoredAnalyticsEvent) {
  await getClient().execute({
    sql: `INSERT INTO activity_events (id, received_at, event_name, session_id, card_id, payload)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [randomUUID(), event.received_at, event.event_name, event.session_id, event.card_id ?? null, JSON.stringify(event)]
  });
}

export async function readActivityEvents(limit = 5000, dateKeys?: string[]): Promise<StoredAnalyticsEvent[]> {
  const boundedLimit = Number.isFinite(limit) ? Math.min(5000, Math.max(0, Math.floor(limit))) : 5000;
  if (!boundedLimit || dateKeys?.length === 0) return [];
  const dates = [...new Set(dateKeys ?? [])];
  if (dates.some((date) => !/^\d{4}-\d{2}-\d{2}$/.test(date))) throw new Error("Invalid activity date");
  const clauses = dates.map(() => "(received_at >= ? AND received_at < ?)");
  const result = await getClient().execute({
    sql: `SELECT payload FROM activity_events ${clauses.length ? `WHERE ${clauses.join(" OR ")}` : ""}
          ORDER BY received_at DESC, id DESC LIMIT ?`,
    args: [...dates.flatMap((date) => [date, `${date}~`]), boundedLimit]
  });
  return result.rows.map((row) => JSON.parse(String(row.payload)) as StoredAnalyticsEvent);
}

// Page through the whole reporting window rather than truncating dashboard totals
// at the raw-event reader's 5,000-row limit. A read transaction keeps pages consistent.
export async function* readActivityEventBatches(dateKeys: string[]): AsyncGenerator<StoredAnalyticsEvent[]> {
  const dates = [...new Set(dateKeys)];
  if (!dates.length) return;
  if (dates.some((date) => !/^\d{4}-\d{2}-\d{2}$/.test(date))) throw new Error("Invalid activity date");
  const tx = await getClient().transaction("read");
  try {
    let cursor: { receivedAt: string; id: string } | undefined;
    const clauses = dates.map(() => "(received_at >= ? AND received_at < ?)");
    while (true) {
      const result = await tx.execute({
        sql: `SELECT id, received_at, payload FROM activity_events
              WHERE (${clauses.join(" OR ")})
              ${cursor ? "AND (received_at, id) < (?, ?)" : ""}
              ORDER BY received_at DESC, id DESC LIMIT 1000`,
        args: [...dates.flatMap((date) => [date, `${date}~`]), ...(cursor ? [cursor.receivedAt, cursor.id] : [])]
      });
      if (!result.rows.length) break;
      yield result.rows.map((row) => JSON.parse(String(row.payload)) as StoredAnalyticsEvent);
      const last = result.rows[result.rows.length - 1];
      cursor = { receivedAt: String(last.received_at), id: String(last.id) };
      if (result.rows.length < 1000) break;
    }
  } finally {
    await tx.rollback();
    tx.close();
  }
}
