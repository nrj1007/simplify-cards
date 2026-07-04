import { createHash } from "node:crypto";
import type { AskAiResult } from "./ask-ai";

export type AskCacheStatus = "HIT" | "MISS" | "SKIP";

const MAX_ENTRIES = 200;
const TTL_MS = 24 * 60 * 60 * 1000;

type CacheEntry = {
  value: AskAiResult;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry>();

function now() {
  return Date.now();
}

function cloneResult(result: AskAiResult): AskAiResult {
  return structuredClone(result);
}

function pruneExpired(currentTime = now()) {
  for (const [key, entry] of cache) {
    if (entry.expiresAt <= currentTime) cache.delete(key);
  }
}

function enforceMaxEntries() {
  while (cache.size > MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value as string | undefined;
    if (!oldestKey) return;
    cache.delete(oldestKey);
  }
}

export function askCacheKey(value: unknown) {
  const payload = stableStringify(value);
  return createHash("sha256").update(payload).digest("base64url");
}

export function getAskCache(key: string): AskAiResult | null {
  const entry = cache.get(key);
  if (!entry) return null;

  if (entry.expiresAt <= now()) {
    cache.delete(key);
    return null;
  }

  cache.delete(key);
  cache.set(key, entry);
  return cloneResult(entry.value);
}

export function setAskCache(key: string, value: AskAiResult) {
  pruneExpired();
  cache.set(key, {
    value: cloneResult(value),
    expiresAt: now() + TTL_MS
  });
  enforceMaxEntries();
}

export function clearAskCache() {
  cache.clear();
}

export function askCacheSize() {
  pruneExpired();
  return cache.size;
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(sortStable(value));
}

function sortStable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortStable);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, sortStable(item)])
  );
}
