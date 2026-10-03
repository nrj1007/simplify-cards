import { readFileSync } from "node:fs";
import { createClient } from "@libsql/client";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { buildStoredAnalyticsEvent } from "../lib/analytics";

const state = vi.hoisted(() => ({ client: undefined as unknown }));
vi.mock("@libsql/client/web", () => ({ createClient: () => state.client }));
import { readActivityEvents, storeActivityEvent } from "../lib/activity-db";

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
});
