# Credit Card Data Update Guide

This guide outlines the instructions, conventions, and workflows for adding or updating credit card data in the database.

---

## 1. Directory Structure

All card data is stored in JSON files grouped by issuer under the `data/cards/` directory:

```text
data/cards/
├── hdfc.json
├── sbi.json
├── axis.json
└── yes-bank.json
```

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
> - remove redemption values repeated in both `redemption` and visible prose
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

---

## 3. Schema & Mapping Conventions

During card reviews, convert raw text into structured rules whenever possible.

### Card Image (`imageUrl`)
Each reviewed card should also be checked for a good card-face image.

* Prefer an official issuer card-face asset over banners, lifestyle images, or generic illustrations.
* Save reviewed images under `public/images/` and reference them via `"imageUrl"`.
* If the current image is low quality, badly cropped, or not the actual card face, replace it during the review.
*   Treat image quality and alignment as part of card verification, not as a separate optional cleanup.

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
*   **`airlinePartners`** and **`hotelPartners`**: Arrays describing direct point-to-mile transfer ratios:
*   Keep the visible **Redemption** section focused on point value and transfer partners only.
*   Do **not** treat operational rules like minimum points, monthly redemption caps, points validity, or redemption fees as primary redemption rows in the UI. Store those in `additionalDetails` or `internalNotes` instead.

```json
"redemption": {
  "statementBalanceValue": 0.3,
  "smartBuyFlightHotelValue": 1,
  "airMilesValue": 1,
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

To ensure that the UI renders reward rates exactly as they are advertised on official bank websites (rather than exposing raw yield decimals or default percentage fallbacks), follow these guidelines:

*   **`rate` (Numeric Earning Rate / Net Yield):** This is a decimal number representing the direct yield/percentage for the recommendation scoring calculations.
    *   *Example:* If a card earns 6 reward points per ₹100 online and each point is worth ₹0.40, the net yield is `2.4%`. Set `"rate": 2.4` for scoring accuracy.
*   **`displayRate` (Uniform Visual Representation):** Define this string property whenever a card expresses its rewards in terms of reward points, EazyPoints, savings points, or other specific metrics on its official page, rather than flat percentages.
    *   *Example:* For the card above, set `"displayRate": "6 reward points per Rs 100"`.
    *   Always use a clear, user-friendly format matching the official website (e.g. `"X reward points per Rs 100"`, `"X EazyPoints per Rs 100"`, or `"X reward points per Rs 150"`).
    *   Defining `displayRate` prevents the UI from incorrectly defaulting to the raw yield decimal (like displaying `2.4 reward points / Rs 100` instead of `6`) or appending `%` to non-percentage rates.
*   When an issuer lists multiple capped categories separately (for example grocery, insurance, utility, and telecom/cable each with their own monthly cap), keep them as separate visible reward rows rather than collapsing them into one combined line that implies a shared cap.
*   If the display needs separate rows but the scoring model only understands a broader canonical category, keep the canonical `category` stable and use distinct `displayCategory` labels for the UI rows.

### E. Ecosystem Redemption Labels
Some cards redeem into a closed ecosystem rather than statement credit, miles, or SmartBuy.

*   When using a custom redemption label like `Tata Neu brands`, make sure the UI wording remains explicit about the reward unit.
*   Prefer output such as `upto Rs 1 per NeuCoin` rather than vague text like `Rs 1`.
*   Keep ecosystem value in structured `redemption` data, not only in prose.


---

## 4. Latest Updates Configuration

Major card updates (devaluations, golf benefit revisions, or lounge spends tracking) are configured in `data/card-content.json`.

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
