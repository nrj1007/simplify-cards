---
name: community-signals
description: Scrape public credit-card community feeds such as Technofino new-post pages into a manual review queue. Use when Codex needs to collect recent posts, comments, devaluation alerts, launch rumors, merchant reward behavior, or other community signals for Indian credit cards without updating official card data automatically.
---

# Community Signals

Use this skill to collect community posts/comments as **signals for manual review**.

Hard rule:

```text
Never update data/cards.json from community signals alone.
```

Community posts can identify what to verify next. Official issuer pages, PDFs, or bank communications must verify any card data change.

## Workflow

1. Run the scraper script against the feed URL and time window.
2. Save output under `data/community-signals/pending/`.
3. Summarize only high-signal items for the user.
4. Ask the user which signals to verify officially.
5. After approval, verify against issuer sources.
6. Only then update `data/cards.json`, validate, commit, and push.

## Script

Use the bundled Node script:

```powershell
.\tools\node\node.exe .\skills\community-signals\scripts\scrape-technofino.mjs --feed "https://technofino.in/community/whats-new/posts/5982841/" --pages 5 --hours 24
```

Optional arguments:

```text
--feed <url>          Technofino new-posts feed URL
--pages <number>     Feed pages to scan, default 3
--hours <number>     Recent activity window, default 24
--threads <number>   Max thread pages to open for comments, default 12
--out <path>         Output JSON path. Default is data/community-signals/pending/<date>-technofino.json
```

The script writes JSON with:

- feed thread summaries
- recent public comments from selected credit-card threads
- normalized signal hints
- source URLs
- `requiresOfficialVerification: true`

## Review Guidance

Prioritize signals that mention:

- devaluation or reward changes
- effective dates
- official PDFs or bank links
- new card launches
- lifetime-free acquisition paths
- lounge access changes
- merchant name/MCC reward behavior
- redemption value or fee changes

Ignore or down-rank:

- quote-only replies
- generic opinions without new facts
- one-off customer service complaints
- bank account threads unrelated to cards
- speculative comments without official source links

## Output Rules

When reporting results to the user:

- Say this is community-sourced and unverified.
- Link the Technofino thread.
- Separate "candidate facts" from "needs official verification".
- Recommend official sources to check next.

When saving output:

- Keep raw snippets short.
- Preserve source URL, thread title, post ID, author, and timestamp.
- Do not store private credentials or logged-in-only content.
