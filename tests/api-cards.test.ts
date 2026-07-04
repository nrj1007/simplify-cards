import { describe, expect, it } from "vitest";
import { GET } from "../app/api/cards/route";
import { cards } from "../lib/cards";

function cardsRequest(headers?: HeadersInit) {
  return new Request("http://localhost/api/cards", { headers });
}

describe("/api/cards Route Handler", () => {
  it("returns the card dataset with cache headers", async () => {
    const response = GET(cardsRequest());

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(
      "public, max-age=0, s-maxage=31536000, stale-while-revalidate=86400"
    );
    expect(response.headers.get("Content-Type")).toBe("application/json");

    const etag = response.headers.get("ETag");
    expect(etag).toMatch(/^"[A-Za-z0-9_-]+"$/);

    const body = await response.json();
    expect(body.cards).toHaveLength(cards.length);
    expect(body.cards[0].id).toBe(cards[0].id);
  });

  it("returns 304 when the client already has the current ETag", async () => {
    const firstResponse = GET(cardsRequest());
    const etag = firstResponse.headers.get("ETag");
    expect(etag).toBeTruthy();

    const response = GET(cardsRequest({ "If-None-Match": etag! }));

    expect(response.status).toBe(304);
    expect(response.headers.get("ETag")).toBe(etag);
    expect(response.headers.get("Cache-Control")).toBe(
      "public, max-age=0, s-maxage=31536000, stale-while-revalidate=86400"
    );
    expect(await response.text()).toBe("");
  });
});
