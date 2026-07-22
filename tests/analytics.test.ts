import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../app/api/analytics/route";
import { appendAnalyticsEvent, readAnalyticsLog } from "../lib/analytics-logs";
import { validateAnalyticsEventPayload } from "../lib/analytics";

const logPath = path.join(process.cwd(), "data", "analytics", "events.test.jsonl");
const originalVercel = process.env.VERCEL;
const originalBlobToken = process.env.BLOB_READ_WRITE_TOKEN;
const originalOidcToken = process.env.VERCEL_OIDC_TOKEN;
const originalBlobStoreId = process.env.BLOB_STORE_ID;

function cleanup() {
  if (fs.existsSync(logPath)) fs.unlinkSync(logPath);
}

describe("analytics validation and logging", () => {
  beforeEach(() => {
    process.env.ANALYTICS_LOG_PATH = logPath;
    delete process.env.BLOB_READ_WRITE_TOKEN;
    delete process.env.VERCEL_OIDC_TOKEN;
    delete process.env.BLOB_STORE_ID;
    cleanup();
  });

  afterEach(() => {
    delete process.env.ANALYTICS_LOG_PATH;
    if (originalVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = originalVercel;
    if (originalBlobToken === undefined) delete process.env.BLOB_READ_WRITE_TOKEN;
    else process.env.BLOB_READ_WRITE_TOKEN = originalBlobToken;
    if (originalOidcToken === undefined) delete process.env.VERCEL_OIDC_TOKEN;
    else process.env.VERCEL_OIDC_TOKEN = originalOidcToken;
    if (originalBlobStoreId === undefined) delete process.env.BLOB_STORE_ID;
    else process.env.BLOB_STORE_ID = originalBlobStoreId;
    vi.restoreAllMocks();
    cleanup();
  });

  it("accepts a valid analytics payload", () => {
    const result = validateAnalyticsEventPayload({
      event_name: "ask_query_submitted",
      page: "ask",
      source: "ask",
      query: "best cashback card"
    });

    expect(result.ok).toBe(true);
  });

  it("rejects unknown analytics event names", () => {
    const result = validateAnalyticsEventPayload({
      event_name: "unknown_event",
      page: "ask",
      source: "ask"
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/unknown analytics event name/i);
    }
  });

  it("rejects missing page", () => {
    const result = validateAnalyticsEventPayload({
      event_name: "ask_query_submitted",
      source: "ask"
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/page is required/i);
    }
  });

  it("rejects non-array card_ids", () => {
    const result = validateAnalyticsEventPayload({
      event_name: "compare_viewed",
      page: "compare",
      source: "compare",
      card_ids: "hdfc-millennia"
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/card_ids must be an array/i);
    }
  });

  it("creates the analytics log directory and appends jsonl events", async () => {
    await appendAnalyticsEvent({
      event_name: "compare_viewed",
      received_at: "2026-06-07T12:00:00.000Z",
      session_id: "session-1",
      page: "compare",
      source: "compare",
      card_ids: ["a", "b"],
      device_type: "desktop",
      referrer: ""
    });

    expect(fs.existsSync(logPath)).toBe(true);
    const lines = fs.readFileSync(logPath, "utf8").trim().split("\n");
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0])).toMatchObject({
      event_name: "compare_viewed",
      card_ids: ["a", "b"]
    });
  });

  it("writes structured runtime logs instead of filesystem analytics on Vercel", async () => {
    process.env.VERCEL = "1";
    const consoleInfo = vi.spyOn(console, "info").mockImplementation(() => {});

    await appendAnalyticsEvent({
      event_name: "ask_query_submitted",
      received_at: "2026-06-07T12:00:00.000Z",
      session_id: "session-1",
      page: "ask",
      source: "ask",
      query: "best cashback card",
      device_type: "desktop",
      referrer: ""
    });

    expect(fs.existsSync(logPath)).toBe(false);
    expect(consoleInfo).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(consoleInfo.mock.calls[0]?.[0]))).toMatchObject({
      log_type: "analytics_event",
      event_name: "ask_query_submitted",
      page: "ask",
      query: "best cashback card"
    });
    await expect(readAnalyticsLog()).rejects.toThrow("Durable analytics storage is not configured");
  });

  it("reads recent analytics log entries and skips malformed jsonl lines", async () => {
    await appendAnalyticsEvent({
      event_name: "ask_query_submitted",
      received_at: "2026-06-07T12:00:00.000Z",
      session_id: "session-1",
      page: "ask",
      source: "ask",
      query: "best cashback card",
      device_type: "desktop",
      referrer: ""
    });
    fs.appendFileSync(logPath, "not-json\n", "utf8");
    await appendAnalyticsEvent({
      event_name: "apply_clicked",
      received_at: "2026-06-07T12:05:00.000Z",
      session_id: "session-1",
      page: "ask",
      source: "ask",
      card_id: "hdfc-millennia",
      device_type: "desktop",
      referrer: ""
    });

    const events = await readAnalyticsLog(2);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      event_name: "apply_clicked",
      card_id: "hdfc-millennia"
    });
  });

  it("returns an empty analytics log when the file is missing", async () => {
    await expect(readAnalyticsLog()).resolves.toEqual([]);
  });

  it("accepts valid POST requests on /api/analytics", async () => {
    const response = await POST(
      new Request("http://localhost/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_name: "details_clicked",
          page: "finder",
          source: "finder",
          card_id: "hdfc-millennia",
          session_id: "session-1",
          device_type: "desktop",
          referrer: ""
        })
      })
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ ok: true });

    const lines = fs.readFileSync(logPath, "utf8").trim().split("\n");
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0])).toMatchObject({
      event_name: "details_clicked",
      card_id: "hdfc-millennia"
    });
  });

  it("rejects malformed POST requests on /api/analytics", async () => {
    const response = await POST(
      new Request("http://localhost/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_name: "details_clicked",
          source: "finder"
        })
      })
    );

    expect(response.status).toBe(400);
  });
});
