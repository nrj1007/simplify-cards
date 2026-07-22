import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function valuesMatch(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function parseBasicCredentials(header: string | null) {
  if (!header?.startsWith("Basic ")) return null;

  try {
    const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
    const separator = decoded.indexOf(":");
    if (separator < 0) return null;

    return {
      username: decoded.slice(0, separator),
      password: decoded.slice(separator + 1)
    };
  } catch {
    return null;
  }
}

function unauthorizedResponse() {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "Cache-Control": "no-store",
      "WWW-Authenticate": 'Basic realm="SimplifyCards review", charset="UTF-8"'
    }
  });
}

export function proxy(request: NextRequest) {
  const expectedUsername = process.env.REVIEW_AUTH_USER;
  const expectedPassword = process.env.REVIEW_AUTH_PASSWORD;

  if (!expectedUsername || !expectedPassword) {
    if (process.env.VERCEL === "1") {
      return new NextResponse("Review access is not configured", {
        status: 503,
        headers: { "Cache-Control": "no-store" }
      });
    }

    return NextResponse.next();
  }

  const credentials = parseBasicCredentials(request.headers.get("authorization"));
  if (
    !credentials ||
    !valuesMatch(credentials.username, expectedUsername) ||
    !valuesMatch(credentials.password, expectedPassword)
  ) {
    return unauthorizedResponse();
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/review/:path*"
};
