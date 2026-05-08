# Card AI India

Lean Next.js MVP for an Indian credit-card discovery and Q&A product.

## What is included

- In-memory credit card data from `data/cards.json`
- Deterministic recommendation logic in `lib/recommend.ts`
- Home page with ask interface
- Card finder page
- Card comparison page
- Static card detail pages
- API routes:
  - `POST /api/ask`
  - `GET /api/cards`
- Ad placeholders and affiliate link fields

## Run locally

```bash
npm install
npm run dev
```

Then open:

```text
http://localhost:3000
```

This workspace also includes a portable Node.js install under `tools/node`. If global `npm` is not available on Windows, use:

```powershell
.\tools\node\npm.cmd install
.\scripts\dev.ps1
```

## MVP design

The AI should not be the source of truth. The intended flow is:

```text
cards.json
  -> deterministic filtering/scoring
  -> top matching cards
  -> AI explanation layer
  -> user answer with caveats and apply links
```

## Next steps

1. Replace the sample cards with verified Indian credit-card data.
2. Add real affiliate URLs in `applyUrl`.
3. Add OpenAI integration inside `app/api/ask/route.ts`.
4. Add analytics for apply clicks and page views.
5. Add a manual card update workflow before adding scrapers.
