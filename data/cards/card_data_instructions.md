# Credit Card Data Update Guide

This guide outlines the instructions, conventions, and workflows for adding or updating credit card data in the database.

---

## 1. Directory Structure

Each card is stored as **one JSON file per card**, grouped into a per-issuer folder under `data/cards/`. The file name is the card's `id`, and the file contains a **single card object** (not an array):

```text
data/cards/
├── hdfc/
│   ├── hdfc-infinia-metal.json
│   └── hdfc-regalia-gold.json
├── axis/
│   ├── axis-atlas.json
│   └── axis-ace.json
└── sbi/
    └── sbi-cashback.json
```

**Adding a card:** drop a new `data/cards/<issuer>/<card-id>.json` file. The loader (`lib/card-index.ts`) reads every `data/cards/**/*.json` at load time, so there is no import list or index to update — just add the file and run the validator. The `id` must be globally unique across all issuers.

> [!NOTE]
> The folder name is purely organizational (grouping by issuer); card ordering in the app is derived from `popularityScore`/`name`, not file or folder order. `card_data_instructions.md` lives at the root of `data/cards/` and is ignored by the loader.

---

## 2. Visible vs. Hidden Data

To keep the user interface clean and readable while maintaining maximum answerability for the Ask AI engine, data is divided into two distinct categories:

### A. Visible Data (`additionalBenefits`, `additionalDetails`)
These fields are displayed directly on the credit card details page in the UI. Keep these concise and easy to read.

*   **`additionalBenefits`**: Bullet points showcasing the high-level features of the card (e.g., unlimited airport lounge access, golf games).
*   **`additionalDetails`**: Key redemption guidelines, category-level capping summaries, and insurance details (e.g., "Grocery rewards are capped at 2,000 RP per calendar month").

> [!IMPORTANT]
> **Aesthetic Redundancy Rule**:
> Do NOT duplicate information in `additionalBenefits` or `additionalDetails` that is already captured in structured fields like the `rewards` array (earning rates), `loungeDomestic` / `loungeInternational` (lounge limits), or `redemption` (point value / conversion rates). Keep visible text arrays focused on perks not represented in the tabular grids.
>
> Before finalizing a card update, do a quick duplication sweep:
> - remove exclusions repeated in visible text
> - remove lounge rules repeated across `milestoneBenefits` and `additionalDetails`
> - do not place lounge counts or lounge-eligibility conditions in `additionalBenefits` or `additionalDetails`; keep lounge counts in `loungeDomestic` / `loungeInternational` / `combinedLoungeAccess`, and keep user-facing lounge access conditions in the structured `lounge` field (see "Lounge access conditions" below) — only reviewer-only caveats stay in `internalNotes`
> - remove redemption values repeated in both `redemption` and visible prose
> - do not repeat annual fee waiver conditions in `milestoneBenefits`, `additionalBenefits`, or `additionalDetails`; keep fee waiver only in the structured `feeWaiverSpend` field
> - keep audit or verification wording in `internalNotes`, not user-facing sections
> - do not surface concierge or lifestyle-assistance details in visible sections unless concierge is a clear USP of the card (for example Amex Platinum or Centurion). Keep those details in `internalNotes` otherwise
> - do not surface generic loss liability cover, credit shield, purchase protection, or standard insurance cover lines in visible sections unless the protection benefit is unusually strong or is a genuine USP of the card. Keep those details in `internalNotes` otherwise

### B. Hidden Data (`internalNotes`)
This is an array of strings in the JSON configuration that is **not** rendered in the UI, but **is** fully indexed by the search and Ask AI engine. 

> [!TIP]
> Use `internalNotes` to store low-level operational rules, specific dates, transfer timing notes, booking workflows, and details needed to answer granular user questions.

**Example mapping from official terms to JSON:**
```json
"internalNotes": [
  "Effective 1st April 2026, continued access to the Infinia programme is aligned to a minimum card spend of Rs 18 Lakhs or RLV of Rs 50 Lakhs.",
  "Golf cancellations must be made 1 clear day in advance for domestic courses and 4 clear days in advance for international courses."
]
```

### C. Source of Truth: What Goes Where

Use the verified cards as the model. Each fact should have one primary home.

| If the fact is about... | Put it in... | Do not repeat it in... | Example from reviewed cards |
|---|---|---|---|
| Earning rates by category | `rewards` | `additionalBenefits`, `additionalDetails` | Flipkart Axis: Myntra / Flipkart / Cleartrip cashback rows |
| Reward caps tied to a reward row | reward-row cap fields such as `capDaily`, `capMonthly`, `capStatementQuarter` | `additionalDetails` unless the schema cannot express the cap | Flipkart Axis quarterly caps; Tata Neu Infinity separate monthly caps by category |
| Fee waiver threshold | `feeWaiverSpend` | `milestoneBenefits`, `additionalBenefits`, `additionalDetails` | Flipkart Axis fee waiver moved out of milestone copy |
| One-time onboarding perk | `joiningBenefitsValued` (preferred, with value); `joiningBenefits` text for un-migrated | `additionalBenefits` | Flipkart Axis welcome benefit; Tata Neu Infinity first-year NeuCoins reversal |
| Anniversary / renewal perk | `renewalBenefitsValued` (preferred, with value); `renewalBenefits` text for un-migrated | `additionalBenefits` | SBI PRIME renewal points; Marriott Bonvoy renewal points |
| Spend-threshold unlock | structured `milestones` (preferred); `milestoneBenefits` for un-migrated cards | `additionalBenefits`, `additionalDetails` | Marriott Bonvoy free-night milestones; Millennia quarterly lounge-or-voucher choice |
| Lounge visit counts | `loungeDomestic`, `loungeInternational`, `combinedLoungeAccess` | `additionalBenefits`, `additionalDetails` | Marriott Bonvoy combined domestic + international lounge pool |
| Lounge access conditions (spend gates, guest rules, Priority Pass terms) | structured `lounge` field (`domestic` / `international` / `combined`) | `additionalBenefits`, `additionalDetails`, `internalNotes` | Regalia Gold spend-gated quarters; Magnus guest-visit limits |
| Redemption value or partner ratio | `redemption` | visible prose unless the schema cannot express the nuance | Millennia statement balance / SmartBuy / catalogue values |
| Zero-reward categories | `exclusions` + `exclusionCodes` | `additionalBenefits`, `additionalDetails` | Amazon Pay ICICI and verified SBI cards |
| Operational nuance, effective dates, posting timing, caps not meant for the page, partner caveats | `internalNotes` | visible sections unless essential for user understanding | SBI Cashback statement-cycle posting; HDFC lounge-gating dates |
| Generic ongoing perk not modeled elsewhere | `additionalBenefits` | other structured fields | Fuel surcharge waiver, dining program eligibility |
| Short support detail that helps users but is not already modeled | `additionalDetails` | structured fields if already represented | Cashback posting timing, point expiry summary |

### D. Quick Decision Tree

When you review a new fact, route it using this order:

1. If it changes how rewards are earned, it belongs in `rewards`.
2. If it caps a reward row, use the reward-row cap fields.
3. If it is a fee waiver threshold, use `feeWaiverSpend`.
4. If it is a welcome / first-use perk, use `joiningBenefits`.
5. If it is a renewal / anniversary perk, use `renewalBenefits`.
6. If it unlocks only after reaching a spend threshold, use the structured `milestones` field (see
   "Milestones" below); `milestoneBenefits` free text remains the fallback for un-migrated cards.
7. If it is a lounge count, use the lounge count fields.
8. If it is a user-facing lounge access condition (spend gate, guest rule, Priority Pass term), use the structured `lounge` field; keep reviewer-only booking caveats in `internalNotes`.
9. If it is redemption value or transfer ratio, use `redemption`.
10. If it is a zero-reward exclusion, use `exclusions` and `exclusionCodes`.
11. If it is useful but too detailed for the page, use `internalNotes`.
12. Only then consider `additionalBenefits` or `additionalDetails`.

### E. No-Repetition Rule

Treat structured fields as the single source of truth.

* If a fact has a structured home, use that structured home first.
* Do not restate the same fact in visible prose just because the issuer page repeats it in marketing language.
* `additionalBenefits` and `additionalDetails` should fill gaps in the structured model, not mirror it.
* If a fact is important for Ask AI but clutters the page, move it to `internalNotes`.

---

## 3. Schema & Mapping Conventions

During card reviews, convert raw text into structured rules whenever possible.

### Card Image (`imageUrl`)
Each reviewed card should also be checked for a good card-face image.

* Prefer an official issuer card-face asset over banners, lifestyle images, or generic illustrations.
* Save reviewed images under `public/images/` and reference them via `"imageUrl"`.
* If the current image is low quality, badly cropped, or not the actual card face, replace it during the review.
*   Treat image quality and alignment as part of card verification, not as a separate optional cleanup.
* If the official card-face asset is portrait/vertical but the details-page image slot is horizontal, create a horizontal version on a light beige background with the card face centered and save that derived asset locally. Prefer this over adding one-off CSS or layout exceptions for a single card.

### Reward Calculator Verification for Travel Cards

For travel or miles cards, verify the Reward Calculator after updating redemption data.

* `transferPartnerValuations` drives the calculator's transfer-partner value block.
* If a partner was removed from the currently verified transfer set, remove it from `transferPartnerValuations` too.
* After updating `airlinePartners`, `hotelPartners`, or `transferPartnerValuations`, confirm that the calculator does not surface stale partners that no longer exist in the verified current transfer table.
* Treat a calculator/details-page mismatch as a data bug and fix the card JSON before finishing the review.
* If an official update adds new partners at a different ratio from legacy partners, explicitly verify those named new partners in the redemption table. Do not assume they share the same ratio as the rest of the programme.
* When a `Latest Updates` item mentions partner removals or newly added partners, the update text, `airlinePartners` / `hotelPartners`, and `transferPartnerValuations` must agree on removed partners, added partners, ratios, and partner-group caps.

### Lounge Access & Combined Pools (`combinedLoungeAccess`)
Define the lounge access limits for domestic and international visits:

*   **Separate Limits**: If domestic and international lounge visits are independent quotas (e.g., 8 domestic AND 8 international separately, summing to 16 total), configure them using `loungeDomestic` and `loungeInternational` properties. Do not specify `combinedLoungeAccess`.
*   **Combined/Shared Limits**: If the lounge visits are shared between domestic and international lounges as a single combined pool (e.g., a total of 12 visits that can be used either domestically or internationally), configure:
    *   Set `loungeDomestic` to the maximum possible visits (e.g., `12`).
    *   Set `loungeInternational` to the maximum possible visits (e.g., `12`).
    *   Set `combinedLoungeAccess` to the combined limit (e.g., `12`).
    *   Set `combinedLoungeAccessLabel` to `"Lounge access (domestic + international)"` (or a descriptive custom label).

**Example entry for combined lounge access:**
```json
"loungeDomestic": 12,
"loungeInternational": 12,
"combinedLoungeAccess": 12,
"combinedLoungeAccessLabel": "Lounge access (domestic + international)"
```

#### Lounge access conditions (`lounge`)
The numeric fields above carry the *counts*. The optional structured **`lounge`** object carries the
*conditions* — spend gates, guest-visit limits, Priority Pass terms, per-quarter unlock rules — as
short, user-facing bullet strings. This is the home for the text that previously had to be mined out
of `internalNotes` / `additionalBenefits`.

```json
"lounge": {
  "domestic": [
    "12 complimentary visits per year (max 3 per quarter).",
    "From 1 July 2026 access is spend-gated: requires Rs 60,000 of spend in the preceding calendar quarter to unlock the next quarter."
  ],
  "international": [
    "Complimentary Priority Pass membership on request after 4 retail transactions.",
    "6 complimentary visits per calendar year outside India; extra visits charged at US $27 + GST."
  ]
}
```

* Use `domestic` / `international` for separate quotas; use `combined` when the card publishes a single
  combined allowance (mirror the `combinedLoungeAccess` choice above).
* Each key is an **array of plain strings**. The validator (`npm run validate:cards`) rejects any other shape.
* `getLoungeConditions(card, type)` **prefers** this field and only falls back to mining
  `internalNotes` / `additionalBenefits` / `additionalDetails` / `milestoneBenefits` when it is absent —
  so once you author `lounge`, the mined text is no longer used for that card. Do not duplicate the same
  condition in both `lounge` and prose.
* To seed `lounge` from the existing mined text, run
  `npm run draft:lounge -- --write --only=<id1,id2>` (dry-run without `--write`); it drafts the same
  bullets the page shows today, ready for hand-refinement before committing.

### A. Special Spend Rules (`specialSpendRules`)
Use the `specialSpendRules` array to explicitly define caps and treatments for key spending categories:

*   **Allowed Categories (`SpendCategory`):** `online`, `base`, `travel`, `fuel`, `dining`, `grocery`, `amazon`, `upi`, `utilities`, `rent`, `insurance`, `education`, `gold`
*   **Allowed Treatments:** `rewarded`, `capped`, `excluded`

```json
"specialSpendRules": [
  {
    "category": "grocery",
    "treatment": "capped",
    "notes": "Grocery spends earn rewards capped at 2,00,000 total cycle cap, but specifically capped at 2,000 Reward Points per calendar month for grocery spends."
  }
]
```

### B. Redemption & Partner Transfers (`redemption`)
Define the redemption values for different options, along with transfer ratios for airline and hotel partners:

*   **`statementBalanceValue`**: The value of 1 point in INR when redeemed against card statement balance.
*   **`smartBuyFlightHotelValue`**: The value of 1 point in INR when redeemed for flights/hotels via SmartBuy.
*   **`travelEdgeValue`**: The value of 1 point in INR when redeemed for flights/hotels via Axis Travel EDGE.
*   **`airlinePartners`** and **`hotelPartners`**: Arrays describing direct point-to-mile transfer ratios:
*   **Travel-card completeness rule**: For travel or miles cards, fetch and populate the full official redemption structure. Do not stop at one numeric value; include all visible redemption options plus the current airline and hotel transfer tables from official issuer materials.
*   **`transferPartnerValuations`**: Per-partner rupee valuations used by the Reward Calculator on the card details page. See the dedicated subsection below for how to populate it.
*   Keep the visible **Redemption** section focused on point value and transfer partners only.
*   Do **not** treat operational rules like minimum points, monthly redemption caps, points validity, or redemption fees as primary redemption rows in the UI. Store those in `additionalDetails` or `internalNotes` instead.

```json
"redemption": {
  "statementBalanceValue": 0.3,
  "smartBuyFlightHotelValue": 1,
  "airMilesValue": 1,
  "transferPartnerValuations": [
    { "partner": "Accor (ALL)", "partnerPointValue": 2.2, "transferRatio": 0.5, "basis": "fixed", "note": "2 reward points → 1 Accor ALL point · Rs 2.2/point" }
  ],
  "airlinePartners": [
    {
      "airline": "Turkish Airlines",
      "programme": "Miles&Smiles",
      "ratio": "2:1"
    }
  ],
  "hotelPartners": [
    {
      "hotelGroup": "Accor",
      "programme": "ALL (Accor Live Limitless)",
      "ratio": "2:1"
    }
  ]
}
```

#### Transfer Partner Valuations (`transferPartnerValuations`)

This array powers the **Transfer partner value** block in the Reward Calculator. Each entry converts the card's reward currency into a rupee value via a specific loyalty partner. Only populate partners for which we have a real, defensible per-point valuation — **never invent numbers.**

Each entry has four fields:

*   **`partner`**: Display label for the partner programme (e.g. `"Accor (ALL)"`, `"Club ITC"`, `"Marriott Bonvoy"`).
*   **`partnerPointValue`**: Rupee value of **1 partner programme point** (NOT 1 card point). This is intrinsic to the partner and identical across every card that transfers to it — e.g. an Accor ALL point is worth Rs 2.2 whether the points came from Atlas, Infinia, or TravelOne.
*   **`transferRatio`**: How many partner points you receive per **1 card reward unit**. Derive it from the partner's `ratio` field (written `card:partner`) as `partner ÷ card`:
    *   `1:2` → `2`  (1 card unit → 2 partner points)
    *   `1:1` → `1`
    *   `2:1` → `0.5`
    *   `3:1` → `0.333`
    *   `5:1` → `0.2`
*   **`basis`**: `"fixed"` if the partner has a published/stable conversion (Accor, Club ITC), `"dynamic"` if value swings with award availability (most airline miles, Marriott Bonvoy) — for dynamic partners use a typical-case average.
*   **`note`** (optional): A short human-readable line, e.g. `"2 reward points → 1 Accor ALL point · Rs 2.2/point"`.

The calculator computes `value per card unit = partnerPointValue × transferRatio`, so the same `partnerPointValue` produces card-specific results purely through `transferRatio`.

**Current known valuations** (reuse these exact numbers; ask the user before adding any partner not listed here):

| Partner | `partnerPointValue` (Rs / partner point) | `basis` |
|---|---|---|
| Accor (ALL) | 2.2 | fixed |
| Club ITC | 1 | fixed |
| Marriott Bonvoy | 0.6 | dynamic |

> [!IMPORTANT]
> Do not add a `transferPartnerValuations` entry for a partner we have no valuation for (e.g. IHG, Wyndham, Radisson, Shangri-La, or airline programmes like KrisFlyer / Aeroplan). Leave those partners out until the user supplies a per-point figure. The legacy flat `accorValue` field is superseded by an `Accor (ALL)` entry here — do not list Accor in both, and the calculator intentionally renders Accor only from `transferPartnerValuations`.

### C. Exclusions (`exclusions` and `exclusionCodes`)
*   **`exclusions`**: This array must ONLY contain spend categories, transaction types, or merchants that are **excluded from earning reward points** (i.e., they yield 0% rewards). Do not place general bank policies, eligibility constraints, lounge access conditions, or fee info here; those belong in fields like `eligibility`, `additionalBenefits`, `additionalDetails`, or `internalNotes`.
*   **`exclusionCodes`**: Map the textual exclusions from the `"exclusions"` array into canonical constants under `"exclusionCodes"` for deterministic ranking checks.
*   **Allowed Exclusion Codes:** `fuel`, `rent`, `insurance`, `education`, `gold`, `jewellery`, `utilities`, `telecom`, `wallet_load`, `government`, `tax`, `real_estate`, `property_management`, `cash_advance`, `balance_transfer`, `outstanding_balance_payment`, `emi`, `fees_and_charges`, `gaming`, `cash_withdrawal`

> [!NOTE]
> **Exclusions vs. Revised/Capped Rates**:
> * **Zero Rewards Only**: The `exclusions` text array and `exclusionCodes` array must ONLY contain spend categories that do not earn any rewards at all (i.e., yield 0%).
> * If a category is completely excluded from earning rewards, add it to `exclusionCodes`.
> * If a category still earns points but at a revised lower rate (e.g., 0.7 reward points per ₹100 spent) or is capped but still rewards up to that cap, do **not** add it to `exclusions` or `exclusionCodes`. Instead, define it in the `rewards` array with the specific rate and a descriptive `displayCategory` and `displayRate` to ensure proper yield calculations in recommendation scoring.


### D. Reward Rates and Display Uniformity (`displayRate` vs. `rate`)

`rate` is the canonical number the engine scores on; `displayRate` is the user-facing string. They
must agree numerically (the validator enforces it), so the UI shows the advertised wording while the
engine never has to parse prose. Follow these guidelines:

*   **`rate` (Canonical Earn Rate — reward-currency units per Rs 100):** A decimal giving the number
    of **reward-currency units** (points / miles / cashback-rupees) earned per **Rs 100** of spend.
    The rupee value is applied separately by the engine via the `redemption` point value — **do not**
    bake the point value into `rate`.
    *   *Example:* A card earning **6 reward points per ₹100** has `"rate": 6` (not `2.4`). If each
        point is worth ₹0.40, the engine multiplies `6 × 0.40` to get the 2.4% yield at scoring time.
    *   *Cashback cards* (rewardType contains "cashback") are the one case where a unit **is** a rupee,
        so `rate` = rupees per Rs 100 = the cashback % (e.g. a 5% card has `"rate": 5`).
    *   `rate` must equal the units implied by `displayRate` (the validator enforces this — see below).
        Store the **exact** division: `"5 Reward Points / Rs 150"` → `rate = 5 × 100 / 150 =
        3.3333333333333335`. Long decimals on `/Rs 150`-style rows are expected and correct; the UI
        rounds them for display. Run `npm run normalize:reward-rates` to derive `rate` from `displayRate`.
*   **`displayRate` (Uniform Visual Representation):** The user-facing string, matching the official
    page. Define it whenever a card expresses rewards as points / miles / EazyPoints / etc.
    *   *Example:* For the card above, `"displayRate": "6 reward points per Rs 100"`.
    *   Always use a clear, user-friendly format matching the official website (e.g. `"X reward points per Rs 100"`, `"X EazyPoints per Rs 100"`, or `"X reward points per Rs 150"`).
    *   `displayRate` is **display-only** — the engines never parse it for scoring. But because the
        validator checks `rate` against the `"<units> … / Rs <amount>"` pattern in `displayRate`, the
        two must stay numerically consistent. Editing the points/spend in `displayRate` means re-running
        `npm run normalize:reward-rates` (or updating `rate` by hand). A reward whose `displayRate` is
        intentionally inconsistent with a correct `rate` (rare) must be added to the validator's
        `RATE_DISPLAY_MISMATCH_ALLOWLIST`.
*   If a reward category has its own issuer-published cap, keep that cap in the reward row itself rather than moving it to `additionalDetails`.
*   Use `capDaily` for daily caps, `capMonthly` for monthly caps, and `capStatementQuarter` for statement-quarter caps.
*   Only fall back to cap wording inside `displayRate` if the cap period cannot be represented through the structured reward fields.
*   When an issuer lists multiple capped categories separately (for example grocery, insurance, utility, and telecom/cable each with their own monthly cap), keep them as separate visible reward rows rather than collapsing them into one combined line that implies a shared cap.
*   If the display needs separate rows but the scoring model only understands a broader canonical category, keep the canonical `category` stable and use distinct `displayCategory` labels for the UI rows.
*   **Spend-tiered earning (`tierLowerBound` / `tierUpperBound`):** When a category earns at different
    rates across **monthly-spend bands** (e.g. Magnus base: 6 pts/Rs100 up to Rs 1.5L/mo, then 17.5
    above), model each band as its own reward row sharing the same `category`, and set the structured
    bounds: `tierLowerBound` is the inclusive lower bound (Rs/month), `tierUpperBound` the exclusive
    upper bound (or `null` for the open-ended top band). Both the calculator and recommender bucket
    monthly spend across the tiers, so the bounds — not the `displayCategory` text — drive scoring.
    Tiering only activates when **every** matching row for the category carries a tier. Keep the human
    band description in `displayCategory`; the validator requires `tierUpperBound` to be null or
    greater than `tierLowerBound`.

### E. Fee Waiver Modeling (`feeWaiverSpend`)

*   Model annual fee waiver eligibility only through the structured `feeWaiverSpend` field.
*   Do **not** repeat fee waiver conditions in `milestoneBenefits`, `additionalBenefits`, or `additionalDetails`.
*   If the issuer excludes categories like rent or wallet load from fee-waiver tracking, keep that nuance in `internalNotes` rather than visible sections unless the user explicitly asks for it on-page.

### F. Ecosystem Redemption Labels
Some cards redeem into a closed ecosystem rather than statement credit, miles, or SmartBuy.

*   When using a custom redemption label like `Tata Neu brands`, make sure the UI wording remains explicit about the reward unit.
*   Prefer output such as `upto Rs 1 per NeuCoin` rather than vague text like `Rs 1`.
*   Keep ecosystem value in structured `redemption` data, not only in prose.


---

## 4. Latest Updates Configuration

Major card updates (devaluations, golf benefit revisions, or lounge spends tracking) are configured in `data/card-content.json`.

*   **Review requirement**: During every official card audit, check whether the issuer has any recent official updates, revision notices, fee changes, lounge-rule changes, reward devaluations, or benefit revisions that should be captured in `data/card-content.json`.
*   **Freshness rule**: Only add `updates` items that are within the trailing 12 months as of the review date. If an official notice is older than 1 year, do not add it to `Latest Updates` unless the user explicitly asks for historical updates.
*   **Image fallback rule**: If the issuer-hosted card image cannot be downloaded directly but is visibly present on the official product page, capture the official page hero/banner via a browser screenshot, crop the relevant card visual locally, and save that derived official asset under `public/images/`.

*   **Structure**: Each card has an entry with an `updates` array containing items with these fields:
    *   `title`: Clear headline of the change.
    *   `summary`: High-level summary of the revision and its effective date.
    *   `sourceType`: `"manual"` (for official bank announcements) or `"technofino"`.
    *   `sourceLabel`: Friendly name of the source (e.g., "IndusInd Bank official notice").
    *   `sourceUrl`: Direct canonical link to the announcement PDF or official web page.
    *   `publishedAt`: Release date in `YYYY-MM-DD` format.

**Example entry:**
```json
"indusind-pioneer-legacy": {
  "updates": [
    {
      "title": "Domestic Lounge access update",
      "summary": "Effective 1st April, 2026 spends criteria tracking will be initiated to unlock complimentary domestic lounge access from July, 2026 quarter onwards.",
      "sourceType": "manual",
      "sourceLabel": "IndusInd Bank official notice",
      "sourceUrl": "https://www.indusind.bank.in/content/dam/indusind-corporate/Other/Lounge-Terms-and-Conditions.pdf",
      "publishedAt": "2026-04-01"
    }
  ]
}
```

---

## 5. Verification & Testing Workflow

Before committing any card changes, you must ensure that all configurations match the schema and all tests are passing.

### Step 1: Run Card Validator
Verify the card database schemas, allowed codes, and formatting rules:
```powershell
npm run validate:cards
```

### Step 2: Run TypeScript Type Check
Ensure no TypeScript definitions are broken:
```powershell
.\tools\node\node.exe .\node_modules\typescript\bin\tsc --noEmit
```

### Step 3: Run Vitest Test Suite
Execute the unit and integration tests to ensure recommendation scoring, exclusions, and Ask AI logic work correctly:
```powershell
npm test
```

> [!WARNING]
> Do not skip the tests. A single formatting typo in the JSON card files can break recommendation logic and scorecards.

> [!TIP]
> **Windows PowerShell Execution Policy Workaround**:
> If running `npm run validate:cards` or `npm test` fails with a `SecurityError` or `PSSecurityException` because script execution is disabled on the system, bypass it using:
> `powershell -ExecutionPolicy Bypass -Command "npm run validate:cards"`

---

## 6. Estimated Value Guidelines for Ambiguous Benefits

Some benefits do not state a rupee amount (e.g. "complimentary hotel stay", "golf game", "airport transfer"). The scoring engine can only extract value from benefit strings that contain a recognisable rupee amount or point quantity. When you add such benefits, **append an estimated value in parentheses** so the engine picks it up.

> [!IMPORTANT]
> Always use the format **`worth Rs X,XXX`** or **`voucher worth Rs X,XXX`** so the parser can extract it. Do not use shorthand like "~₹5K" or "approx 5000".

### Hotel Stays

Use the following value benchmarks when writing benefit strings for complimentary hotel nights. These are rough median rack-rate estimates for the Indian market — adjust up for ultra-luxury and down for business hotels.

| Hotel tier / programme | Estimated value per night | Notes |
|---|---|---|
| Budget / 3-star | Rs 3,000 | e.g. Ibis, Lemon Tree |
| Business / 4-star | Rs 6,000 | e.g. Novotel, Marriott Courtyard |
| Premium / 5-star | Rs 12,000 | e.g. JW Marriott, Hyatt Regency |
| Luxury / flagship | Rs 20,000 | e.g. Taj, Oberoi, St. Regis |
| Marriott Bonvoy free night (up to 15,000 pts) | Rs 7,500 | Already handled by point conversion in code |
| Marriott Bonvoy free night (up to 35,000 pts) | Rs 17,500 | Already handled by point conversion in code |

**Example benefit string to write:**

```json
"joiningBenefits": [
  "Complimentary one-night stay at a premium 5-star hotel (worth Rs 12,000) on first transaction"
]
```

```json
"milestoneBenefits": [
  "Complimentary luxury hotel stay (worth Rs 20,000) on annual spends of Rs 10 lakh"
]
```

> [!NOTE]
> Hotel stay values are treated as **voucher benefits** by the scoring engine and automatically discounted to **50% of face value** to account for restricted availability, blackout dates, and limited hotel choice. Write the full rack-rate estimate — the discount is applied in code.

> [!TIP]
> If a benefit has a capped or conditional value (e.g. "up to Rs 5,000"), use the **capped figure**, not an assumed average. The engine sums the stated amount, so overstating leads to inflated scoring.

### Milestones (`milestones`) — preferred over `milestoneBenefits` parsing

`milestoneBenefits` is free text the scoring engine and reward calculator must **regex-parse at
runtime** to recover the spend threshold and rupee value (the `worth Rs …` trick above exists only
to feed that parser). The optional structured **`milestones`** field carries those numbers
explicitly, so nothing has to be parsed and quarterly/monthly milestones are scored correctly.

```json
"milestones": [
  { "threshold": 500000, "period": "annual", "value": 5000, "kind": "voucher",
    "label": "Rs 5,000 flight voucher on annual spends of Rs 5 lakh" },
  { "threshold": 75000, "period": "quarterly", "value": 2500, "kind": "points",
    "label": "5,000 bonus Reward Points on Rs 75,000 spend per calendar quarter" }
]
```

* `threshold` and `value` are **in the given `period`** (e.g. a quarterly milestone uses the
  per-quarter spend and per-quarter value). The engine annualizes internally
  (`milestoneRulesForCard` in `lib/recommend.ts`): `quarterly × 4`, `monthly × 12`, `annual × 1`.
  This is the fix for the long-standing bug where quarterly/monthly milestones were scored as annual.
* `kind`: `"voucher"` (engine still applies the 50% voucher discount), `"points"`, `"cashback"`,
  or `"other"`. `threshold: 0` means it always applies (e.g. a transaction-count milestone).
* `label` is the user-facing string — **no embedded `(worth Rs …)`** annotation; the value lives in
  the `value` field.
* **Coexistence rule:** when `milestones` is present it is the source of truth for that card; its
  `milestoneBenefits` are ignored for scoring and display. Don't duplicate — a fully migrated card
  can drop `milestoneBenefits`. Keep fee-waiver thresholds in `feeWaiverSpend`, never as a milestone.
* **Do NOT migrate (leave as `milestoneBenefits` text only):** milestones with no fixed rupee value —
  specifically **airline-mile rewards** (we do not assign a rupee valuation to miles) and **membership
  tier upgrades** (e.g. MMTBLACK, KrisFlyer Elite Gold). Never invent a value for these. If *every*
  milestone line on a card is one of these, don't add a `milestones` field at all (the text fallback
  keeps the benefit visible without a fabricated value).
* The validator (`npm run validate:cards`) requires each entry to have numeric `threshold`/`value`
  (`>= 0`), `period` ∈ {annual, quarterly, monthly}, `kind` ∈ {voucher, points, cashback, other},
  and a non-empty `label`.
* **Seeding:** `npm run draft:milestones -- --write --verified-only --only=<id>` drafts entries from
  the existing `milestoneBenefits` text (dry-run without `--write`) and **flags** any line that
  mentions quarter/month or whose threshold/value couldn't be parsed — fix the period/value by hand
  before committing.

### Joining / renewal value (`joiningBenefitsValued` / `renewalBenefitsValued`)

Joining and renewal benefit **value** is parsed from prose at runtime today
(`joiningAndRenewalBenefitValueForCard` in `lib/recommend.ts`), and the engine even keyword-classifies
`additionalBenefits` lines into joining vs renewal. The optional structured **`joiningBenefitsValued`**
/ **`renewalBenefitsValued`** fields make the value explicit:

```json
"renewalBenefitsValued": [
  { "value": 1500, "kind": "voucher", "label": "Rs 1,500 voucher on card anniversary" }
]
```

* `value` is the **net** rupee value (vouchers already discounted — same convention as milestones);
  `kind` ∈ {voucher, points, cashback, other}; `label` carries no embedded `(worth Rs …)`.
* Joining value is amortized over 3 years in scoring; renewal value counts each year.
* **Coexistence rule:** when the valued field is present it is the source of truth for that side's
  value **and** display; the `joiningBenefits` / `renewalBenefits` string arrays (and any
  joining/renewal-keyword `additionalBenefits` lines) are ignored for that card. **Move** joining/
  renewal perks out of `additionalBenefits` into the valued field so they aren't shown twice.
* Note: the runtime fallback never valued the `renewalBenefits` string array — migrating a card is the
  first time its renewal perks count. The same **no-rupee-value rule** as milestones applies: airline
  miles and tier upgrades stay as text (`joiningBenefits`/`renewalBenefits`), never given a fabricated
  value.
* The validator requires each entry to have numeric `value` (`>= 0`), `kind` from the allowed set, and
  a non-empty `label`.
* **Seeding:** `npm run draft:joining-renewal -- --write --verified-only --only=<id>` drafts entries
  from the existing text (dry-run without `--write`) and **flags** lines whose value couldn't parse and
  any line pulled from `additionalBenefits` (remove it there) — fix by hand before committing.
