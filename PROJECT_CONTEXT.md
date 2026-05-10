# Project Context

Last updated: 2026-05-10

## Project

Repository: https://github.com/nrj1007/creditCardAI

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
- Each card has a `popularityScore` from 0 to 100 for popularity-first sorting and future ranking features.
- Deterministic recommendation logic in `lib/recommend.ts`
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

Type check:

```powershell
.\tools\node\node.exe .\node_modules\typescript\bin\tsc --noEmit
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
