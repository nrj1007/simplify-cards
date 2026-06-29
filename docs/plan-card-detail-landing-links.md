# Plan 6 — Card detail → SEO landing internal links

## Context

`/cards/[id]` already links to comparison guides via `comparisonsForCard(card.id)` (from
`lib/seo-comparisons.ts`), which looks up the pre-defined `SEO_COMPARISONS` list for any pair
that includes the current card. The same pattern should apply to SEO landing pages.

Currently `lib/seo-landing.ts` has no reverse lookup. A card like HDFC Regalia Gold — which
appears in the top 10 for "best travel cards", "best premium cards", and "best lounge cards" —
has no link from its detail page to those landing pages. These are high-authority internal links
that:
- Improve crawl depth (Googlebot follows them to the landing pages)
- Pass PageRank from card detail (which ranks for the card's own name) to the category pages
- Give users a natural "see more like this" path

The pattern is already established in the codebase; this plan replicates it for landings.

## Files to change

### 1. `lib/seo-landing.ts` — add `landingsForCard(cardId, limit?)`

Add a reverse lookup function after the existing `getSeoLanding` function:

```ts
export function landingsForCard(cardId: string, limit = 4): SeoLandingConfig[] {
  return SEO_LANDINGS.filter((landing) => {
    const topCards = selectCardsForLanding(landing);
    return topCards.some((card) => card.id === cardId);
  }).slice(0, limit);
}
```

`selectCardsForLanding` calls `scoreCards` internally (it's already cached at module load
via the card index) so this is fast — it scores all 10 landing configs and filters for
membership. For 10 configs × 209 cards this is negligible at build time and never called at
runtime (card detail pages are statically generated).

### 2. `app/cards/[id]/page.tsx` — call `landingsForCard`, render "Featured in" section

**a) Import:**

```ts
import { landingsForCard } from "@/lib/seo-landing";
```

**b) Derive at the top of the component (alongside existing `comparisonGuides`):**

```ts
const comparisonGuides = comparisonsForCard(card.id);
const landingGuides = landingsForCard(card.id);   // NEW
```

**c) Render alongside the existing comparison guides section:**

Place the landing links inside or immediately before the comparison guides block (around
line 942 today). Use the same visual treatment as comparison guides to keep the UI consistent:

```tsx
{landingGuides.length > 0 && (
  <div className="panel related-guides">
    <h2 className="section-title">Featured in our guides</h2>
    <ul className="comparison-guide-list">
      {landingGuides.map((landing) => (
        <li key={landing.slug}>
          <Link href={`/${landing.slug}` as Route}>
            {landing.h1}
          </Link>
        </li>
      ))}
    </ul>
  </div>
)}
```

The `as Route` cast is needed because `typedRoutes` is on and dynamic slugs aren't in the
generated route map.

## What the section looks like

For HDFC Regalia Gold, it might render:

> **Featured in our guides**
> - Best Travel Credit Cards in India
> - Best Lounge Access Credit Cards in India
> - Best Premium Credit Cards in India

## Edge cases

- Cards that don't appear in any landing's top-10 get no section (correct — hide it entirely).
- Limit 4 prevents the section from becoming overwhelming for cards that appear everywhere
  (e.g. Axis Atlas, SBI Cashback).
- `selectCardsForLanding` scores at build time (static generation) — no runtime cost.

## Verification

1. Open a card that's clearly a travel card (e.g. HDFC Regalia Gold, Axis Atlas).
2. Confirm "Featured in our guides" section appears with relevant landing links.
3. Click through — confirm each link goes to the correct `/best-*` page.
4. Open a niche card unlikely to appear in any landing (e.g. a co-branded fuel card for a
   regional issuer) — confirm the section is absent.
5. Run `npm run build` — static generation for 209 cards should still complete within expected
   time (~10 calls to `selectCardsForLanding` per card detail = 2,090 scoring runs at build;
   if this is too slow, memoize `selectCardsForLanding` with a `Map<string, CreditCard[]>`
   built once at module load).
