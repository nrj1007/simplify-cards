# Business Context

Last updated: 2026-05-09

## Founder Context

The product is being built by a software engineer in India for Indian users.

The founder wants a lean, low-operating-cost credit-card product that can start with a small structured dataset and grow into an AI-assisted recommendation and discovery platform.

## Product Idea

Build an Indian credit-card intelligence product:

```text
verified card data
  -> deterministic recommendation engine
  -> AI assistant / Q&A interface
  -> SEO pages and card comparisons
  -> ads + affiliate monetization
```

The product should help users answer questions like:

- Which card is best for my spending pattern?
- Which card gives the best cashback for online shopping?
- Which card is best for UPI/RuPay spends?
- Which card has lounge access under a certain fee?
- Compare two Indian credit cards.
- What changed in a card's rewards, fees, lounge access, or exclusions?

## Core Requirements

1. The founder will provide or approve the initial credit-card database.
2. The app should scrape official card pages for new info or updates.
3. The app should update local card data after review/validation.
4. The UI should let users ask questions related to credit cards.
5. The product should serve Indian credit-card users.
6. The MVP should be cheap to operate.
7. Each added card should be committed separately and pushed to GitHub.

## Important Product Principle

The AI should not be the source of truth.

Preferred flow:

```text
official card source
  -> structured card JSON
  -> deterministic filtering/scoring
  -> AI explanation layer
  -> answer with caveats and source URL
```

The AI can:

- understand natural-language questions
- extract user intent and spending categories
- explain recommendations
- summarize card caveats
- compare cards

The AI should not:

- invent card terms
- answer without grounding in verified card JSON
- overwrite card data automatically without review

## MVP Architecture Decision

Chosen MVP architecture:

```text
Next.js only
issuer card JSON files loaded in memory
no database
no vector DB
no separate backend
```

Rationale:

- Only around 100 credit cards are expected initially.
- JSON data is enough for a lean MVP.
- In-memory lookup is fast and cheap.
- Git history can track card-data changes.
- No database keeps monthly cost low.
- Next.js gives UI, SEO pages, and API routes in one app.

Potential future architecture:

```text
Next.js frontend
Python scraper/review worker
Postgres only when needed
admin dashboard
AI answer API
analytics/click tracking
```

## Cost Strategy

Goal: keep monthly operating cost low enough that display ads can cover baseline spend.

Lean target:

```text
Rs 1,000 - Rs 5,000/month during early MVP
Rs 5,000 - Rs 15,000/month during early production
```

Cost controls:

- no database initially
- no vector DB initially
- no paid scraper infrastructure initially
- use local JSON
- use small AI models only after deterministic ranking
- avoid AI web search for routine scraping
- avoid paid ads until organic traffic proves conversion

## Monetization Plan

Primary strategy:

```text
ads cover baseline operating cost
affiliate commissions become profit
```

Revenue streams:

1. Display ads
   - Useful for covering hosting and AI usage.
   - Works best on SEO/content/card-detail pages.
   - Should not distract from apply CTAs.

2. Affiliate commissions
   - Primary profit engine.
   - Earn from approved card applications or qualified leads.
   - Needs high-intent traffic and trust.

3. Sponsored placements, later
   - Must be clearly disclosed.
   - Should not corrupt recommendation quality.

4. Premium tools, later
   - Possible paid recommendation calculator, alerts, or portfolio optimizer.

5. B2B/API, later
   - Card data API, comparison widgets, fintech tools, or market insights.

## Profitability Thinking

The product is not profitable at every scale.

With in-memory JSON and self-built engineering, it can become profitable at very small scale if traffic is high-intent, because the break-even cost is low.

Example:

```text
Monthly cost: Rs 3,000
Payout/card: Rs 1,000
Break-even: 3 approved cards/month
```

But profitability still depends on:

- organic high-intent traffic
- affiliate approval/conversion
- accurate data
- trust
- good recommendation UX
- not overspending on ads, infra, or AI

## Ads Plan

Ads should be used for:

- informational pages
- card detail pages
- comparison pages
- low-intent Q&A pages

Avoid intrusive ads:

- inside answer boxes
- near apply buttons
- in places that reduce affiliate conversion

Ad strategy:

```text
ads = oxygen
affiliate = profit
```

## SEO Plan

Important SEO pages:

- best cashback credit cards in India
- best lifetime free credit cards
- best RuPay credit cards for UPI
- best credit cards for lounge access
- best fuel credit cards
- best credit cards for online shopping
- SBI Cashback vs HDFC Millennia
- Axis Atlas vs HDFC Regalia Gold
- Tata Neu Plus vs Tata Neu Infinity
- HDFC Diners Black vs Regalia Gold

SEO page shape:

```text
intro
ranking table
calculator/assumptions
card-by-card explanation
fees/caps/exclusions
apply links
source URLs
last verified date
disclaimer
```

## Competitor Notes

TechnoFino appears to monetize through:

- paid consulting packages
- display ads
- premium membership
- affiliate links
- sponsored/brand partnerships
- B2B services for banks/fintechs
- community traffic

Card Maven appears to monetize mainly through:

- affiliate links
- apply-now link hub
- card finder/comparison traffic
- forum/community traffic
- possible display ads

Takeaway:

```text
own high-intent credit-card audience
monetize with affiliate + ads + trust products
```

## Compliance And Trust Notes

India-specific caution:

- Credit-card recommendations can become sensitive financial guidance.
- RBI and issuer rules matter.
- Avoid presenting as a lender, bank, or credit bureau.
- Avoid guaranteeing approval.
- Avoid misleading reward calculations.
- Always cite source URLs and last verified dates.
- Include affiliate disclosure.
- Include disclaimer that final terms are subject to issuer policies.

Recommended disclaimer direction:

```text
We may earn commission from some links. Recommendations are based on available card data and user inputs. Final approval, fees, rewards, and benefits are subject to the issuer's latest terms.
```

## Data Strategy

Initial data approach:

- manually ingest 30-50 high-value Indian cards
- use official issuer pages as sources
- store canonical source URLs
- keep one card per commit
- avoid scraping every bank at once

Data fields to capture:

- issuer
- card name
- network
- joining fee
- annual fee
- renewal waiver
- reward type
- category reward rates
- monthly/quarterly caps
- lounge access
- forex markup
- exclusions
- welcome benefits
- milestone benefits
- redemption values
- eligibility
- source URL
- apply URL
- last verified date

## Scraping Strategy

Current approach:

- manual URL-by-URL ingestion using official HDFC pages
- direct fetch when possible
- official indexed content or official subpages when direct fetch is blocked

Future approach:

```text
official pages
  -> scraper extracts fields
  -> change detector compares old/new
  -> review queue
  -> approved update to issuer card JSON or database
```

Do not auto-overwrite live data without review.

## Product Roadmap

Phase 1: Data MVP

- Add 30-50 verified Indian cards.
- Improve card detail pages.
- Show source URL and last verified date.
- Keep one card per commit.

Phase 2: Recommendation Engine

- Add user spend input form.
- Calculate estimated annual rewards.
- Subtract annual fee.
- Account for fee waiver thresholds.
- Respect caps and exclusions.
- Rank by net annual value and user fit.

Phase 3: AI Assistant

- Add OpenAI-backed `/api/ask`.
- Parse user intent and spend.
- Retrieve relevant cards from per-card JSON files (one file per card under `data/cards/<issuer>/`).
- Use deterministic ranking.
- Let AI explain recommendations.
- Include caveats and source dates.

Phase 4: Monetization

- Add affiliate tracking fields.
- Track apply clicks.
- Add ad slots to content/detail pages.
- Add disclosure language.
- Add analytics.

Phase 5: SEO

- Generate best-card pages.
- Generate comparison pages.
- Add canonical metadata.
- Add structured FAQ sections.

Phase 6: Data Ops

- Add scraper scripts.
- Add change logs.
- Add admin/review workflow.
- Consider Postgres only when edits, users, analytics, or review queues require it.

## Immediate Backlog

Continue processing queued HDFC URLs from `PROJECT_CONTEXT.md`, one card per commit.

After HDFC batch:

- Add SBI Cashback
- Add Axis Ace
- Add Axis Atlas updated official data
- Add ICICI Amazon Pay
- Add HSBC Live+
- Add AU ixigo
- Add IDFC FIRST cards

Then improve:

- card schema
- reward calculator
- UI for spends
- SEO pages
- affiliate click tracking
