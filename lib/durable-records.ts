import { get, list, put } from "@vercel/blob";
import type { ListBlobResultBlob } from "@vercel/blob";
import { randomUUID } from "node:crypto";

export const durableRecordKinds = ["unsupported-questions", "feedback", "subscriptions", "analytics"] as const;

export type DurableRecordKind = (typeof durableRecordKinds)[number];

const RECORD_ROOT = "simplifycards/v1";
const MAX_LIST_PAGES = 10;
const READ_BATCH_SIZE = 20;

export function isVercelRuntime() {
  return process.env.VERCEL === "1";
}

export function isDurableRecordStorageConfigured() {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN ||
      (process.env.VERCEL_OIDC_TOKEN && process.env.BLOB_STORE_ID)
  );
}

export function durableRecordPrefix(kind: DurableRecordKind) {
  return `${RECORD_ROOT}/${kind}/`;
}

function timestampPathPart(value: string) {
  const date = new Date(value);
  const normalized = Number.isFinite(date.getTime()) ? date.toISOString() : new Date().toISOString();
  return normalized.replace(/[:.]/g, "-");
}

export async function writeUniqueDurableRecord<T>(kind: DurableRecordKind, value: T, occurredAt: string) {
  const pathname = `${durableRecordPrefix(kind)}${timestampPathPart(occurredAt)}-${randomUUID()}.json`;

  await put(pathname, JSON.stringify(value), {
    access: "private",
    addRandomSuffix: false,
    contentType: "application/json"
  });

  return pathname;
}

export async function upsertDurableRecord<T>(kind: DurableRecordKind, key: string, value: T) {
  const pathname = `${durableRecordPrefix(kind)}${key}.json`;

  await put(pathname, JSON.stringify(value), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json"
  });

  return pathname;
}

async function readDurableRecord<T>(pathname: string) {
  const result = await get(pathname, { access: "private", useCache: false });
  if (!result?.stream) return null;

  const content = await new Response(result.stream).text();
  return JSON.parse(content) as T;
}

export async function readDurableRecords<T>(kind: DurableRecordKind, limit = 250) {
  const blobs: ListBlobResultBlob[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < MAX_LIST_PAGES; page += 1) {
    const result = await list({
      prefix: durableRecordPrefix(kind),
      limit: 1000,
      ...(cursor ? { cursor } : {})
    });

    blobs.push(...result.blobs);
    if (!result.hasMore || !result.cursor) break;
    cursor = result.cursor;
  }

  const selected = blobs
    .sort((left, right) => right.uploadedAt.getTime() - left.uploadedAt.getTime())
    .slice(0, Math.max(0, limit));
  const entries: T[] = [];

  for (let index = 0; index < selected.length; index += READ_BATCH_SIZE) {
    const batch = selected.slice(index, index + READ_BATCH_SIZE);
    const values = await Promise.all(
      batch.map(async (blob) => {
        try {
          return await readDurableRecord<T>(blob.pathname);
        } catch (error) {
          console.error(`Failed to read durable record ${blob.pathname}:`, error);
          return null;
        }
      })
    );

    for (const value of values) {
      if (value !== null) entries.push(value as T);
    }
  }

  return entries;
}
