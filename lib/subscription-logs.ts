import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import {
  isDurableRecordStorageConfigured,
  isVercelRuntime,
  readDurableRecords,
  upsertDurableRecord
} from "./durable-records";

export type SubscriptionEntry = {
  name: string;
  email: string;
  subscribedAt: string;
};

export const subscriptionLogPath = path.join(
  /*turbopackIgnore: true*/ process.cwd(),
  "data",
  "subscriptions.json"
);

function getSubscriptionLogPath() {
  if (process.env.NODE_ENV === "test" && process.env.SUBSCRIPTION_LOG_PATH) {
    return path.join(
      /*turbopackIgnore: true*/ process.cwd(),
      "data",
      path.basename(process.env.SUBSCRIPTION_LOG_PATH)
    );
  }

  return subscriptionLogPath;
}

function subscriptionKey(email: string) {
  return createHash("sha256").update(email).digest("hex");
}

export async function logSubscription(name: string, email: string): Promise<SubscriptionEntry> {
  const entry: SubscriptionEntry = {
    name: name.trim(),
    email: email.trim().toLowerCase(),
    subscribedAt: new Date().toISOString(),
  };

  if (isVercelRuntime()) {
    if (!isDurableRecordStorageConfigured()) {
      throw new Error("Durable subscription storage is not configured");
    }

    const emailHash = subscriptionKey(entry.email);
    await upsertDurableRecord("subscriptions", emailHash, entry);
    console.info(
      JSON.stringify({
        log_type: "subscription_stored",
        email_hash: emailHash,
        subscribed_at: entry.subscribedAt
      })
    );
    return entry;
  }

  try {
    const logPath = getSubscriptionLogPath();
    const logDir = path.dirname(logPath);
    await fs.mkdir(logDir, { recursive: true });

    let existingEntries: SubscriptionEntry[] = [];

    try {
      const existingContent = await fs.readFile(logPath, "utf8");
      existingEntries = JSON.parse(existingContent) as SubscriptionEntry[];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }

    // Check if the email is already subscribed to avoid duplicates
    const isDuplicate = existingEntries.some(
      (e) => e.email.toLowerCase() === entry.email.toLowerCase()
    );

    if (!isDuplicate) {
      existingEntries.push(entry);
      await fs.writeFile(logPath, JSON.stringify(existingEntries, null, 2));
    }
  } catch (error) {
    console.error("Failed to write to subscription log:", error);
    throw error;
  }

  return entry;
}

export async function readSubscriptionLog() {
  if (isVercelRuntime()) {
    if (!isDurableRecordStorageConfigured()) {
      throw new Error("Durable subscription storage is not configured");
    }

    const entries = await readDurableRecords<SubscriptionEntry>("subscriptions");
    return entries.sort((left, right) => right.subscribedAt.localeCompare(left.subscribedAt));
  }

  try {
    const content = await fs.readFile(getSubscriptionLogPath(), "utf8");
    const entries = JSON.parse(content) as SubscriptionEntry[];
    return [...entries].sort((left, right) => right.subscribedAt.localeCompare(left.subscribedAt));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}
