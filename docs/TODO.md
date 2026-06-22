# TODO

## Axis Card Ingestion

Continue adding active Axis cards from official Axis pages. Keep the current workflow:

1. Verify card status and details from official Axis source.
2. Add one card entry to the relevant issuer file under `data/cards/`.
3. Run validation and TypeScript checks.
4. Commit and push that card separately.

Validation commands:

```powershell
.\tools\node\node.exe .\.tmp\validate-cards.js
.\tools\node\node.exe .\node_modules\typescript\bin\tsc --noEmit
```

### Pending Active Axis Cards

- [ ] Axis Bank Pride Platinum Credit Card
- [ ] Axis Bank Pride Signature Credit Card
- [ ] Axis Bank Shoppers Stop Credit Card
- [ ] Axis Bank Signature Credit Card with Lifestyle Benefits
- [ ] SpiceJet Axis Bank Voyage Black Credit Card
- [ ] SpiceJet Axis Bank Voyage Credit Card
- [ ] Titanium Smart Traveler Credit Card
- [ ] Axis Bank MY Zone Easy Credit Card

### Skip Unless Legacy Coverage Is Requested

These are listed or have official pages, but should not be added as active-new-application cards unless the user explicitly asks for legacy/existing-cardholder coverage.

- Samsung Axis Bank Infinite Credit Card: official Axis page says applications are not currently accepted and directs users to Samsung Axis Bank Signature Credit Card instead.
- AXIS BANK VISTARA Credit Card
- AXIS BANK VISTARA SIGNATURE Credit Card
- Axis Bank Vistara Infinite Credit Card

## Product Work After Axis

- [ ] Verify recommender/scoring penalties (fit, missing, exclusion, etc.) and tune their relative weights.
- [ ] Evaluate if we still need the milestone delta boost (`comparisonMilestoneAndWaiverDelta`) or if it can be retired as envelope scoring is expanded.
- [ ] Add views count metrics/display on the landing page.
- [ ] Add a Contact Us page.
- [ ] Create latest news page showing recent card updates, devaluations, new launches, and lounge/benefit changes.
- [ ] Improve card detail UI for fees, caps, exclusions, and source trust.
- [ ] Add filters for issuer, cashback, travel, lounge, fuel, UPI, low-fee, and secured cards.
- [ ] Add a GPT-only Ask AI flow over the merged in-memory card data from `data/cards/`, with retrieval first and no live web search.
- [ ] Add conversation context/history to the Ask AI follow-up flow (e.g., passing previous query/result details) to support contextual follow-up questions.
- [ ] Suggest follow-up questions on the Ask page based on the user's previous query to help guide their card discovery.
- [ ] Log unsupported or stale user questions for manual database enrichment instead of answering via web search.
- [ ] Expand stored card facts toward maximum answerability, so Ask AI can answer most user questions from reviewed card data instead of only handling rankings and broad comparisons.
- [ ] Improve generic ranking quality for broad asks like `top cards under 5000`, so results reflect stronger user intent and practical fit instead of only raw modeled value.
- [ ] Add redemption preference controls to the recommender/calculator and expose milestone and fee-waiver impact more explicitly in the UI.
- [ ] Add an internal Ask feedback review page that groups the most-downvoted queries and common losing card combinations, so ranking fixes can be prioritized from real user feedback.
- [ ] Send a Telegram alert for `No` / downvote feedback as a temporary ops workflow before we scale and move feedback review into a database-backed system.
- [ ] Add Cuelinks affiliate integration, including per-card tracking support, redirect/link handling, and fallback behavior when a card does not have an affiliate link.
- [ ] Improve SEO with stronger metadata, structured data, internal linking, indexable landing pages, and content tuned for card/use-case search intent.
- [ ] Verify SEO landing and comparison pages for crawlable initial HTML, unique metadata/canonicals, sitemap coverage, distinct non-duplicative content, tie-aware verdicts, reward-cap visibility, and page-specific FAQs.
- [ ] Add a manual approval workflow for community/news signals before updating card data.
- [ ] Add card images to key user-facing surfaces such as finder, compare, Ask results, and details pages.
- [ ] Find an AI to generate credit card images.
- [ ] Add reward calculator test cases for each card as cards are audited or updated, so reward logic stays covered card-by-card instead of only through broad shared scenarios.
- [ ] Verify the reward calculator golden test snapshot (`tests/calculator-golden.test.ts`) to ensure calculations match expected card earnings.
- [ ] Verify the ranking golden test snapshot (`tests/ranking-golden.test.ts`) to ensure card ordering is correct for each of the following scenarios:
  - [ ] "broad-generic" (query: "best credit card")
  - [ ] "exact-card-atlas" (query: "axis atlas")
  - [ ] "usecase-dining" (query: "best dining card")
  - [ ] "usecase-grocery" (query: "best grocery card")
  - [ ] "usecase-online" (query: "best online shopping card")
  - [ ] "usecase-entertainment" (query: "best card for movies")
  - [ ] "usecase-fuel" (query: "best card for fuel")
  - [ ] "usecase-travel" (query: "best travel card")
  - [ ] "usecase-cashback" (query: "best cashback card")
  - [x] "usecase-upi" (query: "best upi card")
  - [ ] "merchant-amazon" (query: "best amazon card")
  - [ ] "merchant-flipkart" (query: "best flipkart card")
  - [ ] "merchant-swiggy" (query: "best swiggy card")
  - [ ] "category-rent" (query: "best rent card")
  - [ ] "category-rent-payment" (query: "best card for rent payment")
  - [ ] "category-utilities" (query: "best utility card")
  - [ ] "category-utility-bills" (query: "best card for utility bills")
  - [ ] "category-bill-payments" (query: "best card for bill payments")
  - [ ] "category-education-payments" (query: "best card for education payments")
  - [ ] "issuer-hdfc" (query: "best hdfc card")
  - [ ] "issuer-sbi" (query: "best sbi card")
  - [ ] "issuer-axis" (query: "best axis card")
  - [ ] "issuer-icici" (query: "best icici card")
  - [ ] "issuer-amex" (query: "best amex card")
  - [ ] "segment-beginner" (query: "best beginner card")
  - [ ] "segment-mid-premium" (query: "best mid premium card")
  - [ ] "segment-premium" (query: "best premium card")
  - [ ] "segment-super-premium" (query: "best super premium card")
  - [ ] "network-rupay" (query: "best rupay card")
  - [ ] "network-visa" (query: "best visa card")
  - [ ] "network-mastercard" (query: "best mastercard credit card")
  - [ ] "forex" (query: "best forex card")
  - [ ] "lounge" (wantsLounge: true)
  - [ ] "lounge-query" (query: "best lounge card")
  - [ ] "intl-lounge-query" (query: "best international lounge card")
  - [ ] "lifetime-free" (wantsLifetimeFree: true)
  - [ ] "max-fee-zero" (maxAnnualFee: 0)
  - [ ] "max-fee-5000-query" (query: "best card under 5000")
  - [ ] "combo-premium-travel" (query: "best premium travel card")
  - [ ] "combo-dining-under-5000" (query: "best dining card under 5000")
  - [ ] "spend-international" (query: "best card for international spends")
  - [ ] "spend-fuel-heavy" (heavy fuel spend profile)
  - [ ] "spend-travel-heavy" (heavy travel spend profile)
  - [ ] "spend-high-base" (high base spend profile)
  - [ ] "spend-level-light" (balanced light spend profile)
  - [ ] "spend-level-mid" (balanced mid spend profile)
  - [ ] "spend-level-heavy" (balanced heavy spend profile)
- [ ] Integrate ads and restore hidden ad slots in homepage, finder, and card detail sidebar (commented out 2026-05-30, search for "restore when ads integrated").
- [ ] Improve RPM through higher-intent content, ad placement strategy, and better page-level monetization.
- [ ] Add affiliate link support per card, including tracking metadata and fallback apply URLs.
- [ ] Add reverse indexes for fast lookup by issuer, tags, network, reward category, and popularity.
- [ ] Add a 'usp' field to the card schema and pre-compute it for all cards, rather than calculating it at runtime.
- [ ] Improve the standalone reward calculator page (/calculator) with interactive spend breakdown and better card comparison controls.
- [ ] Improve the cards listing page (/finder) to support comprehensive listing of all indexed cards with paginated views, search, and sorting options.

## ICICI Bank Card Ingestion

Top ICICI cards added: Amazon Pay ICICI Bank Credit Card, Emeralde Private Metal, Emeralde, Sapphiro, Rubyx, Coral, Platinum Chip, MakeMyTrip, HPCL Super Saver, Adani One Signature, and Adani One Platinum.

### Remaining ICICI Cards To Verify Later

- [x] MakeMyTrip ICICI Bank Signature Credit Card: Verified as discontinued/no longer accepted for new applications.
- [x] MakeMyTrip ICICI Bank Platinum Credit Card: Verified as discontinued/no longer accepted for new applications.
- [x] Manchester United Platinum Credit Card: Verified as discontinued (ICICI Bank initiated closure in June 2026).
- [x] Manchester United Signature Credit Card: Verified as discontinued (ICICI Bank initiated closure in June 2026).
- [ ] Accelero Credit Card
- [ ] Mine Credit Card
- [ ] Expressions Credit Card
- [ ] Instant Platinum / Gold / FD-backed ICICI cards
- [ ] Business, corporate, invite-only, and discontinued ICICI variants

## Bank of Baroda Card Ingestion

High-priority consumer Bank of Baroda / BOBCARD entries added from official Bank of Baroda pages: ETERNA, PREMIER, SELECT, EASY, HPCL ENERGIE, IRCTC BOBCARD, and Snapdeal BOBCARD.

### Remaining Bank of Baroda Cards To Verify Later

- [ ] BOBCARD TIARA
- [ ] BOBCARD PRIME
- [ ] BOBCARD CORPORATE
- [ ] BOBCARD EMPOWER
- [ ] Nainital RENAISSANCE BOBCARD
- [ ] ICAI Exclusive BOBCARD
- [ ] ICAI Select BOBCARD
- [ ] ICSI Diamond BOBCARD
- [ ] CMA One BOBCARD
- [ ] Indian Army Yoddha BOBCARD
- [ ] Indian Navy Varunah BOBCARD
- [ ] ICG Rakshamah BOBCARD
- [ ] Assam Rifles The Sentinel BOBCARD
- [ ] BoB Vikram Card
- [ ] FD-backed secure variants: EASY Secure, SELECT Secure, PREMIER Secure, ETERNA Secure

## Yes Bank Card Ingestion

High-priority YES BANK cards added from official YES BANK and partner sources: MARQUEE, RESERV, YES First Preferred, ELITE+, SELECT, ACE, Kiwi, PaisaSave, PaisaSave RuPay, POP-CLUB, ANQ Phi, and Klick RuPay.

### Remaining YES BANK Cards To Verify Later

- [ ] YES BANK Uni Credit Card
- [ ] YES BANK Uni RuPay Credit Card
- [ ] YES BANK FREO Credit Card
- [ ] YES BANK FREO RuPay Credit Card
- [ ] YES BANK Rio Credit Card
- [ ] YES BANK Rio virtual variant, if it should be modeled separately from the standard Rio entry
- [ ] YES BANK ANQ Pi Credit Card
- [ ] FinBooster Credit Card
- [ ] FinBooster RuPay Credit Card
- [ ] YES Prosperity Cashback Plus Credit Card
- [ ] YES Prosperity Cashback Credit Card
- [ ] YES Prosperity Rewards Credit Card
- [ ] Re-verify Rio fee structure because current YES docs show conflicting annual-fee treatment across different PDF sets
- [ ] Keep invite-only, discontinued, legacy-only, and business-only variants separate unless requested

## Kotak Mahindra Bank Card Ingestion

Top Kotak cards added from official Kotak pages and official Kotak terms: IndianOil Kotak, Kotak Cashback+, Kotak UPI RuPay, League Platinum, Zen Signature, White, PVR INOX Kotak, Kotak 811, 811 Dream Different, and PVR Kotak Platinum.

### Remaining Kotak Cards To Verify Later

- [ ] Kotak Air+ Credit Card
- [ ] Solitaire Business Credit Card
- [ ] Kotak Biz Edge Credit Card
- [ ] Kotak Purchase Credit Card

### Skip Unless Legacy Coverage Is Requested

- [ ] IndiGo Kotak Credit Card: official Kotak page currently labels it discontinued
- [ ] IndiGo Kotak XL Credit Card and older 6E Rewards naming overlap should be verified before adding

## RBL Bank Card Ingestion

Top RBL cards added from official RBL pages: ShopRite, Cookies, PLAY, World Safari, Platinum Delight, Platinum Maxima Plus, Icon, World Max, Patanjali Swarn, and Patanjali Vishisht.

### Remaining RBL Cards To Verify Later

- [ ] BookMyShow Play Credit Card naming overlap against current RBL PLAY page should be verified before adding as a separate entry
- [ ] RBL Bank IRCTC Credit Card
- [ ] RBL Bank Popcorn Credit Card
- [ ] RBL Bank SaveMax Credit Card
- [ ] RBL Bank MyCard and MyCard Plus, if still actively open for new applications
- [ ] Bajaj Finserv RBL Bank SuperCard variants, if we decide to add card-family / fintech-partner coverage beyond the current mainstream batch

## IndusInd Bank Card Ingestion

Top IndusInd cards added from official IndusInd pages and current benefit/MITC materials: Platinum RuPay, Legend, EazyDiner, EazyDiner Platinum, Pinnacle, Nexxt, Tiger, Platinum Aura Edge, Celesta, and Indulge.

### Remaining IndusInd Cards To Verify Later

- [ ] Samman RuPay Credit Card
- [ ] Solitaire Credit Card
- [ ] Duo Card, only if we decide mixed debit-credit products belong in scope
- [ ] Older Signature / Iconia / Platinum Visa family pages appear to exist for legacy cardholders and should be kept out unless legacy coverage is requested

## Equitas Card Ingestion

Active Equitas Small Finance Bank consumer cards added from official Equitas card surfaces: Ultima, Tiger, and Premio.

- [ ] Re-verify current Equitas fee and benefit docs from official MITC/KFS sources when better public PDFs are surfaced
- [ ] Add any additional active Equitas card variants only if they are separately marketed and open for application

## Federal Bank Card Ingestion

Scapia Federal Credit Card added from official Federal Bank and Scapia sources. Also added Federal Bank Signet, Imperio, Celesta, and Wave from official Federal Bank card surfaces.

### Remaining Federal Bank Cards To Verify Later

- [ ] Federal Bank OneCard variants, if active and open for application

## OneCard Partner Issuers

Generic OneCard entry added from official OneCard product and FAQ pages, covering the multi-bank issued One Credit Card currently offered through partner issuers such as BOBCARD, CSB Bank, Federal Bank, SBM Bank, South Indian Bank and Indian Bank.

### Remaining OneCard To Verify Later

- [ ] Add bank-specific OneCard variants separately only if issuer-level product differences become material enough for separate entries

## Standard Chartered Card Ingestion

Top Standard Chartered India cards added from official product pages, FAQs and tariff tables: Rewards, Smart, Ultimate, EaseMyTrip, Platinum Rewards, Super Value Titanium, Manhattan Platinum, DigiSmart, Priority Visa Infinite, and Beyond.

### Remaining Standard Chartered Cards To Verify Later

- [ ] Emirates World Credit Card, only if still actively marketed in India and not legacy-only
- [ ] Any instant-card-only or pre-approved-only Standard Chartered variants that should be modeled separately from the mainstream cards
- [ ] Re-verify Manhattan Platinum from a direct product page if Standard Chartered restores a clean dedicated India page instead of only indexed/tariff references

## American Express Card Ingestion

High-priority American Express India personal cards added from official American Express pages: Platinum Travel, Membership Rewards, Gold Card, SmartEarn, Platinum Reserve, and Platinum Card.

### Remaining American Express Cards To Verify Later

- [ ] Verify reward calculator calculations and redemption rates for Amex Platinum Travel
- [ ] Any currently open business/corporate American Express cards, only if business-card coverage is requested
- [ ] Any limited-time proprietary card application pauses or reopenings, because older Amex pages and current index pages can show different availability language

## IDFC FIRST Bank Card Ingestion

High-priority IDFC batch was added together in commit work after `1774c40`, including FIRST Millennia, FIRST Classic, FIRST Select, FIRST Wealth, FIRST WOW cleanup, FIRST EA₹N, FIRST Power, FIRST Power+, Ashva, Mayura, and IndiGo IDFC FIRST.

### Remaining IDFC Cards

- [ ] Hello Cashback Credit Card
- [ ] FIRST Digital Credit Card
- [ ] FIRST WOW! Black Credit Card
- [ ] FIRST SWYP Credit Card
- [ ] LIC Classic Credit Card
- [ ] LIC Select Credit Card
- [ ] Diamond Reserve Credit Card

### Skip Unless Specifically Requested

- [ ] Gaj Credit Card: invite-only
- [ ] FIRST Private Credit Card: invite-only
- [ ] Business Max Credit Card
- [ ] Business Multiplier Credit Card
- [ ] FIRST Corporate Credit Card
- [ ] FIRST Purchase Credit Card
- [ ] FIRST Business Credit Card
# Detailed analytics plan: `docs/analytics-plan.md`
