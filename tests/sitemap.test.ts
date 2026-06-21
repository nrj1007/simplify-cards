import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";
import sitemap from "../app/sitemap";
import { cards } from "../lib/cards";
import { buildCanonicalUrl } from "../lib/seo";

const APP_DIR = join(process.cwd(), "app");
const INTERNAL_ROUTE_PREFIXES = ["/review"];

function listPageFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) return listPageFiles(fullPath);
    return entry === "page.tsx" ? [fullPath] : [];
  });
}

function routeFromPageFile(filePath: string) {
  const relativePath = relative(APP_DIR, filePath).split(sep);
  const segments = relativePath.slice(0, -1).filter((segment) => !segment.startsWith("(") && !segment.endsWith(")"));

  if (segments.some((segment) => segment.startsWith("[") && segment.endsWith("]"))) return null;
  return segments.length === 0 ? "/" : `/${segments.join("/")}`;
}

function isPublicStaticRoute(route: string) {
  return !INTERNAL_ROUTE_PREFIXES.some((prefix) => route === prefix || route.startsWith(`${prefix}/`));
}

describe("sitemap", () => {
  const sitemapUrls = new Set(sitemap().map((entry) => entry.url));

  it("includes every public static app page", () => {
    const missingRoutes = listPageFiles(APP_DIR)
      .map(routeFromPageFile)
      .filter((route): route is string => Boolean(route))
      .filter(isPublicStaticRoute)
      .filter((route) => !sitemapUrls.has(buildCanonicalUrl(route)));

    expect(missingRoutes).toEqual([]);
  });

  it("includes every card detail page", () => {
    const missingCardIds = cards
      .filter((card) => !sitemapUrls.has(buildCanonicalUrl(`/cards/${card.id}`)))
      .map((card) => card.id);

    expect(missingCardIds).toEqual([]);
  });
});
