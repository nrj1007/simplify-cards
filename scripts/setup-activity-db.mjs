import { readFile } from "node:fs/promises";
import { createClient } from "@libsql/client/web";

if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
  throw new Error("Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN before running this script");
}
const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
try {
  await client.executeMultiple(await readFile(new URL("./activity-schema.sql", import.meta.url), "utf8"));
  await client.execute("SELECT id FROM activity_events LIMIT 1");
  console.log("Activity schema ready; database connection verified.");
} finally {
  client.close();
}
