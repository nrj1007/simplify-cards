import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST } from "../app/api/analytics/route";
import { appendAnalyticsEvent } from "../lib/analytics-logs";
import { validateAnalyticsEventPayload } from "../lib/analytics";

let tempDir = "";
let logPath = "";

function cleanup() {
  if (tempDir && fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

describe("analytics validation and logging", () => {
  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "card-ai-analytics-"));
    logPath = path.join(tempDir, "events.jsonl");
    process.env.ANALYTICS_LOG_PATH = logPath;
  });

  afterEach(() => {
    delete process.env.ANALYTICS_LOG_PATH;
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
