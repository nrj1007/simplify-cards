---
name: audit-reward-categorization
description: Audit how a card (or the top-N ranked cards) maps each spend category to accelerated vs base rewards, flagging over-broad accelerators, uncapped high rates, and missing point values that distort ranking. Use when checking whether reward categorisation is correct, or after adding/editing card reward rows.
---

# Auditing Reward Categorisation (accelerated vs base)

Use this skill when asked to verify that a card's spends are correctly mapped to accelerated vs
base rewards — i.e. that a narrow accelerator (a specific brand, portal, weekend, or "select"
merchant set) isn't being credited as if it applied to a whole broad category (all online, all
dining, all base, etc.), and that point values / caps are realistic.

This matters because the recommender ranks on `estimatedNetValue`, so an over-broad accelerator or
an over-valued point currency silently inflates a card up the list (see `lib/CLAUDE.md`).

## Workflow

1. **Run the audit script** ([scripts/audit-reward-categorization.ts](file:///C:/Users/manpr/Documents/Codex/2026-05-08/i-want-to-build-an-ai/scripts/audit-reward-categorization.ts)):

   ```bash
   npx tsx scripts/audit-reward-categorization.ts top 10     # top N ranked cards
   npx tsx scripts/audit-reward-categorization.ts <card-id>  # one card
   npx tsx scripts/audit-reward-categorization.ts hdfc       # every card in an issuer dir
   ```

2. **Read each card's blocks:**
   - `REWARD ROWS` — the raw rows (category, rate, cap, `displayCategory`/`displayRate`).
   - `VALUED BENEFITS` — milestones and joining/renewal valued benefits, with the card's point value.
   - `ROUTING` — what reward each spend category actually earns in the engine.
   - `FLAGS` — automatic warnings (see below).

3. **For every flag, open the card JSON and decide the fix** (the script flags, it does not fix).

## What the flags mean and how to fix

- **OVER-BROAD** — a broad category row (`online`/`dining`/`grocery`/`upi`/`amazon`) whose
  `displayCategory` names specific brands or conditions ("weekend", "select", "Samsung",
  "Flipkart", "via SmartBuy/Reward Multiplier", "standalone", …). All of that category's spend is
  earning the accelerated rate.
  - **Fix:** recategorise the narrow row to `"partner merchants"` (a narrow accelerator) and add
    `acceleratedShare` for the affected categories so only a realistic slice earns it — e.g.
    `"acceleratedShare": { "online": 0.5, "grocery": 0 }`. See Titan, Samsung, the Amex Reward
    Multiplier cards, Flipkart Super Elite for precedents. Note the calculator tradeoff: a
    recategorised narrow row no longer shows on the generic category slider.

- **UNCAPPED HIGH RATE** — a non-base accelerated row (rate ≥ 5 points/₹100) with no `capMonthly`.
  Scales unbounded at the high (Rs 20L/30L) envelope tiers.
  - **Fix:** add the card's real `capMonthly` (in reward units/month) from official terms, or — if
    the accelerator is narrow — narrow the category + `acceleratedShare`. Confirm against the
    issuer's published cap before adding one.

- **MISSING POINT VALUE** — a non-cashback card whose `redemption` has no numeric value field, so
  the engine falls back to a rewardType rate (generic **Rs 1/point**, or a hard-coded rate like
  Marriott Bonvoy Rs 0.6). The flag reports the actual fallback used.
  - **Fix:** add the real per-point value to `redemption` (`statementBalanceValue`, `ecosystemValue`,
    `airMilesValue`, `travelPortalValue`, or a `transferPartnerValuations` entry). For brand-locked
    currencies also set `rewardLiquidity`/`rewardLiquidityFactor`.

### Joining / milestone benefit flags

These check that point/mile-denominated milestones and joining/renewal benefits are valued
consistently and filed in the right bucket. A benefit's rupee `value` feeds `estimatedNetValue`
alongside rewards, so a point earned via a milestone should be worth the same as one earned via
spend.

- **BENEFIT VALUE MISMATCH** — a milestone or joining/renewal benefit whose label grants *N*
  points/miles, but whose stored `value` differs by >15% from *N × the card's own point value*.
  Example: a "15,000 Bonvoy Points" free night valued at Rs 7,500 when Bonvoy points are Rs 0.6 (it
  should be Rs 9,000); or Etihad "4,000 bonus miles" valued at Rs 4,000 (face) when the card values
  miles at Rs 0.8 (should be Rs 3,200).
  - **Fix:** set `value` to *N × point value*. Keep it consistent with the same currency's
    `redemption` value / `rewardLiquidityFactor`.

- **UNVALUED POINTS BENEFIT** — a points/miles benefit stored with `value: 0` whose figure isn't
  positively valued elsewhere on the card (so it's genuinely uncounted, not a deliberate
  duplicate-avoidance zero).
  - **Fix:** value it, or confirm it is intentionally excluded (e.g. truly text-only).

- **SOFT PERK VALUED** — an airline/hotel **tier / status / upgrade** benefit carrying a rupee
  `value`. Policy is to leave these **text-only** (`value: 0`) since they're not reliably monetised.
  - **Fix:** set `value: 0` unless there's a defensible rupee basis (see the
    [milestones-no-value policy](file:///C:/Users/manpr/.claude/projects/C--Users-manpr-Documents-Codex-2026-05-08-i-want-to-build-an-ai/memory/milestones-no-value-cases.md)).

- **MISFILED RECURRING JOINING** — a `joiningBenefitsValued` entry whose text reads as recurring
  (annual fee levy, anniversary, "every year"). Joining benefits are **amortized over 3 years**
  (`joiningBenefitAmortizationYears`), so a yearly perk filed there is credited at only ~1/3 of its
  value. Example: the HDFC Marriott Free Night granted on every fee levy.
  - **Fix:** move it to `renewalBenefitsValued` (counted in full each year) and zero the joining
    entry so it isn't double-counted.

## Caveats / known blind spots

- The UNCAPPED-RATE flag is keyed on the points-per-₹100 `rate` (≥ 5), so it **misses high
  point-value cards** where a low rate × a high point value is still a big effective %. Example:
  HSBC Premier base is `rate 3` but at Accor Rs 2/point that's ~6% uncapped — not auto-flagged.
  Always also eyeball the `ROUTING` block and the point value for the leaders.
- A flag is a prompt to investigate, not proof of a bug — some uncapped/broad rows are genuinely
  correct (e.g. a flat all-spend base). Verify against the card's official terms before editing,
  and run `npm run validate:cards` + `npm test` after any change.

## After fixing

Run `npm run validate:cards` and `npm test`; reward/ranking changes shift the golden snapshots
(`tests/__snapshots__/*.snap`) — review the diff, then update with `npx vitest run <file> -u`.
