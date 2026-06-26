---
name: compare-card-scores
description: Compare the fit scores, net yearly value, annual rewards, milestones, fees, and preference boosts of two credit cards side-by-side. Use when the user asks to compare the scores, rankings, or detailed math behind two cards.
---

# Compare Card Scores

Use this skill to compare the fit score and detailed financial/heuristic breakdowns of any two credit cards side-by-side.

## Usage Instructions

Run the comparison script from the root of the project using the target card IDs:

```bash
npx tsx scripts/compare-card-scores.ts <card-id-1> <card-id-2> [query] [--ltf] [--lounge]
```

### Parameters:
- `<card-id-1>` and `<card-id-2>`: The unique kebab-case IDs of the two cards to compare (e.g. `sc-ultimate` and `hdfc-diners-club-black-metal`).
- `[query]` (optional): Apply a search query string to compute relevance boosts (e.g. `"best cashback card"`).
- `--ltf` (optional flag): Restrict candidate scoring to lifetime free conditions.
- `--lounge` (optional flag): Apply the lounge access requirement filter.

## Example Command & Output

```bash
npx tsx scripts/compare-card-scores.ts sc-ultimate hdfc-diners-club-black-metal
```

Output:
```
================================================================================
SCORE COMPARISON: Standard Chartered Ultimate Credit Card vs HDFC Bank Diners Club Black Metal Edition Credit Card
================================================================================
Metric                         | Standard Chartered Ult | HDFC Bank Diners Club 
--------------------------------------------------------------------------------
Final Fit Score (★)            | 27938                  | 40740                 
Estimated Net Yearly Value     | Rs 18,881              | Rs 29,326             
  (+) Est. Annual Rewards      | Rs 14,281              | Rs 39,326             
  (+) Milestone Value          | Rs 9,600               | Rs 0                  
  (-) Net Annual Fee           | Rs 5,000               | Rs 10,000             
--------------------------------------------------------------------------------
Total Shared Boosts            | 9057                   | 11414                 
  - loungeBoost                | 4682                   | 6689                  
  - forexBoost                 | 225                    | 225                   
  - popularityBoost            | 4150                   | 4500                  
...
```
