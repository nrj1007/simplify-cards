const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const ROOT = process.cwd();
const COMPARE_DIR = join(ROOT, ".next", "server", "app", "compare");
const SITEMAP_BODY = join(ROOT, ".next", "server", "app", "sitemap.xml.body");
const SITE_URL = "https://www.simplifycards.in";

const pages = [
  {
    slug: "sbi-cashback-vs-hdfc-swiggy",
    title: "SBI Cashback vs Swiggy HDFC Bank: Fees, Rewards &amp; Benefits Compared | SimplifyCards",
    h1: "<h1>SBI Cashback vs Swiggy HDFC Bank</h1>",
    canonical: `${SITE_URL}/compare/sbi-cashback-vs-hdfc-swiggy`
  },
  {
    slug: "hsbc-travelone-vs-axis-atlas",
    title: "HSBC TravelOne vs Axis Bank Atlas: Fees, Rewards &amp; Benefits Compared | SimplifyCards",
    h1: "<h1>HSBC TravelOne vs Axis Bank Atlas</h1>",
    canonical: `${SITE_URL}/compare/axis-atlas-vs-hsbc-travelone`
  }
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

for (const page of pages) {
  const html = readFileSync(join(COMPARE_DIR, `${page.slug}.html`), "utf8");
  assert(html.includes(`<title>${page.title}</title>`), `${page.slug}: missing expected title`);
  assert(html.includes(`rel="canonical" href="${page.canonical}"`), `${page.slug}: missing expected canonical`);
  assert(html.includes(page.h1), `${page.slug}: missing expected H1`);
  assert(!html.includes("Comparing cards..."), `${page.slug}: compare loading skeleton leaked into static SEO HTML`);
}

const sitemap = readFileSync(SITEMAP_BODY, "utf8");
assert(sitemap.includes(`<loc>${SITE_URL}/compare/axis-atlas-vs-hsbc-travelone</loc>`), "sitemap: missing preferred Axis Atlas vs HSBC TravelOne URL");
assert(!sitemap.includes(`<loc>${SITE_URL}/compare/hsbc-travelone-vs-axis-atlas</loc>`), "sitemap: reversed duplicate comparison should not be indexable");

console.log("SEO comparison build output verified.");
