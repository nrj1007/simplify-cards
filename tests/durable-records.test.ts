import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const blobMocks = vi.hoisted(() => ({
  get: vi.fn(),
  list: vi.fn(),
  put: vi.fn()
}));

vi.mock("@vercel/blob", () => blobMocks);

import {
  durableRecordPrefix,
  isDurableRecordStorageConfigured,
  readDurableRecords,
  upsertDurableRecord,
  writeUniqueDurableRecord
} from "../lib/durable-records";

function jsonStream(value: unknown) {
  return new Response(JSON.stringify(value)).body;
}

describe("durable record storage", () => {
  beforeEach(() => {
    blobMocks.get.mockReset();
    blobMocks.list.mockReset();
    blobMocks.put.mockReset();
    blobMocks.put.mockResolvedValue({});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("recognizes read-write token configuration", () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "test-token");
    expect(isDurableRecordStorageConfigured()).toBe(true);
  });

  it("writes immutable records under the requested private prefix", async () => {
    await writeUniqueDurableRecord("feedback", { feedback: "up" }, "2026-07-22T10:00:00.000Z");

    expect(blobMocks.put).toHaveBeenCalledOnce();
    const [pathname, body, options] = blobMocks.put.mock.calls[0];
    expect(pathname).toMatch(/^simplifycards\/v1\/feedback\/2026-07-22T10-00-00-000Z-[\w-]+\.json$/);
    expect(JSON.parse(String(body))).toEqual({ feedback: "up" });
    expect(options).toMatchObject({ access: "private", addRandomSuffix: false });
  });

  it("upserts stable records without exposing their value in the prefix", async () => {
    await upsertDurableRecord("subscriptions", "hashed-email", { email: "person@example.com" });

    expect(blobMocks.put).toHaveBeenCalledWith(
      `${durableRecordPrefix("subscriptions")}hashed-email.json`,
      JSON.stringify({ email: "person@example.com" }),
      expect.objectContaining({ access: "private", allowOverwrite: true })
    );
  });

  it("reads private records newest first and skips malformed entries", async () => {
    blobMocks.list.mockResolvedValue({
      blobs: [
        { pathname: "older.json", uploadedAt: new Date("2026-07-20T10:00:00.000Z") },
        { pathname: "newer.json", uploadedAt: new Date("2026-07-22T10:00:00.000Z") },
        { pathname: "broken.json", uploadedAt: new Date("2026-07-21T10:00:00.000Z") }
      ],
      hasMore: false
    });
    blobMocks.get.mockImplementation(async (pathname: string) => {
      if (pathname === "broken.json") throw new Error("Invalid record");
      return {
        stream: jsonStream({ pathname })
      };
    });
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(readDurableRecords("feedback")).resolves.toEqual([
      { pathname: "newer.json" },
      { pathname: "older.json" }
    ]);
    expect(blobMocks.list).toHaveBeenCalledWith(
      expect.objectContaining({ prefix: durableRecordPrefix("feedback") })
    );
  });
});
