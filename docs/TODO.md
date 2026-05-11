# TODO

## Axis Card Ingestion

Continue adding active Axis cards from official Axis pages. Keep the current workflow:

1. Verify card status and details from official Axis source.
2. Add one card entry to the relevant issuer file under `data/cards/`.
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
- [ ] Add a basic Ask AI flow over the merged in-memory card data from `data/cards/`.
- [ ] Add a manual approval workflow for community/news signals before updating card data.
- [ ] Add advertisement placements and policy-safe ad slot handling.
- [ ] Add affiliate link support per card, including tracking metadata and fallback apply URLs.
- [ ] Add reverse indexes for fast lookup by issuer, tags, network, reward category, and popularity.

## ICICI Bank Card Ingestion

Top ICICI cards added: Amazon Pay ICICI Bank Credit Card, Emeralde Private Metal, Emeralde, Sapphiro, Rubyx, Coral, Platinum Chip, MakeMyTrip, HPCL Super Saver, Adani One Signature, and Adani One Platinum.

### Remaining ICICI Cards To Verify Later

- [ ] Times Black ICICI Bank Credit Card
- [ ] Coral RuPay Credit Card as a separate entry, if needed beyond the combined Coral entry
- [ ] Sapphiro RuPay Credit Card as a separate entry, if needed beyond the combined Sapphiro entry
- [ ] MakeMyTrip ICICI Bank Signature Credit Card: official ICICI page says applications are no longer accepted for older Signature variant, verify before adding
- [ ] MakeMyTrip ICICI Bank Platinum Credit Card: official ICICI page says applications are no longer accepted for older Platinum variant, verify before adding
- [ ] Manchester United Platinum Credit Card
- [ ] Manchester United Signature Credit Card
- [ ] HPCL Coral Credit Card
- [ ] Accelero Credit Card
- [ ] Mine Credit Card
- [ ] Expressions Credit Card
- [ ] Instant Platinum / Gold / FD-backed ICICI cards
- [ ] Business, corporate, invite-only, and discontinued ICICI variants

## Bank of Baroda Card Ingestion

High-priority consumer Bank of Baroda / BOBCARD entries added from official Bank of Baroda pages: ETERNA, PREMIER, SELECT, EASY, HPCL ENERGIE, IRCTC BOBCARD, and Snapdeal BOBCARD.

### Remaining Bank of Baroda Cards To Verify Later

- [ ] BOBCARD TIARA
- [ ] BOBCARD PRIME
- [ ] BOBCARD CORPORATE
- [ ] BOBCARD EMPOWER
- [ ] Nainital RENAISSANCE BOBCARD
- [ ] ICAI Exclusive BOBCARD
- [ ] ICAI Select BOBCARD
- [ ] ICSI Diamond BOBCARD
- [ ] CMA One BOBCARD
- [ ] Indian Army Yoddha BOBCARD
- [ ] Indian Navy Varunah BOBCARD
- [ ] ICG Rakshamah BOBCARD
- [ ] Assam Rifles The Sentinel BOBCARD
- [ ] BoB Vikram Card
- [ ] FD-backed secure variants: EASY Secure, SELECT Secure, PREMIER Secure, ETERNA Secure

## Yes Bank Card Ingestion

High-priority YES BANK cards added from official YES BANK and Kiwi sources: MARQUEE, RESERV, YES First Preferred, ELITE+, SELECT, ACE, and Kiwi.

### Remaining YES BANK Cards To Verify Later

- [ ] YES BANK Paisabazaar PaisaSave Credit Card
- [ ] YES BANK Paisabazaar PaisaSave RuPay Credit Card
- [ ] YES BANK POP-CLUB Credit Card
- [ ] YES BANK Uni Credit Card
- [ ] YES BANK FREO Credit Card
- [ ] YES BANK Rio Credit Card
- [ ] YES BANK ANQ Phi Credit Card
- [ ] YES BANK ANQ Pi Credit Card
- [ ] FinBooster Credit Card
- [ ] FinBooster RuPay Credit Card
- [ ] YES Prosperity Cashback Plus Credit Card
- [ ] YES Prosperity Cashback Credit Card
- [ ] Keep invite-only, discontinued, legacy-only, and business-only variants separate unless requested

## Equitas Card Ingestion

Saved for later as requested. Start by confirming whether Equitas Small Finance Bank currently has active credit-card products or partner/co-branded cards open for application.

- [ ] List active Equitas credit-card products from official source
- [ ] Add official active products to the relevant issuer file under `data/cards/`
- [ ] Record unavailable/discontinued status in notes if there are no active cards

## Federal Bank Card Ingestion

Scapia Federal Credit Card added from official Federal Bank and Scapia sources.

### Remaining Federal Bank Cards To Verify Later

- [ ] Federal Bank Imperio Credit Card
- [ ] Federal Bank Celesta Credit Card
- [ ] Federal Bank Signet Credit Card
- [ ] Federal Bank Wave Credit Card
- [ ] Federal Bank OneCard variants, if active and open for application

## American Express Card Ingestion

High-priority American Express India personal cards added from official American Express pages: Platinum Travel, Membership Rewards, Gold Card, SmartEarn, Platinum Reserve, and Platinum Card.

### Remaining American Express Cards To Verify Later

- [ ] Any currently open business/corporate American Express cards, only if business-card coverage is requested
- [ ] Any limited-time proprietary card application pauses or reopenings, because older Amex pages and current index pages can show different availability language

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
