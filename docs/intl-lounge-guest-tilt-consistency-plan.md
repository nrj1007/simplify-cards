# Plan: International Lounge Guest Tilt Consistency

## Context
For general/domestic lounge queries (`wantsLounge = true`), we calculate the total value of lounge access (including domestic, international, separate guest visits, and shared pool uplifts) in a standard unit system and scale it by `LOUNGE_QUERY_VALUE_WEIGHT` (currently `30`). This allows lounge-heavy cards (especially those with guest access) to overcome general net-value differences and rank at the top.

However, for international lounge queries (`wantsInternationalLounge = true`):
1. Guest and pool credit were previously either unvalued (on `fix/seo-cashback-comparison` branch) or added as unscaled flat values (in the Part B audit branch).
2. The lack of scaling by `LOUNGE_QUERY_VALUE_WEIGHT` meant that guest benefits (e.g. Axis Magnus Burgundy) could not overcome the net value advantage of no-guest premium cards (e.g. HDFC Infinia).

This plan ensures consistency by bringing the international lounge query path into the same scaled unit system as the general lounge query path.

## Proposed Changes

### 1. In `lib/recommend.ts`:
Modify the `wantsInternationalLounge` block inside `loungePreferenceBoost`:
- Value international lounge access using the standard international lounge weight `intlWeight` (720, or 360 if spend-gated).
- Calculate separate international guest access value using `GUEST_VISIT_WEIGHT = 2`.
- Calculate international shared pool uplift (+25% of the primary value).
- Sum these to get `travelIntlLoungeValue`.
- Scale the result by `loungeValueWeight` (which is `LOUNGE_QUERY_VALUE_WEIGHT = 30` during lounge queries).
- Add the broad `score * 300` relevance bonus.

```typescript
  if (wantsInternationalLounge) {
    const intlScore = internationalLoungeScore(card);
    if (intlScore <= 0) return -15000;

    const hasIntlSpendConditions = getMeaningfulLoungeConditions(card, "international").some((cond) => {
      const lower = cond.toLowerCase();
      return lower.includes("spend") || lower.includes("unlock") || lower.includes("subject to") || lower.includes("previous calendar quarter") || lower.includes("spending");
    });
    const intlWeight = hasIntlSpendConditions ? 360 : 720;

    const primaryIntlValue = intlScore * intlWeight;
    const separateIntlGuest = (card.loungeGuestInternational ?? 0) * intlWeight * GUEST_VISIT_WEIGHT;
    const poolUplift = card.loungeGuestSharedPool ? primaryIntlValue * 0.25 : 0;

    const travelIntlLoungeValue = primaryIntlValue + poolUplift + separateIntlGuest;
    const loungeValueWeight = isCategoryFocused ? 0 : (wantsLounge ? LOUNGE_QUERY_VALUE_WEIGHT : 0.5);

    return Math.round(travelIntlLoungeValue * loungeValueWeight) + score * 300;
  }
```

### 2. Port other Part B leftovers to `lib/recommend.ts`:
Make sure the other consistency improvements are present:
- Define `const GUEST_VISIT_WEIGHT = 2;` at module level and reuse it.
- Fix `domAccess` calculation to handle `combinedLoungeAccess` properly.
- Gate the travel branch boost check off when `wantsLounge` is true.

## Verification
1. Run `npm test` to verify all test suites.
2. Regenerate test snapshots (`npx vitest run -u`) and verify the diff in `ranking-golden` and `seo-landing-golden` to ensure the ranking shifts are correct and isolated to international lounge queries.
3. Run `npm run lint` and `npm run validate:cards`.
