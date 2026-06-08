---
name: list-cards
description: Retrieve a list of verified/unverified credit cards grouped by issuer/bank and sorted by popularity score using the helper script.
---

# Listing Verified and Unverified Cards by Popularity

Use this skill when the user asks for a summary of verified or unverified credit cards, ranked by their popularity score and grouped/filtered by their issuing bank.

## Workflow

1. **Locate the helper script**: The project contains a utility script to list, filter, and inspect the verification status of credit cards at [scratch/list_cards.js](file:///C:/Users/manpr/Documents/Codex/2026-05-08/i-want-to-build-an-ai/scratch/list_cards.js).
2. **Execute the script**: Run the script using Node.js.
3. **Format Options**:
   - You can list cards for all banks by running it without arguments, or passing `all`.
   - You can filter for a specific bank by passing the bank name/directory name as an argument (e.g. `hdfc`, `icici`, `axis`, `sbi`, `hsbc`).

## Execution Command

To list all credit cards in the database sorted by popularity:

```bash
node scratch/list_cards.js all
```

To list all credit cards from a specific bank (e.g. `hsbc`) sorted by popularity:

```bash
node scratch/list_cards.js hsbc
```

## Parsing the Output

The script outputs a JSON array containing details about each card, including:
- `id`: The card identifier.
- `name`: The full display name of the card.
- `issuer`: The card issuer (e.g. HDFC Bank, HSBC, SBI Card).
- `popularityScore`: The popularity score (used to rank).
- `userVerified`: Indicates whether the card has been manually verified by the user (returns the verification date `YYYY-MM-DD` or `"No"`).
- `filePath`: The relative path to the card's JSON config file.

You can run this script to quickly identify which cards still need to be verified or audited, or to rank them for the user.
