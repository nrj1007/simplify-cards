import { readFileSync } from "node:fs";
import { createClient } from "@libsql/client";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { buildStoredAnalyticsEvent } from "../lib/analytics";

const state = vi.hoisted(() => ({ client: undefined as unknown }));
vi.mock("@libsql/client/web", () => ({ createClient: () => state.client }));
import { readActivityEvents, storeActivityEvent } from "../lib/activity-db";
import { readActivityDailySummaries } from "../lib/activity-summary";

const db = createClient({ url: "file::memory:" });
state.client = db;

describe("activity database", () => {
  beforeAll(async () => {
    vi.stubEnv("TURSO_DATABASE_URL", "libsql://test");
    vi.stubEnv("TURSO_AUTH_TOKEN", "test-token");
    await db.executeMultiple(readFileSync("scripts/activity-schema.sql", "utf8"));
  });
  afterEach(async () => { await db.execute("DELETE FROM activity_events"); });
  afterAll(() => { db.close(); vi.unstubAllEnvs(); });

  it("round-trips payloads safely and returns newest events with bounded limits", async () => {
    const older = buildStoredAnalyticsEvent({ event_name: "ask_query_submitted", page: "/ask", source: "ask", query: "'; DROP TABLE activity_events; --" }, "2026-10-01T12:00:00.000Z");
    const newer = { ...older, received_at: "2026-10-02T12:00:00.000Z", session_id: "session-2" };
    await storeActivityEvent(older);
    await storeActivityEvent(newer);
    expect(await readActivityEvents(1)).toEqual([newer]);
    expect(await readActivityEvents(5)).toEqual([newer, older]);
    expect(await readActivityEvents(-1)).toEqual([]);
  });

  it("filters dates before limiting and handles empty or invalid date lists", async () => {
    const base = buildStoredAnalyticsEvent({ event_name: "compare_viewed", page: "/compare", source: "compare" }, "2026-10-01T23:59:59.999Z");
    await storeActivityEvent(base);
    await storeActivityEvent({ ...base, received_at: "2026-10-02T00:00:00.000Z" });
    expect(await readActivityEvents(1, ["2026-10-01"])).toEqual([base]);
    expect(await readActivityEvents(5, [])).toEqual([]);
    await expect(readActivityEvents(5, ["invalid"])).rejects.toThrow("Invalid activity date");
  });

  it("summarizes more than 5,000 events without losing rows with identical timestamps", async () => {
    const event = buildStoredAnalyticsEvent({ event_name: "compare_viewed", page: "/compare", source: "compare" }, "2026-10-01T12:00:00.000Z");
    await db.execute({
      sql: `WITH RECURSIVE numbers(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM numbers WHERE n < 5001)
            INSERT INTO activity_events (id, received_at, event_name, session_id, payload)
            SELECT CAST(n AS TEXT), ?, ?, ?, ? FROM numbers`,
      args: [event.received_at, event.event_name, event.session_id, JSON.stringify(event)]
    });
    await storeActivityEvent({ ...event, received_at: "2026-09-30T23:59:59.999Z" });
    const summaries = await readActivityDailySummaries(["2026-10-01", "2026-10-01"]);
    expect(summaries).toHaveLength(1);
    expect(summaries[0].total_events).toBe(5001);
    expect(summaries[0].event_counts.compare_viewed).toBe(5001);
    expect(await readActivityDailySummaries(["2026-10-02"])).toEqual([]);
  });

  it("reports missing database configuration instead of returning empty analytics", async () => {
    vi.stubEnv("TURSO_AUTH_TOKEN", "");
    try {
      await expect(readActivityDailySummaries(["2026-10-01"])).rejects.toThrow("Activity database is not configured");
    } finally {
      vi.stubEnv("TURSO_AUTH_TOKEN", "test-token");
    }
  });
});
