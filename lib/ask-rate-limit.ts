import { createHash } from "node:crypto";
import type { RecommendationInput } from "./types";

const WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_REQUESTS_PER_IP = 100;
const MAX_REQUESTS_PER_IP_QUERY = 20;

type RateBucket = {
  count: number;
  resetAt: number;
};

export type AskRateLimitResult =
  | { allowed: true }
  | {
      allowed: false;
      reason: "ip_daily_limit" | "ip_query_daily_limit";
      retryAfterSeconds: number;
      limit: number;
      remaining: 0;
    };
type AskRateLimitReason = Exclude<AskRateLimitResult, { allowed: true }>["reason"];

const buckets = new Map<string, RateBucket>();

function now() {
  return Date.now();
}

function normalizeQuery(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function firstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() || null;
}

function requestHeader(request: Request, name: string) {
  return request.headers.get(name);
}

export function getAskRateLimitIp(request: Request) {
  return (
    firstHeaderValue(requestHeader(request, "x-forwarded-for")) ??
    firstHeaderValue(requestHeader(request, "x-real-ip")) ??
    firstHeaderValue(requestHeader(request, "x-vercel-forwarded-for")) ??
    "unknown"
  );
}

function hashForLog(value: string) {
  return createHash("sha256").update(value).digest("base64url").slice(0, 16);
}

export function buildAskRateLimitMetadata(request: Request, input: RecommendationInput, result: Exclude<AskRateLimitResult, { allowed: true }>) {
  const ip = getAskRateLimitIp(request);
  const query = normalizeQuery(input.query ?? "");

  return {
    rate_limit_reason: result.reason,
    rate_limit_limit: result.limit,
    rate_limit_retry_after_seconds: result.retryAfterSeconds,
    rate_limit_ip_hash: hashForLog(ip),
    rate_limit_query_hash: query ? hashForLog(query) : null
  };
}

function bucketFor(key: string, currentTime: number) {
  const existing = buckets.get(key);
  if (existing && existing.resetAt > currentTime) return existing;

  const next = { count: 0, resetAt: currentTime + WINDOW_MS };
  buckets.set(key, next);
  return next;
}

function pruneExpired(currentTime: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= currentTime) buckets.delete(key);
  }
}

function retryAfterSeconds(bucket: RateBucket, currentTime: number) {
  return Math.max(1, Math.ceil((bucket.resetAt - currentTime) / 1000));
}

export function checkAskRateLimit(request: Request, input: RecommendationInput): AskRateLimitResult {
  const currentTime = now();
  pruneExpired(currentTime);

  const ip = getAskRateLimitIp(request);
  const query = normalizeQuery(input.query ?? "");
  const ipBucket = bucketFor(`ip:${ip}`, currentTime);
  const queryBucket = query ? bucketFor(`ip-query:${ip}:${query}`, currentTime) : null;

  if (ipBucket.count >= MAX_REQUESTS_PER_IP) {
    logAskRateLimited(request, input, "ip_daily_limit", ip, ipBucket);
    return {
      allowed: false,
      reason: "ip_daily_limit",
      retryAfterSeconds: retryAfterSeconds(ipBucket, currentTime),
      limit: MAX_REQUESTS_PER_IP,
      remaining: 0
    };
  }

  if (queryBucket && queryBucket.count >= MAX_REQUESTS_PER_IP_QUERY) {
    logAskRateLimited(request, input, "ip_query_daily_limit", ip, queryBucket);
    return {
      allowed: false,
      reason: "ip_query_daily_limit",
      retryAfterSeconds: retryAfterSeconds(queryBucket, currentTime),
      limit: MAX_REQUESTS_PER_IP_QUERY,
      remaining: 0
    };
  }

  ipBucket.count += 1;
  if (queryBucket) queryBucket.count += 1;

  return { allowed: true };
}

function logAskRateLimited(
  request: Request,
  input: RecommendationInput,
  reason: AskRateLimitReason,
  ip: string,
  bucket: RateBucket
) {
  console.info(
    JSON.stringify({
      log_type: "ask_rate_limited",
      reason,
      ip_hash: hashForLog(ip),
      query_hash: input.query ? hashForLog(normalizeQuery(input.query)) : null,
      user_agent: request.headers.get("user-agent") ?? "",
      country: request.headers.get("x-vercel-ip-country") ?? "",
      asn: request.headers.get("x-vercel-ip-as-number") ?? "",
      reset_at: new Date(bucket.resetAt).toISOString()
    })
  );
}

export function clearAskRateLimit() {
  buckets.clear();
}
