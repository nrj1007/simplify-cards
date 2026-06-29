# Plan 3 — FinancialProduct + BreadcrumbList JSON-LD on card detail pages

## Context

`/cards/[id]` is the deepest, highest-value SEO surface in the app — one page per card,
statically generated, with reviews, fees, reward breakdowns, and verified dates. Yet these pages
emit **no JSON-LD at all**. The SEO landing pages and comparison pages both inject rich
structured data (`FAQPage`, `ItemList`, `FAQPage` respectively), but card detail pages are bare
HTML from Google's perspective.

Adding `FinancialProduct` + `BreadcrumbList` schema:
- Gives Google semantic signals about what the page covers (a financial product with a fee,
  issuer, and network)
- Is the recommended schema.org type for credit cards (FinancialProduct > LoanOrCredit is the
  nearest fit, but FinancialProduct is Google's documented guidance for card pages)
- Enables potential rich results in SERP
- Completes the site's structured-data coverage across all major page types

## Files to change / add

### 1. `lib/card-detail.ts` — add `buildCardJsonLd(card)`

Add a pure function at the bottom of the file. No new imports needed beyond what's already in
the file (`CreditCard` from `./types`, `buildCanonicalUrl` from `./seo`).

```ts
import { buildCanonicalUrl } from "./seo";

export function buildCardJsonLd(card: CreditCard) {
  const url = buildCanonicalUrl(`/cards/${card.id}`);

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: buildCanonicalUrl("/") },
      { "@type": "ListItem", position: 2, name: "Cards", item: buildCanonicalUrl("/finder") },
      { "@type": "ListItem", position: 3, name: card.name, item: url }
    ]
  };

  const product = {
    "@context": "https://schema.org",
    "@type": "FinancialProduct",
    "@id": url,
    name: card.name,
    url,
    description: `${card.name} credit card by ${card.issuer}. Annual fee: ₹${card.annualFee}. Reward type: ${card.rewardType}.`,
    provider: {
      "@type": "BankOrCreditUnion",
      name: card.issuer
    },
    ...(card.annualFee != null
      ? {
          annualPercentageRate: {
            "@type": "QuantitativeValue",
            value: card.annualFee,
            unitText: "INR"
          }
        }
      : {}),
    ...(card.lastVerified ? { dateModified: card.lastVerified } : {})
  };

  return [breadcrumb, product];
}
```

Keep it simple — don't add fields that aren't verified in the card schema. The description is
derived from existing fields, not invented text.

### 2. `app/cards/[id]/page.tsx` — inject the JSON-LD

Near the top of the returned JSX (alongside the existing `<AnalyticsMount>`), add:

```tsx
import { buildCardJsonLd, /* existing imports */ } from "@/lib/card-detail";

// In the component, after card is resolved:
const jsonLd = buildCardJsonLd(card);

// In the JSX, before or after <AnalyticsMount …/>:
{jsonLd.map((schema, i) => (
  <script
    key={i}
    type="application/ld+json"
    dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
  />
))}
```

This is the same pattern already used in `app/ui/SeoLandingPage.tsx` (line 216) and
`app/ui/SeoComparisonPage.tsx`.

## What to verify after

1. Open any `/cards/<id>` in the browser, view source, confirm two `<script
   type="application/ld+json">` blocks appear.
2. Paste the page URL into Google's [Rich Results Test](https://search.google.com/test/rich-results)
   and confirm it detects `BreadcrumbList`.
3. `FinancialProduct` is not currently a rich result type in Google Search Console, but it does
   appear in the Knowledge Panel — no action needed for that.
4. Run `npm run build` to confirm no TS errors.

## What NOT to add

- `ratingValue` / `AggregateRating` — we have no user rating data; fabricating it violates
  Google's guidelines and the project's core principle.
- Pricing fields beyond `annualFee` — joining fee, GST, etc. are too variable and would need
  schema fields that don't map cleanly.
