import { createHash } from "node:crypto";
import type { RecommendationInput } from "./types";

const WINDOW_MS = 24 * 60 * 60 * 1000;
const FAST_REPEAT_MS = 90 * 1000;
const GENERATED_QUERY_DAILY_LIMIT = 10;
const REPEATED_IP_SIGNAL_THRESHOLD = 50;
const REPEATED_PATTERN_SIGNAL_THRESHOLD = 6;

type BotBucket = {
  count: number;
  resetAt: number;
  lastSeenAt: number;
};

export type AskBotSignalResult = {
  suspicious: boolean;
  action: "allow" | "log";
  riskScore: number;
  rules: string[];
  ipHash: string;
  queryHash: string | null;
  queryPatternHash: string | null;
  queryPattern: string | null;
  ipDailyCount: number;
  queryPatternDailyCount: number;
  millisecondsSinceLastIpRequest: number | null;
};

const buckets = new Map<string, BotBucket>();

function now() {
  return Date.now();
}

function firstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() || null;
}

function headerValue(request: Request, name: string) {
  return request.headers.get(name)?.trim() || "";
}

function getIp(request: Request) {
  return (
    firstHeaderValue(request.headers.get("x-forwarded-for")) ??
    firstHeaderValue(request.headers.get("x-real-ip")) ??
    firstHeaderValue(request.headers.get("x-vercel-forwarded-for")) ??
    "unknown"
  );
}

function hashForLog(value: string) {
  return createHash("sha256").update(value).digest("base64url").slice(0, 16);
}

function normalizeQuery(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function bucketFor(key: string, currentTime: number) {
  const existing = buckets.get(key);
  if (existing && existing.resetAt > currentTime) return existing;

  const next = { count: 0, resetAt: currentTime + WINDOW_MS, lastSeenAt: 0 };
  buckets.set(key, next);
  return next;
}

function pruneExpired(currentTime: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= currentTime) buckets.delete(key);
  }
}

function countMatches(value: string, pattern: RegExp) {
  return value.match(pattern)?.length ?? 0;
}

function hasBrowserUserAgent(userAgent: string) {
  return /mozilla|chrome|safari|firefox|edg|crios|fxios/i.test(userAgent);
}

function isKnownBotUserAgent(userAgent: string) {
  return /bot|crawler|spider|crawling|headless|playwright|puppeteer|python|curl|wget|httpclient|scrapy|lighthouse|pagespeed/i.test(userAgent);
}

function queryPattern(query: string) {
  if (!query) return null;

  return query
    .replace(/\brs\.?\s*\d+(?:k|\+)?(?:\s*-\s*\d+(?:k|\+)?)?/gi, "rs <amount>")
    .replace(/\b\d+(?:k|\+)?(?:\s*-\s*\d+(?:k|\+)?)?\b/g, "<number>")
    .replace(/\s+/g, " ")
    .slice(0, 240)
    .trim();
}

function generatedQueryScore(query: string) {
  const spendMatches = countMatches(query, /\bwith\s+(?:monthly\s+)?spend\b/g);
  const purposeMatches = countMatches(
    query,
    /\bfor\s+(?:travel|cashback|(?:airport\s+)?lounge(?:\s+access)?|low\s+annual\s+fee|fuel|upi|online\s+shopping|movies?)\b/g
  );
  const repeatedGoodFitMatches = countMatches(query, /\bgood\s+fit\s+for\s+me\b/g);
  const repeatedWithMatches = countMatches(query, /\bwith\b/g);
  const repeatedForMatches = countMatches(query, /\bfor\b/g);

  return spendMatches * 2 + purposeMatches + repeatedGoodFitMatches + Math.max(0, repeatedWithMatches - 2) + Math.max(0, repeatedForMatches - 3);
}

export function detectAskBotSignals(request: Request, input: RecommendationInput): AskBotSignalResult {
  const currentTime = now();
  pruneExpired(currentTime);

  const ip = getIp(request);
  const query = normalizeQuery(input.query ?? "");
  const pattern = queryPattern(query);
  const userAgent = headerValue(request, "user-agent");
  const referrer = headerValue(request, "referer");
  const ipBucket = bucketFor(`ip:${ip}`, currentTime);
  const patternBucket = pattern ? bucketFor(`pattern:${ip}:${pattern}`, currentTime) : null;
  const millisecondsSinceLastIpRequest = ipBucket.lastSeenAt > 0 ? currentTime - ipBucket.lastSeenAt : null;

  ipBucket.count += 1;
  ipBucket.lastSeenAt = currentTime;
  if (patternBucket) {
    patternBucket.count += 1;
    patternBucket.lastSeenAt = currentTime;
  }

  const rules: string[] = [];
  let riskScore = 0;
  const generatedScore = generatedQueryScore(query);

  if (generatedScore >= 4) {
    rules.push("generated_query_pattern");
    riskScore += 4;
  }
  if (query.length > 220 && generatedScore >= 2) {
    rules.push("long_repetitive_query");
    riskScore += 2;
  }
  if (patternBucket && patternBucket.count > GENERATED_QUERY_DAILY_LIMIT && generatedScore >= 3) {
    rules.push("repeated_generated_query_pattern");
    riskScore += 4;
  } else if (patternBucket && patternBucket.count >= REPEATED_PATTERN_SIGNAL_THRESHOLD) {
    rules.push("repeated_query_pattern");
    riskScore += 2;
  }
  if (ipBucket.count > REPEATED_IP_SIGNAL_THRESHOLD) {
    rules.push("repeated_ip_activity");
    riskScore += 2;
  }
  if (millisecondsSinceLastIpRequest !== null && millisecondsSinceLastIpRequest <= FAST_REPEAT_MS && ipBucket.count >= 5) {
    rules.push("fast_repeat_ip_activity");
    riskScore += 3;
  }
  if (!referrer) {
    rules.push("empty_referrer");
    riskScore += 1;
  }
  if (!userAgent) {
    rules.push("missing_user_agent");
    riskScore += 3;
  } else if (isKnownBotUserAgent(userAgent)) {
    rules.push("bot_user_agent");
    riskScore += 4;
  } else if (!hasBrowserUserAgent(userAgent)) {
    rules.push("non_browser_user_agent");
    riskScore += 2;
  }

  const suspicious = riskScore >= 4;

  return {
    suspicious,
    action: suspicious ? "log" : "allow",
    riskScore,
    rules,
    ipHash: hashForLog(ip),
    queryHash: query ? hashForLog(query) : null,
    queryPatternHash: pattern ? hashForLog(pattern) : null,
    queryPattern: pattern,
    ipDailyCount: ipBucket.count,
    queryPatternDailyCount: patternBucket?.count ?? 0,
    millisecondsSinceLastIpRequest
  };
}

export function buildAskBotSignalMetadata(result: AskBotSignalResult) {
  return {
    bot_signal_action: result.action,
    bot_signal_risk_score: result.riskScore,
    bot_signal_rules: result.rules,
    bot_signal_ip_hash: result.ipHash,
    bot_signal_query_hash: result.queryHash,
    bot_signal_query_pattern_hash: result.queryPatternHash,
    bot_signal_query_pattern: result.queryPattern,
    bot_signal_ip_daily_count: result.ipDailyCount,
    bot_signal_query_pattern_daily_count: result.queryPatternDailyCount,
    bot_signal_ms_since_last_ip_request: result.millisecondsSinceLastIpRequest
  };
}

export function clearAskBotSignals() {
  buckets.clear();
}
