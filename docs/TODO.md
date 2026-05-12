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
- [ ] Improve RPM through higher-intent content, ad placement strategy, and better page-level monetization.
- [ ] Add affiliate link support per card, including tracking metadata and fallback apply URLs.
- [ ] Add reverse indexes for fast lookup by issuer, tags, network, reward category, and popularity.

## ICICI Bank Card Ingestion

Top ICICI cards added: Amazon Pay ICICI Bank Credit Card, Emeralde Private Metal, Emeralde, Sapphiro, Rubyx, Coral, Platinum Chip, MakeMyTrip, HPCL Super Saver, Adani One Signature, and Adani One Platinum.

### Remaining ICICI Cards To Verify Later

- [ ] MakeMyTrip ICICI Bank Signature Credit Card: official ICICI page says applications are no longer accepted for older Signature variant, verify before adding
- [ ] MakeMyTrip ICICI Bank Platinum Credit Card: official ICICI page says applications are no longer accepted for older Platinum variant, verify before adding
- [ ] Manchester United Platinum Credit Card
- [ ] Manchester United Signature Credit Card
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

High-priority YES BANK cards added from official YES BANK and partner sources: MARQUEE, RESERV, YES First Preferred, ELITE+, SELECT, ACE, Kiwi, PaisaSave, PaisaSave RuPay, POP-CLUB, ANQ Phi, and Klick RuPay.

### Remaining YES BANK Cards To Verify Later

- [ ] YES BANK Uni Credit Card
- [ ] YES BANK Uni RuPay Credit Card
- [ ] YES BANK FREO Credit Card
- [ ] YES BANK FREO RuPay Credit Card
- [ ] YES BANK Rio Credit Card
- [ ] YES BANK Rio virtual variant, if it should be modeled separately from the standard Rio entry
- [ ] YES BANK ANQ Pi Credit Card
- [ ] FinBooster Credit Card
- [ ] FinBooster RuPay Credit Card
- [ ] YES Prosperity Cashback Plus Credit Card
- [ ] YES Prosperity Cashback Credit Card
- [ ] YES Prosperity Rewards Credit Card
- [ ] Re-verify Rio fee structure because current YES docs show conflicting annual-fee treatment across different PDF sets
- [ ] Keep invite-only, discontinued, legacy-only, and business-only variants separate unless requested

## Kotak Mahindra Bank Card Ingestion

Top Kotak cards added from official Kotak pages and official Kotak terms: IndianOil Kotak, Kotak Cashback+, Kotak UPI RuPay, League Platinum, Zen Signature, White, PVR INOX Kotak, Kotak 811, 811 Dream Different, and PVR Kotak Platinum.

### Remaining Kotak Cards To Verify Later

- [ ] Kotak Air+ Credit Card
- [ ] Solitaire Business Credit Card
- [ ] Kotak Biz Edge Credit Card
- [ ] Kotak Purchase Credit Card

### Skip Unless Legacy Coverage Is Requested

- [ ] IndiGo Kotak Credit Card: official Kotak page currently labels it discontinued
- [ ] IndiGo Kotak XL Credit Card and older 6E Rewards naming overlap should be verified before adding

## RBL Bank Card Ingestion

Top RBL cards added from official RBL pages: ShopRite, Cookies, PLAY, World Safari, Platinum Delight, Platinum Maxima Plus, Icon, World Max, Patanjali Swarn, and Patanjali Vishisht.

### Remaining RBL Cards To Verify Later

- [ ] BookMyShow Play Credit Card naming overlap against current RBL PLAY page should be verified before adding as a separate entry
- [ ] RBL Bank IRCTC Credit Card
- [ ] RBL Bank Popcorn Credit Card
- [ ] RBL Bank SaveMax Credit Card
- [ ] RBL Bank MyCard and MyCard Plus, if still actively open for new applications
- [ ] Bajaj Finserv RBL Bank SuperCard variants, if we decide to add card-family / fintech-partner coverage beyond the current mainstream batch

## IndusInd Bank Card Ingestion

Top IndusInd cards added from official IndusInd pages and current benefit/MITC materials: Platinum RuPay, Legend, EazyDiner, EazyDiner Platinum, Pinnacle, Nexxt, Tiger, Platinum Aura Edge, Celesta, and Indulge.

### Remaining IndusInd Cards To Verify Later

- [ ] Samman RuPay Credit Card
- [ ] Solitaire Credit Card
- [ ] Duo Card, only if we decide mixed debit-credit products belong in scope
- [ ] Older Signature / Iconia / Platinum Visa family pages appear to exist for legacy cardholders and should be kept out unless legacy coverage is requested

## Equitas Card Ingestion

Active Equitas Small Finance Bank consumer cards added from official Equitas card surfaces: Ultima, Tiger, and Premio.

- [ ] Re-verify current Equitas fee and benefit docs from official MITC/KFS sources when better public PDFs are surfaced
- [ ] Add any additional active Equitas card variants only if they are separately marketed and open for application

## Federal Bank Card Ingestion

Scapia Federal Credit Card added from official Federal Bank and Scapia sources. Also added Federal Bank Signet, Imperio, Celesta, and Wave from official Federal Bank card surfaces.

### Remaining Federal Bank Cards To Verify Later

- [ ] Federal Bank OneCard variants, if active and open for application

## OneCard Partner Issuers

Generic OneCard entry added from official OneCard product and FAQ pages, covering the multi-bank issued One Credit Card currently offered through partner issuers such as BOBCARD, CSB Bank, Federal Bank, SBM Bank, South Indian Bank and Indian Bank.

### Remaining OneCard To Verify Later

- [ ] Add bank-specific OneCard variants separately only if issuer-level product differences become material enough for separate entries

## Standard Chartered Card Ingestion

Top Standard Chartered India cards added from official product pages, FAQs and tariff tables: Rewards, Smart, Ultimate, EaseMyTrip, Platinum Rewards, Super Value Titanium, Manhattan Platinum, DigiSmart, Priority Visa Infinite, and Beyond.

### Remaining Standard Chartered Cards To Verify Later

- [ ] Emirates World Credit Card, only if still actively marketed in India and not legacy-only
- [ ] Any instant-card-only or pre-approved-only Standard Chartered variants that should be modeled separately from the mainstream cards
- [ ] Re-verify Manhattan Platinum from a direct product page if Standard Chartered restores a clean dedicated India page instead of only indexed/tariff references

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
