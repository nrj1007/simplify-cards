# TODO

## Axis Card Ingestion

Continue adding active Axis cards from official Axis pages. Keep the current workflow:

1. Verify card status and details from official Axis source.
2. Add one card entry to `data/cards.json`.
3. Run validation and TypeScript checks.
4. Commit and push that card separately.

Validation commands:

```powershell
.\tools\node\node.exe .\.tmp\validate-cards.js
.\tools\node\node.exe .\node_modules\typescript\bin\tsc --noEmit
```

### Pending Active Axis Cards

- [ ] Axis Bank Pride Platinum Credit Card
- [ ] Axis Bank Pride Signature Credit Card
- [ ] Axis Bank Shoppers Stop Credit Card
- [ ] Axis Bank Signature Credit Card with Lifestyle Benefits
- [ ] SpiceJet Axis Bank Voyage Black Credit Card
- [ ] SpiceJet Axis Bank Voyage Credit Card
- [ ] Titanium Smart Traveler Credit Card
- [ ] Axis Bank MY Zone Easy Credit Card

### Skip Unless Legacy Coverage Is Requested

These are listed or have official pages, but should not be added as active-new-application cards unless the user explicitly asks for legacy/existing-cardholder coverage.

- Samsung Axis Bank Infinite Credit Card: official Axis page says applications are not currently accepted and directs users to Samsung Axis Bank Signature Credit Card instead.
- AXIS BANK VISTARA Credit Card
- AXIS BANK VISTARA SIGNATURE Credit Card
- Axis Bank Vistara Infinite Credit Card

## Product Work After Axis

- [ ] Improve card detail UI for fees, caps, exclusions, and source trust.
- [ ] Add filters for issuer, cashback, travel, lounge, fuel, UPI, low-fee, and secured cards.
- [ ] Add a basic Ask AI flow over `data/cards.json`.
- [ ] Add a manual approval workflow for community/news signals before updating card data.

## IDFC FIRST Bank Card Ingestion

High-priority IDFC batch was added together in commit work after `1774c40`, including FIRST Millennia, FIRST Classic, FIRST Select, FIRST Wealth, FIRST WOW cleanup, FIRST EA₹N, FIRST Power, FIRST Power+, Ashva, Mayura, and IndiGo IDFC FIRST.

### Remaining IDFC Cards

- [ ] Hello Cashback Credit Card
- [ ] FIRST Digital Credit Card
- [ ] FIRST WOW! Black Credit Card
- [ ] FIRST SWYP Credit Card
- [ ] LIC Classic Credit Card
- [ ] LIC Select Credit Card
- [ ] Diamond Reserve Credit Card

### Skip Unless Specifically Requested

- [ ] Gaj Credit Card: invite-only
- [ ] FIRST Private Credit Card: invite-only
- [ ] Business Max Credit Card
- [ ] Business Multiplier Credit Card
- [ ] FIRST Corporate Credit Card
- [ ] FIRST Purchase Credit Card
- [ ] FIRST Business Credit Card
