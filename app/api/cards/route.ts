import { createHash } from "node:crypto";
import { cards } from "@/lib/cards";

const CACHE_CONTROL = "public, max-age=0, s-maxage=31536000, stale-while-revalidate=86400";

let cachedBody: string | undefined;
let cachedEtag: string | undefined;

function getCachedCardsResponse() {
  if (!cachedBody) {
    cachedBody = JSON.stringify({ cards });
    cachedEtag = `"${createHash("sha256").update(cachedBody).digest("base64url")}"`;
  }

  return {
    body: cachedBody,
    etag: cachedEtag!
  };
}

function clientHasFreshCopy(request: Request, etag: string) {
  const ifNoneMatch = request.headers.get("if-none-match");
  if (!ifNoneMatch) return false;

  return ifNoneMatch.split(",").some((value) => value.trim() === etag);
}

function cacheHeaders(etag: string) {
  return {
    "Cache-Control": CACHE_CONTROL,
    "Content-Type": "application/json",
    ETag: etag
  };
}

export function GET(request: Request) {
  const cached = getCachedCardsResponse();
  const headers = cacheHeaders(cached.etag);

  if (clientHasFreshCopy(request, cached.etag)) {
    return new Response(null, {
      status: 304,
      headers
    });
  }

  return new Response(cached.body, {
    headers
  });
}
