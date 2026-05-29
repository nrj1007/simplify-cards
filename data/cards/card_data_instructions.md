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

*   **`additionalBenefits`**: Bullet points showcasing the high-level features of the card (e.g., unlimited airport lounge access, golf games, concierge desk).
*   **`additionalDetails`**: Key redemption guidelines, category-level capping summaries, and insurance details (e.g., "Grocery rewards are capped at 2,000 RP per calendar month").

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

### A. Special Spend Rules (`specialSpendRules`)
Use the `specialSpendRules` array to explicitly define caps and treatments for key spending categories:

*   **Allowed Categories (`SpendCategory`):** `online`, `offline`, `travel`, `fuel`, `dining`, `grocery`, `amazon`, `upi`, `utilities`, `rent`, `insurance`, `education`, `gold`
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

### C. Exclusions (`exclusionCodes`)
Map textual exclusions (found in the `"exclusions"` array) into canonical constants under `"exclusionCodes"` for deterministic ranking checks.

*   **Allowed Exclusion Codes:** `fuel`, `rent`, `insurance`, `education`, `gold`, `jewellery`, `utilities`, `telecom`, `wallet_load`, `government`, `tax`, `real_estate`, `property_management`, `cash_advance`, `balance_transfer`, `emi`, `fees_and_charges`, `cash_withdrawal`

---

## 4. Verification & Testing Workflow

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
