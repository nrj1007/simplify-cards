---
name: openclaw-daily-audit
description: Daily automated card monitor skill for OpenClaw agent. Orchestrates official bank page change auditing and Technofino community news scraping once per day.
---

# OpenClaw Daily Credit Card Monitor Skill

Use this skill to automate daily credit card news and official bank page change monitoring using **OpenClaw** (or standard crontab / systemd timers).

## What This Skill Automates

Every 24 hours, the skill runs a combined 2-stage audit pipeline:
1. **Official Bank Page Auditor**: Scrapes & hashes official bank product pages for all 209 credit cards to detect fee revisions, lounge capping changes, or T&C devaluations.
2. **Technofino Community Signals**: Scrapes new Technofino community threads created in the last 24 hours to catch devaluation alerts, launch rumors, and merchant reward behavior.
3. **Consolidated Daily Report**: Generates a unified JSON log at `data/daily-audits/<YYYY-MM-DD>-summary.json` and a Markdown summary at `data/daily-audits/<YYYY-MM-DD>-report.md`.

---

## OpenClaw Automation Setup

### 1. Manual Execution Command
To trigger the full daily monitor pipeline on demand:

```bash
node ./scripts/run-daily-card-monitor.mjs
```

### 2. OpenClaw Cron Schedule (Run Once Daily at 08:00 AM)
Add the following job to your OpenClaw agent configuration (or system `crontab -e`):

```cron
0 8 * * * cd /Users/neerajm/git/creditCardAI && node ./scripts/run-daily-card-monitor.mjs >> ./data/daily-audits/cron.log 2>&1
```

---

## Output Files & Review Workflow

- **Daily Summary JSON**: [data/daily-audits/](file:///Users/neerajm/git/creditCardAI/data/daily-audits/) (`<date>-summary.json`)
- **Daily Markdown Report**: [data/daily-audits/](file:///Users/neerajm/git/creditCardAI/data/daily-audits/) (`<date>-report.md`)
- **Baseline Hashes**: [baseline.json](file:///Users/neerajm/git/creditCardAI/data/official-audit/baseline.json)

> **Grounding Rule:**
> If the daily report flags an official bank page change or community devaluation alert:
> 1. Review the generated markdown report.
> 2. Verify against the official bank page or PDF.
> 3. Update `data/cards/<issuer>/<card-id>.json`.
> 4. Run `npm run validate:cards`, commit, and push to `main`.
