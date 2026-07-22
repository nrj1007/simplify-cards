import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { config, proxy } from "../proxy";

function reviewRequest(authorization?: string) {
  return new NextRequest("https://www.simplifycards.in/review/feedback", {
    headers: authorization ? { authorization } : undefined
  });
}

describe("review route proxy", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("only matches review routes", () => {
    expect(config.matcher).toBe("/review/:path*");
  });

  it("fails closed on Vercel when credentials are not configured", () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("REVIEW_AUTH_USER", "");
    vi.stubEnv("REVIEW_AUTH_PASSWORD", "");

    expect(proxy(reviewRequest()).status).toBe(503);
  });

  it("allows local review access when credentials are not configured", () => {
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("REVIEW_AUTH_USER", "");
    vi.stubEnv("REVIEW_AUTH_PASSWORD", "");

    const response = proxy(reviewRequest());
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("challenges missing or invalid credentials", () => {
    vi.stubEnv("REVIEW_AUTH_USER", "reviewer");
    vi.stubEnv("REVIEW_AUTH_PASSWORD", "correct-password");

    const response = proxy(reviewRequest(`Basic ${Buffer.from("reviewer:wrong-password").toString("base64")}`));
    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toMatch(/^Basic /);
  });

  it("allows valid credentials", () => {
    vi.stubEnv("REVIEW_AUTH_USER", "reviewer");
    vi.stubEnv("REVIEW_AUTH_PASSWORD", "correct-password");

    const authorization = `Basic ${Buffer.from("reviewer:correct-password").toString("base64")}`;
    const response = proxy(reviewRequest(authorization));

    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});
