---
name: verify-official-pages
description: Audit official bank web pages and downloadable PDF T&C links across 209 Indian credit cards to detect official fee, reward, capping, or lounge terms changes.
---

# Official Card Pages Verification & Change Audit

Use this skill to audit official credit card URLs (`sourceUrl` and `supportingSourceUrls`) for term changes, fee revisions, and devaluations.

## Core Principle

```text
Never update official card JSON files under data/cards/ directly from scraper outputs without human or agent review.
```

Official web pages and PDFs provide the source of truth, but dynamic web pages can change structural markup. Baseline hashes and text diffs isolate true terms revisions.

## Workflow

1. Run the official page auditor script.
2. Baseline SHA-256 hashes are stored under `data/official-audit/baseline.json`.
3. Audit outputs and text diffs are written to `data/official-audit/pending/<date>-official-audit.json`.
4. Review high-impact keyword changes (marked with keywords like `w.e.f`, `lounge`, `fee`, `cap`, `revised`).
5. Verify changes on the bank's official website.
6. Update the card JSON file under `data/cards/`, run `npm run validate:cards`, commit, and push.

## Script Usage

Run the official auditor script:

```bash
node ./scripts/audit-official-pages.mjs
```

### CLI Arguments

```text
--card <id>          Audit a single card ID (e.g. --card hdfc-infinia-metal)
--issuer <name>      Audit all cards from an issuer (e.g. --issuer hdfc)
--limit <number>     Limit the number of cards to audit
--update-baseline    Update stored SHA-256 baseline hashes
--dry-run            Run audit using cached/mock responses without network requests
```

### Examples

- Audit HDFC cards only:
  ```bash
  node ./scripts/audit-official-pages.mjs --issuer hdfc
  ```

- Audit a specific card:
  ```bash
  node ./scripts/audit-official-pages.mjs --card axis-atlas
  ```

- Update baseline hashes after verified database updates:
  ```bash
  node ./scripts/audit-official-pages.mjs --update-baseline
  ```
