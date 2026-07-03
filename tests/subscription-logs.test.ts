import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { logSubscription, subscriptionLogPath } from "../lib/subscription-logs";

const logDir = path.dirname(subscriptionLogPath);

function cleanupLogFile() {
  if (fs.existsSync(subscriptionLogPath)) {
    fs.rmSync(subscriptionLogPath, { force: true });
  }
}

describe("subscription-logs helpers", () => {
  beforeEach(() => {
    fs.mkdirSync(logDir, { recursive: true });
    cleanupLogFile();
  });

  afterEach(() => {
    cleanupLogFile();
  });

  it("successfully creates a subscription log and appends entries", async () => {
    const entry1 = await logSubscription("Alice", "alice@example.com");
    expect(entry1.name).toBe("Alice");
    expect(entry1.email).toBe("alice@example.com");
    expect(entry1.subscribedAt).toBeDefined();

    // Verify file content on disk
    expect(fs.existsSync(subscriptionLogPath)).toBe(true);
    const content = JSON.parse(fs.readFileSync(subscriptionLogPath, "utf8"));
    expect(content).toHaveLength(1);
    expect(content[0].email).toBe("alice@example.com");
    expect(content[0].name).toBe("Alice");
  });

  it("does not insert duplicates", async () => {
    await logSubscription("Bob", "bob@example.com");
    await logSubscription("Bob New Name", "bob@example.com");

    const content = JSON.parse(fs.readFileSync(subscriptionLogPath, "utf8"));
    expect(content).toHaveLength(1);
    expect(content[0].name).toBe("Bob"); // Keep original or check that name didn't update / duplicate didn't get added
  });
});
