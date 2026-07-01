---
name: explain-card-score
description: Explain the fit score, annual rewards, milestones, fees, and preference boosts of a credit card for a query. Use when the user asks to explain the score, ranking reasons, or detailed math behind a card.
---

# Explain Card Score

Use this skill to view the detailed fit score calculation, spend profile modeling, reward breakdown, envelope ordering metadata, structured score reasons, relevance boosts, and preference boosts of any single credit card.

## Usage Instructions

Run the scoring explanation script from the root of the project:

```bash
npx tsx scripts/explain-card-score.ts <card-id> [query] [--ltf] [--lounge]
```

### Parameters:
- `<card-id>`: The unique kebab-case ID of the card to explain (e.g., `hdfc-marriott-bonvoy` or `indigo-sbi-elite`).
- `[query]` (optional): The query string to test and evaluate query relevance boosts (e.g. `"best premium cards for travel"`).
- `--ltf` (optional flag): Restrict candidate scoring to lifetime free conditions.
- `--lounge` (optional flag): Apply the lounge access requirement filter.

## Example Command & Output

```bash
npx tsx scripts/explain-card-score.ts hdfc-marriott-bonvoy "best premium cards for travel"
```

Output:
```
=============================================================
SCORING BREAKDOWN FOR CARD: Marriott Bonvoy HDFC Bank Credit Card (hdfc-marriott-bonvoy)
=============================================================
Issuer:        HDFC Bank
Network:       Diners Club
Annual Fee:    Rs 3000
Popularity:    85
-------------------------------------------------------------
Input query:             "best premium cards for travel"
wantsLifetimeFree:       false
wantsLounge:             false

--- MODELED ANNUAL SPEND PROFILE ---
Total Spend: Rs 1,440,000 / year (Rs 120,000 / month)

--- CATEGORY REWARD BREAKDOWN ---
Category        | Monthly Spend | Rate     | Reward Type     | Monthly Earn | Annual Value
-------------------------------------------------------------------------------------
...

--- STRUCTURED SCORE REASONS ---
Kind       | Code                       |        Value | Label                          | Detail
----------------------------------------------------------------------------------------------------
category   | category:travel            |       +1,221 | Travel rewards                 |
boost      | value:milestone            |       +9,000 | Milestone value                |
penalty    | penalty:fee                |       -3,000 | Annual fee                     |
```
