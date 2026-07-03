import fs from "node:fs/promises";
import path from "node:path";

export type SubscriptionEntry = {
  name: string;
  email: string;
  subscribedAt: string;
};

export const subscriptionLogPath = path.join(process.cwd(), "data", "subscriptions.json");

export async function logSubscription(name: string, email: string): Promise<SubscriptionEntry> {
  const entry: SubscriptionEntry = {
    name: name.trim(),
    email: email.trim().toLowerCase(),
    subscribedAt: new Date().toISOString(),
  };

  try {
    const logDir = path.dirname(subscriptionLogPath);
    await fs.mkdir(logDir, { recursive: true });

    let existingEntries: SubscriptionEntry[] = [];

    try {
      const existingContent = await fs.readFile(subscriptionLogPath, "utf8");
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
      await fs.writeFile(subscriptionLogPath, JSON.stringify(existingEntries, null, 2));
    }
  } catch (error) {
    console.error("Failed to write to subscription log:", error);
  }

  return entry;
}
