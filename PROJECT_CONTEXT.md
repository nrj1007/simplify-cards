# Project Context

Last updated: 2026-05-28

## Project

Repository: https://github.com/nrj1007/creditCardAI

Journal repository for saved notes: https://github.com/nrj1007/journal

Local workspace:

```text
C:\Users\manpr\Documents\Codex\2026-05-08\i-want-to-build-an-ai
```

The app is a lean Next.js-only MVP for an Indian credit-card discovery and Q&A product.

## Current Architecture

- Next.js App Router
- No database
- Credit card data stored in issuer files under `data/cards/`
- Data loaded in memory
- GPT-only AI stack for Q&A
- No web search in the user-facing Ask AI flow
- Current data checkpoint: 209 cards across 17 issuer files.
- Each card has a `popularityScore` from 0 to 100 for popularity-first sorting and future ranking features.
- Deterministic recommendation logic in `lib/recommend.ts`
- Vitest test suite covers card data loading, helper lookups, and recommendation filters.
- Basic API routes:
  - `POST /api/ask`
  - `GET /api/cards`
- Card detail pages generated from merged in-memory card data
- Finder and compare pages included

## Local Tooling

Global Node/npm were not available, so portable tools were installed locally and ignored by Git:

```text
tools/node
tools/git
```

Use:

```powershell
cd "C:\Users\manpr\Documents\Codex\2026-05-08\i-want-to-build-an-ai"
.\tools\node\npm.cmd install
.\scripts\dev.ps1
```

Important:

- `scripts/dev.ps1` currently runs plain `next dev`
- on this Windows ARM machine, a clean `next dev` now resolves to Turbopack and fails because Turbopack native bindings are unavailable
- for a reliable local start, use:

```powershell
.\tools\node\npm.cmd run dev -- --webpack
```

Type check:

```powershell
.\tools\node\node.exe .\node_modules\typescript\bin\tsc --noEmit
```

Dev server note for this machine:

```powershell
.\tools\node\npm.cmd run dev -- --webpack
```

Reason:

- this machine is Windows ARM
- Next.js 16 default Turbopack path does not work here because native bindings are unavailable for this setup
- Webpack works fine
- Next also needs permission to write its SWC cache under `%LOCALAPPDATA%\next-swc`
- if routes start flipping between `200`, `404`, and `500` with errors like missing `.next\dev\server\app\...\page.js` or missing `.next\dev\server\vendor-chunks\lucide-react.js`, the dev build is corrupted; stop the server, delete `.next`, and restart with Webpack

Tests:

```powershell
.\tools\node\npm.cmd test
```

Update card popularity scores:

```powershell
.\tools\node\node.exe .\scripts\update-popularity-scores.js
```

Git:

```powershell
.\tools\git\cmd\git.exe status --short
```

## Commit Workflow

For each card URL:

1. Read/scrape official issuer page.
2. Add or update one card in the issuer file under `data/cards/`.
3. Update schema/app code only if required.
4. Run TypeScript check.
5. Commit one card per commit.
6. Push to `main`.

Commit message format:

```text
Add <issuer> <card name> card data
```

or:

```text
Update <issuer> <card name> card data
```

## Already Added HDFC Cards

- HDFC Millennia
- IndianOil HDFC Bank
- HDFC PIXEL Play
- HDFC Diners Club Black Metal Edition
- HDFC MoneyBack+
- HDFC Freedom
- Tata Neu Plus HDFC Bank
- PhonePe HDFC Bank Ultimo
- PhonePe HDFC Bank Uno
- Marriott Bonvoy HDFC Bank

## Important Data Notes

- HDFC pages sometimes block direct scraping with 403. When direct fetch fails, use official HDFC indexed content or official HDFC subpages and mark confidence accordingly in the chat summary.
- Store clean canonical URLs without tracking query params in `sourceUrl` and `applyUrl`.
- Do not invent values. If HDFC sources conflict, use conservative values and mention the conflict.
- `loungeDomestic` and `loungeInternational` support either a number or `"unlimited"`.
- `popularityScore` is a v1 heuristic, not measured traffic. It combines curated scores for well-known cards, issuer/category demand, fees, lounge access, and niche-card penalties. Refine it later with actual search volume, page views, outbound clicks, affiliate conversions, or community mention counts.
- User-facing AI answers should not use live web search. If a question cannot be answered confidently from the current in-memory dataset, log the question for manual database enrichment instead.
- Build card records for answerability, not just ranking. The dataset should aim to capture almost all important user-facing card facts so Ask AI can answer most real questions directly from stored data.
- Prefer saving detailed product facts whenever they are available from reviewed sources, including fee rules, fee waiver thresholds, reward rates, reward caps, lounge counts, lounge conditions, forex markup, exclusions, milestone benefits, redemption values and fees, transfer partners, eligibility, insurance, travel benefits, category caveats, and known usage conditions.
- When a new user question exposes a missing fact pattern, treat that as a signal to expand the data model or card records so similar questions can be answered in the future.
- Save most reviewed product facts even when they are too verbose for the UI. Show only the most important buyer-facing details on the card details page; keep lower-level program rules, caveats, transfer timing notes, and operational nuances in internal fields so Ask AI can still answer specific questions from them.
- During manual card-by-card review, use that review pass to normalize ranking-critical rule data too, especially:
  - exclusions
  - capped-but-rewarded categories
  - special spend categories like rent, insurance, education, gold/jewellery, telecom, utilities, tax/government, wallet loads, and real-estate/property-management
- Treat manual review as the moment to convert issuer wording into internal structured constants/rules, so ranking and Q&A reliability improve as the dataset is reviewed card by card.
- Exclusion-model rule:
  - keep issuer wording in `exclusions` for auditability and user-facing detail
  - progressively map reviewed cards into canonical `exclusionCodes` constants
  - ranking and retrieval should prefer structured constants when present
  - if a card is not yet mapped, safely fall back to textual exclusions instead of dropping the rule entirely

## Working Convention

- When the user says `save notes`, treat that as a request to save the handoff/journal notes into the separate journal repository: `https://github.com/nrj1007/journal`
- If that repo is not available in the current workspace/session, note the limitation explicitly and save locally only as a fallback
- The durable project journal now lives in the journal repository under `projects/creditCardAI/agent-journal/`

## Latest Session Note

- Added TechnoFino signal review and ingestion support for `data/card-content.json`.
- User explicitly confirmed that scraper-derived content must be **manually reviewed before anything goes into the database**.
- If the separate journal repo is unavailable in-session, save fallback notes locally under `docs/agent-journal/`.
- The TechnoFino scraper has since been redesigned to prioritize recently created threads, filter old-thread comment drift, and show richer discussion context in review items.
- Local website sanity check passed on `http://127.0.0.1:3000`.
- Ask/recommendation scoring has since been upgraded significantly:
  - smarter fee-cap handling
  - relationship-card penalties for broad generic asks
  - scenario guidance by card tier
  - milestone scoring
  - intent-aware lounge and forex boosts
  - partial/full routed-spend assumptions for online, travel, and grocery
  - explicit Accor redemption value support
- `HSBC TravelOne` now stores `accorValue: 2.2` in the redemption model.
- `HSBC TravelOne` has since been expanded much further:
  - Travel with Points flights / hotels / car rentals earn rows and caps
  - Best Price Guarantee
  - airline and hotel transfer partner tables with ratios and TATs
  - user-verified review note
  - `joiningBenefits` split from ongoing benefits
  - `internalNotes` used to keep lower-level programme mechanics out of the public details page while preserving answerability
- `HDFC Diners Club Privilege` was updated from the official HDFC product-change PDF, and the change was also saved as a dated card-page update entry.
- Diners Privilege was then further cleaned up from HDFC product-page / MITC review:
  - issuer-style reward display labels were preserved
  - exclusions were replaced with explicit bullets
  - boilerplate details were reduced
  - `Additional Benefits` and `Additional Details` are now separate concepts in the data model and UI
- Lounge counts across Ask, compare, and card pages now have an info button that explains lounge-access conditions from stored card data.
- Broad no-spend recommendation ranking now considers the maximum milestone-plus-fee-waiver upside across parsed thresholds, instead of only the currently simulated spend level.

## Recent YES BANK Work

- Added core YES BANK cards: MARQUEE, RESERV, YES First Preferred, ELITE+, SELECT, ACE
- Added YES BANK co-branded / partner cards with mixed issuer-partner sourcing:
  - Kiwi
  - PaisaSave
  - PaisaSave RuPay
  - POP-CLUB
  - ANQ Phi
  - Klick RuPay
- Kept Rio, Uni, FREO, ANQ Pi, and FinBooster variants pending for later verification where current product docs or reward details are still fuzzy

## Recent Kotak Work

- Added first Kotak Mahindra Bank batch:
  - IndianOil Kotak
  - Kotak Cashback+
  - Kotak UPI RuPay
  - League Platinum
  - Zen Signature
  - White
  - PVR INOX Kotak
  - Kotak 811
  - 811 Dream Different
  - PVR Kotak Platinum
- Added premium-tail Kotak cards:
  - White Reserve
  - PVR Kotak Gold
- Deferred Air+ and business cards for later
- Marked IndiGo Kotak legacy/discontinued pages as skip-unless-requested for now

## Recent RBL Work

- Added first RBL Bank batch:
  - ShopRite
  - Cookies
  - PLAY
  - World Safari
  - Platinum Delight
  - Platinum Maxima Plus
  - Icon
  - World Max
  - Patanjali Swarn
  - Patanjali Vishisht
- Deferred IRCTC, Popcorn, SaveMax, MyCard family, and Bajaj Finserv SuperCard variants for later verification

## Recent IndusInd Work

- Added first IndusInd Bank batch:
  - Platinum RuPay
  - Legend
  - EazyDiner
  - EazyDiner Platinum
  - Pinnacle
  - Nexxt
  - Tiger
  - Platinum Aura Edge
  - Celesta
  - Indulge
- Added premium-tail IndusInd cards:
  - PIONEER Heritage Metal
  - PIONEER Legacy
  - Crest
- Deferred Samman, Solitaire, and mixed/legacy product tails for later verification

## Recent Equitas and Federal Work

- Added Equitas Small Finance Bank cards:
  - Ultima
  - Tiger
  - Premio
- Expanded Federal Bank coverage beyond Scapia:
  - Signet
  - Imperio
  - Celesta
  - Wave RuPay
- Left Federal Bank OneCard-style partner variants for later verification

## Recent Standard Chartered Work

- Added first Standard Chartered India batch:
  - Rewards
  - Smart
  - Ultimate
  - EaseMyTrip
  - Platinum Rewards
  - Super Value Titanium
  - Manhattan Platinum
  - DigiSmart
  - Priority Visa Infinite
  - Beyond
- Left Emirates World and any instant/pre-approved-only tails for later verification

## Recent Premium-Tail Cleanup

- Added ICICI premium and variant cards:
  - Times Black
  - Coral RuPay
  - Sapphiro RuPay
  - HPCL Coral
- Added another premium-tail batch:
  - IndusInd Crest
  - PIONEER Legacy
  - Kotak Solitaire
  - Kotak Infinite
  - RBL World Prime
- Added a generic multi-bank OneCard entry under a separate issuer file:
  - One Credit Card
- Current OneCard handling uses a single official mixed-source product entry for partner-bank issuance, with issuer-specific variants left for later only if product differences become material

## Recent Ask / Ranking Notes

- For broad Ask queries like `top cards under 5000`, keep a strict distinction between:
  - raw scorer order from `scoreCards(...)`
  - spend-scenario winners used for additional guidance
- Product rule:
  - `Top 3 picks` must always show the actual top 3 ranked cards
  - spend-scenario winners should be shown only in a separate section such as `How This Changes by Spend`
  - do not silently mix scenario winners into the ranked top-3 block
- Ranking logic was tightened so:
  - excluded categories do not contribute to annual rewards before ranking adjustment
  - broad no-spend milestone/fee-waiver upside is considered at reduced weight, not full force
- `Axis Bank Atlas Credit Card` correction:
  - `feeWaiverSpend` was incorrectly set to `15L`
  - Atlas currently has milestone thresholds at `3L`, `7.5L`, and `15L`, but no stored annual-fee waiver

## Recommended Next Build Step

The dataset now covers 207 cards across 17 issuer files, which is enough to shift focus from issuer expansion to product infrastructure.

Recommended next sequence:

1. Build reverse indexes for issuer, tags, network, reward category, and popularity.
2. Build deterministic retrieval helpers on top of those indexes.
3. Ground `Ask AI` answers in retrieved card records plus source links, with no web search fallback.
4. Log unsupported or stale questions for manual database updates by the user.
5. Add affiliate-link fields and ad-slot plumbing after retrieval is in place.

## Queued HDFC URLs

These were provided by the user and still need to be processed, one card per commit:

```text
https://www.hdfc.bank.in/credit-cards/irctc-credit-card
https://www.hdfc.bank.in/credit-cards/diners-privilege-credit-card
https://www.hdfc.bank.in/credit-cards/tata-neu-infinity-hdfc-bank-credit-card
https://www.hdfc.bank.in/credit-cards/shoppers-stop-black-credit-card
https://www.hdfc.bank.in/credit-cards/shoppers-stop-credit-card
https://www.hdfc.bank.in/credit-cards/regalia-gold-credit-card
https://www.hdfc.bank.in/credit-cards/pixel-go-credit-card
```

## Resume Instruction

When continuing, first read this file, then run:

```powershell
.\tools\git\cmd\git.exe status --short
.\tools\git\cmd\git.exe log --oneline -5
```

Continue with the queued URLs in order, committing and pushing after each card.

## 2026-05-28 Late Addendum

- Ask result cleanup:
  - the `Alternatives` section on the Ask page should stay short
  - show at most `2` alternatives
  - never repeat cards that are already present in the main ranked answer
  - also avoid repeating cards already shown as linked alternatives
- Ranking policy changes made in `lib/recommend.ts`:
  - removed the generic relationship-only penalty from ranking
  - `Axis Bank Atlas Credit Card` should be hidden from broad generic ranking queries unless the user explicitly asks for Atlas, because applications are closed
- `American Express Platinum Travel Credit Card` ranking model was upgraded:
  - `Membership Rewards` fallback valuation was raised from `0.3` to `0.6`
  - added a milestone-specialist boost for broad no-spend ranking queries
  - especially for milestone-led cards whose strongest payoff clusters around `~7L` yearly spend
  - Taj-linked milestone value should be surfaced more intelligently in broad ranking
- Current notable ranking observations:
  - `HSBC Premier` is excluded from `under 5000` ranking because of its stored fee structure, and is still relatively low on broad generic top-card queries because the high annual fee drags down net value
  - `Axis Bank Magnus Credit Card for Burgundy` is excluded from `under 5000` ranking and still ranks very low on generic top-card queries because its stored annual fee and current generic reward valuation swamp its upside
- Product TODO added:
  - build a full credit-card recommender and calculator based on user-specific spend, milestones, fee waivers, and redemption preferences
