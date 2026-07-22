import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logSubscription } from "../lib/subscription-logs";

const testLogPath = path.join(process.cwd(), "data", "subscriptions.test.json");
const logDir = path.dirname(testLogPath);

function cleanupLogFile() {
  if (fs.existsSync(testLogPath)) {
    fs.rmSync(testLogPath, { force: true });
  }
}

describe("subscription-logs helpers", () => {
  beforeEach(() => {
    vi.stubEnv("SUBSCRIPTION_LOG_PATH", testLogPath);
    fs.mkdirSync(logDir, { recursive: true });
    cleanupLogFile();
  });

  afterEach(() => {
    cleanupLogFile();
    vi.unstubAllEnvs();
  });

  it("successfully creates a subscription log and appends entries", async () => {
    const entry1 = await logSubscription("Alice", "alice@example.com");
    expect(entry1.name).toBe("Alice");
    expect(entry1.email).toBe("alice@example.com");
    expect(entry1.subscribedAt).toBeDefined();

    // Verify file content on disk
    expect(fs.existsSync(testLogPath)).toBe(true);
    const content = JSON.parse(fs.readFileSync(testLogPath, "utf8"));
    expect(content).toHaveLength(1);
    expect(content[0].email).toBe("alice@example.com");
    expect(content[0].name).toBe("Alice");
  });

  it("does not insert duplicates", async () => {
    await logSubscription("Bob", "bob@example.com");
    await logSubscription("Bob New Name", "bob@example.com");

    const content = JSON.parse(fs.readFileSync(testLogPath, "utf8"));
    expect(content).toHaveLength(1);
    expect(content[0].name).toBe("Bob"); // Keep original or check that name didn't update / duplicate didn't get added
  });
});
