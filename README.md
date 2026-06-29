# SimplifyCards — Card AI India

A Next.js app for Indian credit-card discovery, comparison, and grounded Q&A at
[simplifycards.in](https://www.simplifycards.in).

- 209 manually-verified cards across all major Indian issuers
- Spend-based recommendation engine with rupee-value scoring
- Per-card reward calculator with category caps and milestones
- Grounded Q&A: answers come from the verified card dataset, never hallucinated
- SEO landing pages, card comparisons, and card detail pages

## Run locally

```bash
npm install
npm run dev     # http://localhost:3001  (Claude worktree port)
npm run build
npm test        # vitest
npm run lint
npm run validate:cards
```

> **Turbopack issues on Windows/ARM:** use `next dev --webpack`. If `.next` cache is corrupt,
> delete `.next/dev/cache` (or all of `.next`) and restart.

## Project structure

```
app/        Next.js App Router — pages, API routes, UI components   (see app/AGENTS.md)
lib/        Server-side engine: data, scoring, Q&A, SEO, analytics  (see lib/AGENTS.md)
data/       Card JSON files + generated logs (one JSON per card)
scripts/    Maintenance / ingestion scripts
tests/      Vitest unit tests (one per lib module)
skills/     Agent skills (verify-card-details, community-signals, …)
```

See **`AGENTS.md`** for the full route map, data model, and conventions.
