# Plan: Improve SEO Landing Pages and Comparison Pages for SimplifyCards

Improve the SEO landing pages and comparison pages for SimplifyCards without changing the existing visual design, theme, card data model, affiliate/apply links, or existing routes.

## Context
The site already has:
- 10 SEO guide pages such as `/best-credit-cards-india`, `/best-cashback-credit-cards-india`, etc.
- Static comparison pages such as `/compare/axis-atlas-vs-hdfc-regalia-gold`
- Footer links to Popular guides and Popular comparisons
- Sitemap, robots.txt, metadata and canonical URLs

## Goal
Improve page quality, internal linking, ranking relevance, and SEO structure.

## Tasks

### 1. Improve guide-page card ranking logic
For each SEO guide page, ensure the listed cards strongly match the page intent.
*Examples:*
- `/best-cashback-credit-cards-india` should prioritize cashback-first cards, not premium travel cards.
- `/best-travel-credit-cards-india` should prioritize travel rewards, forex, miles, hotel/airline benefits and lounge value.
- `/best-lounge-access-credit-cards-india` should prioritize domestic/international lounge access.
- `/best-fuel-credit-cards-india` should prioritize fuel surcharge waiver and fuel rewards.
- `/best-rupay-credit-cards-india` should prioritize RuPay/UPI cards.
- `/best-premium-credit-cards-india` should prioritize premium benefits, lounge, travel, concierge, milestones and premium reward value.
- `/best-credit-cards-for-beginners-india` should prioritize simple, low-fee, easy-to-understand cards.

*Guidelines:*
- Do not invent data. Use existing card data only.
- If category-specific scoring is needed, create a reusable ranking configuration/helper.

### 2. Add clear reasoning for why each card is ranked
For every card shown on a guide page, add concise explanation fields:
- Why this card is included
- Best for
- Main limitation
- Who should avoid it

*Guidelines:*
- Use existing data only. If unavailable, show safe fallback text.

### 3. Improve internal linking
Add contextual internal links:
- From homepage to top 4-6 guide pages, not only footer
- From card detail pages to relevant guide pages
- From card detail pages to relevant comparison pages
- From guide pages to related guide pages
- From comparison pages to related comparisons
- From guide pages to `/ask?query=...` CTA links

*Guidelines:*
- Avoid overloading pages with too many links. Keep links useful and contextual.

### 4. Add comparison links to card detail pages
For each card detail page, add a "Popular comparisons" or "Compare with similar cards" section where relevant.
*Examples:*
- Axis Atlas page should link to:
  - `/compare/axis-atlas-vs-hdfc-regalia-gold`
  - `/compare/axis-atlas-vs-hsbc-travelone`
  - `/compare/amex-platinum-travel-vs-axis-atlas`
- SBI Cashback page should link to:
  - `/compare/sbi-cashback-vs-hdfc-millennia`
  - `/compare/sbi-cashback-vs-hdfc-swiggy`
  - `/compare/icici-amazon-pay-vs-sbi-cashback`

*Guidelines:*
- Use only comparisons that actually exist.

### 5. Improve metadata quality
Review all SEO guide and comparison pages. Ensure every page has:
- Unique title
- Unique meta description
- Canonical URL
- Open Graph title
- Open Graph description
- Robots index/follow

*Guidelines:*
- Avoid repetitive or duplicate titles/descriptions.
- Fix awkward duplicated wording like:
  - HSBC Bank HSBC Premier
  - HDFC Bank HDFC...
  - SBI Card SBI...
- Create a helper to generate cleaner display names where issuer and card name overlap.

### 6. Add breadcrumbs
Add breadcrumb navigation to:
- Card detail pages
- SEO guide pages
- Comparison pages

*Examples:*
- `Home > Guides > Best Cashback Credit Cards in India`
- `Home > Compare > Axis Atlas vs HDFC Regalia Gold`

*Guidelines:*
- Keep styling consistent with the current design.

### 7. Add structured data where appropriate
Add JSON-LD structured data:
- `BreadcrumbList` for guide, card and comparison pages
- `FAQPage` for pages with FAQ sections
- `ItemList` for ranked guide pages

*Guidelines:*
- Do not add fake ratings, fake reviews, or fake aggregate ratings.

### 8. Improve comparison pages
For each comparison page, make the verdict more specific and useful. Each comparison should clearly answer:
- Which card is better for cashback?
- Which card is better for travel?
- Which card is better for lounge access?
- Which card is better for low fees?
- Which card is better for beginners?
- Which card has the biggest limitations?

*Guidelines:*
- Do not make unsupported claims. Use available card data.

### 9. Improve sitemap
Ensure sitemap includes:
- All guide pages
- All comparison pages
- All card pages
- Main pages

*Guidelines:*
- Use only canonical `https://www.simplifycards.in` URLs.

### 10. Quality checks
After implementation, verify:
- Build passes
- TypeScript passes
- No `noindex` on SEO pages
- No broken internal links
- No duplicate canonical URLs
- No duplicate metadata
- Sitemap still loads
- Robots.txt still points to sitemap
- Important pages are linked from homepage/footer or relevant internal pages

*Do not change:*
- Design/theme
- Card data model
- Affiliate/apply links
- Existing page routes
- Existing core user flows

## Post-Implementation Report Requirements
Upon completion, the following details should be reported:
1. Files changed
2. Ranking logic added/changed
3. New internal links added
4. Metadata improvements made
5. Structured data added
6. Sitemap changes
7. Any missing data fallbacks used
