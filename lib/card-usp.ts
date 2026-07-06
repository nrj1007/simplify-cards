import type { CreditCard } from "./types";

export interface CardUSPItem {
  cardKey: string;
  cardName: string;
  usp: string;
  shortUsp: string;
}

export const creditCardUSPs: CardUSPItem[] = [
  {
    cardKey: "hdfc-infinia-metal",
    cardName: "HDFC Bank Infinia Metal Credit Card",
    usp: "A super-premium all-rounder for high spenders who want strong rewards, luxury travel benefits, premium hotel offers, and high-value redemptions through HDFC SmartBuy.",
    shortUsp: "Luxury all-rounder"
  },
  {
    cardKey: "hdfc-diners-club-black-metal",
    cardName: "HDFC Diners Club Black Metal Credit Card",
    usp: "Best suited for premium users who want high rewards, milestone benefits, travel perks, and a strong mix of lifestyle privileges at a lower fee than many ultra-premium cards.",
    shortUsp: "Premium rewards"
  },
  {
    cardKey: "axis-atlas",
    cardName: "Axis Bank Atlas Credit Card",
    usp: "A strong travel-first card for users who prefer airline and hotel points, with EDGE Miles, tier-based benefits, and flexible transfer partners.",
    shortUsp: "Miles powerhouse"
  },
  {
    cardKey: "axis-magnus-burgundy",
    cardName: "Axis Bank Magnus Burgundy Credit Card",
    usp: "Built for high-value Axis Burgundy customers who want premium travel rewards, luxury privileges, and accelerated value on large monthly spends.",
    shortUsp: "High-spend luxury"
  },
  {
    cardKey: "axis-burgundy-private",
    cardName: "Axis Bank Burgundy Private Credit Card",
    usp: "An ultra-premium card for private banking customers who want top-tier lifestyle access, concierge benefits, premium travel privileges, and strong relationship-led value.",
    shortUsp: "Private banking elite"
  },
  {
    cardKey: "icici-emeralde-private-metal",
    cardName: "ICICI Emeralde Private Metal Credit Card",
    usp: "A premium lifestyle card for users who want simple rewards, luxury travel benefits, golf, concierge, and high-end ICICI banking privileges in one package.",
    shortUsp: "Simple luxury"
  },
  {
    cardKey: "sbi-aurum",
    cardName: "SBI Aurum Credit Card",
    usp: "A luxury card for affluent SBI customers who value concierge service, premium travel access, hotel benefits, golf privileges, and high-end lifestyle experiences.",
    shortUsp: "SBI luxury"
  },
  {
    cardKey: "amex-platinum-charge",
    cardName: "American Express Platinum Card",
    usp: "Best for luxury travellers who value premium hotel status, airport lounge access, concierge service, fine dining offers, and global lifestyle privileges.",
    shortUsp: "Global luxury"
  },
  {
    cardKey: "amex-platinum-travel",
    cardName: "American Express Platinum Travel Credit Card",
    usp: "A milestone-focused travel card for users who can hit annual spend targets and want travel vouchers, Membership Rewards points, and premium Amex service.",
    shortUsp: "Milestone travel"
  },
  {
    cardKey: "amex-mrcc",
    cardName: "American Express Membership Rewards Credit Card",
    usp: "Great for disciplined monthly spenders who want predictable reward points through monthly milestones and flexible redemption options.",
    shortUsp: "Monthly rewards"
  },
  {
    cardKey: "hdfc-regalia-gold",
    cardName: "HDFC Bank Regalia Gold Credit Card",
    usp: "A balanced premium card for users who want travel, lounge access, dining, brand vouchers, and rewards without entering super-premium fee territory.",
    shortUsp: "Balanced premium"
  },
  {
    cardKey: "hdfc-marriott-bonvoy",
    cardName: "HDFC Bank Marriott Bonvoy Credit Card",
    usp: "Best for Marriott loyalists who want hotel-focused rewards, complimentary Marriott benefits, and value from stays across Marriott properties.",
    shortUsp: "Marriott loyalists"
  },
  {
    cardKey: "hsbc-travelone",
    cardName: "HSBC TravelOne Credit Card",
    usp: "A travel rewards card for users who want airline and hotel transfer options, lounge benefits, and a clean travel-focused rewards structure.",
    shortUsp: "Transfer-friendly travel"
  },
  {
    cardKey: "hsbc-premier",
    cardName: "HSBC Premier Credit Card",
    usp: "A premium relationship card for HSBC Premier customers who want travel, lifestyle, dining, and international banking-linked privileges.",
    shortUsp: "Premier banking perks"
  },
  {
    cardKey: "sbi-cashback",
    cardName: "SBI Cashback Credit Card",
    usp: "One of the simplest cashback cards for online shoppers who prefer direct savings over complicated reward point conversions.",
    shortUsp: "Online cashback"
  },
  {
    cardKey: "amazon-pay-icici",
    cardName: "Amazon Pay ICICI Bank Credit Card",
    usp: "A practical lifetime-free card for Amazon users who want straightforward cashback on Amazon, partner merchants, and everyday spends.",
    shortUsp: "Amazon savings"
  },
  {
    cardKey: "axis-ace",
    cardName: "Axis Bank Ace Credit Card",
    usp: "A simple cashback card for users who want strong value on bill payments, utilities, and everyday offline spends without complex redemption rules.",
    shortUsp: "Bill-pay cashback"
  },
  {
    cardKey: "flipkart-axis",
    cardName: "Flipkart Axis Bank Credit Card",
    usp: "Best for Flipkart-first shoppers who want direct cashback on Flipkart, selected partner brands, and regular everyday spending.",
    shortUsp: "Flipkart cashback"
  },
  {
    cardKey: "hdfc-millennia",
    cardName: "HDFC Bank Millennia Credit Card",
    usp: "A good lifestyle card for young online spenders who frequently shop across popular digital brands and want simple cashback-style rewards.",
    shortUsp: "Digital lifestyle"
  },
  {
    cardKey: "tata-neu-infinity",
    cardName: "Tata Neu Infinity HDFC Bank Credit Card",
    usp: "Best for Tata ecosystem users who spend on BigBasket, Croma, Tata CLiQ, IHCL, Air India, and UPI through the Tata Neu app.",
    shortUsp: "Tata ecosystem"
  },
  {
    cardKey: "kiwi-rupay",
    cardName: "Kiwi RuPay Credit Card",
    usp: "A UPI-first credit card for users who want rewards on everyday QR payments while keeping the convenience of UPI.",
    shortUsp: "UPI rewards"
  },
  {
    cardKey: "scapia-federal",
    cardName: "Scapia Federal Bank Credit Card",
    usp: "A travel-friendly card for users who want zero forex markup, simple travel rewards, and value on international spends.",
    shortUsp: "Zero-forex travel"
  },
  {
    cardKey: "au-ixigo",
    cardName: "AU ixigo Credit Card",
    usp: "A budget travel card for users who book flights, trains, buses, and hotels through ixigo and want travel-focused savings.",
    shortUsp: "Budget travel"
  },
  {
    cardKey: "idfc-first-wealth",
    cardName: "IDFC FIRST Wealth Credit Card",
    usp: "A no-fuss premium card for users who want decent lifestyle benefits, airport lounge access, low forex markup, and no annual fee pressure.",
    shortUsp: "Low-cost premium"
  },
  {
    cardKey: "yes-marquee",
    cardName: "YES Bank Marquee Credit Card",
    usp: "A premium rewards card for high spenders who want strong reward earning, travel benefits, lifestyle privileges, and milestone-led value.",
    shortUsp: "Premium rewards"
  },
  {
    cardKey: "titan-sbi",
    cardName: "Titan Credit Card",
    usp: "Best for shopping within the Titan ecosystem (Tanishq, Mia, CaratLane, and World of Titan) with up to 7.5% cashback, domestic & international lounge access, and high-value milestone rewards.",
    shortUsp: "Titan ecosystem cashback & lounge access"
  }
,
  {
    cardKey: "kotak-solitaire",
    cardName: "Solitaire Credit Card",
    usp: "A value-driven credit card from Kotak Mahindra Bank optimized for luxury, travel, and lounge, featuring lifetime-free zero annual fee.",
    shortUsp: "Luxury & Travel card"
  },
  {
    cardKey: "equitas-selfe",
    cardName: "Selfe Credit Card",
    usp: "A value-driven credit card from Equitas Small Finance Bank optimized for dining, grocery, and online, featuring complimentary airport lounge access.",
    shortUsp: "Dining & Grocery card"
  },
  {
    cardKey: "sc-ultimate",
    cardName: "Ultimate Credit Card",
    usp: "A value-driven credit card from Standard Chartered optimized for travel, lounge, and golf, featuring complimentary airport lounge access.",
    shortUsp: "Travel & Lounge card"
  },
  {
    cardKey: "axis-magnus",
    cardName: "MAGNUS Credit Card",
    usp: "A value-driven credit card from Axis Bank optimized for travel, lounge, and premium.",
    shortUsp: "Travel & Lounge card"
  },
  {
    cardKey: "phonepe-sbi-select-black",
    cardName: "PhonePe SELECT BLACK Credit Card",
    usp: "A value-driven credit card from SBI Card optimized for phonepe, online shopping, and upi, featuring complimentary airport lounge access.",
    shortUsp: "Phonepe & Online Shopping card"
  },
  {
    cardKey: "amex-gold",
    cardName: "Gold Credit Card",
    usp: "A value-driven credit card from American Express optimized for charge card, membership rewards, and monthly milestones.",
    shortUsp: "Charge Card & Membership Rewards card"
  },
  {
    cardKey: "hdfc-phonepe-ultimo",
    cardName: "PhonePe Ultimo Credit Card",
    usp: "A value-driven credit card from HDFC Bank optimized for phonepe, upi, and utilities, featuring complimentary airport lounge access.",
    shortUsp: "Phonepe & Upi card"
  },
  {
    cardKey: "sbi-card-prime",
    cardName: "PRIME Credit Card",
    usp: "A value-driven credit card from SBI Card optimized for utility bills, grocery, and dining, featuring complimentary airport lounge access.",
    shortUsp: "Utility Bills & Grocery card"
  },
  {
    cardKey: "sbi-card-pulse",
    cardName: "PULSE Credit Card",
    usp: "A value-driven credit card from SBI Card optimized for health, pharmacy, and dining, featuring complimentary airport lounge access.",
    shortUsp: "Health & Pharmacy card"
  },
  {
    cardKey: "sc-rewards",
    cardName: "Rewards Credit Card",
    usp: "A value-driven credit card from Standard Chartered optimized for rewards, retail, and lounge, featuring complimentary airport lounge access.",
    shortUsp: "Rewards & Retail card"
  },
  {
    cardKey: "amex-smartearn",
    cardName: "SmartEarn Credit Card",
    usp: "A value-driven credit card from American Express optimized for online, entry level, and shopping.",
    shortUsp: "Online & Entry Level card"
  },
  {
    cardKey: "sc-beyond",
    cardName: "Beyond Credit Card",
    usp: "A value-driven credit card from Standard Chartered optimized for priority banking, travel, and lounge.",
    shortUsp: "Priority Banking & Travel card"
  },
  {
    cardKey: "indusind-eazydiner",
    cardName: "EazyDiner Credit Card",
    usp: "A value-driven credit card from IndusInd Bank optimized for dining, movies, and travel.",
    shortUsp: "Dining & Movies card"
  },
  {
    cardKey: "indusind-eazydiner-platinum",
    cardName: "EazyDiner Platinum Credit Card",
    usp: "A value-driven credit card from IndusInd Bank optimized for dining, lifetime free, and entry level, featuring lifetime-free zero annual fee.",
    shortUsp: "Dining & Lifetime Free card"
  },
  {
    cardKey: "hsbc-live-plus",
    cardName: "Live+ Credit Card",
    usp: "A value-driven credit card from HSBC Bank optimized for dining, food delivery, and grocery, featuring complimentary airport lounge access.",
    shortUsp: "Dining & Food Delivery card"
  },
  {
    cardKey: "hsbc-rupay-cashback",
    cardName: "RuPay Cashback Credit Card",
    usp: "A value-driven credit card from HSBC Bank optimized for rupay, upi, and cashback, featuring complimentary airport lounge access.",
    shortUsp: "Rupay & Upi card"
  },
  {
    cardKey: "yes-paisabazaar-paisasave",
    cardName: "Paisabazaar PaisaSave Credit Card",
    usp: "A value-driven credit card from YES Bank optimized for cashback, travel, and dining.",
    shortUsp: "Cashback & Travel card"
  },
  {
    cardKey: "bobcard-eterna",
    cardName: "ETERNA Credit Card",
    usp: "A value-driven credit card from Bank of Baroda optimized for travel, dining, and online.",
    shortUsp: "Travel & Dining card"
  },
  {
    cardKey: "yes-first-preferred",
    cardName: "First Preferred Credit Card",
    usp: "A value-driven credit card from YES Bank optimized for travel, dining, and lounge, featuring complimentary airport lounge access.",
    shortUsp: "Travel & Dining card"
  },
  {
    cardKey: "landmark-rewards-sbi-prime",
    cardName: "Landmark Rewards PRIME Credit Card",
    usp: "A value-driven credit card from SBI Card optimized for shopping, lifestyle, and dining, featuring complimentary airport lounge access.",
    shortUsp: "Shopping & Lifestyle card"
  },
  {
    cardKey: "rbl-icon",
    cardName: "Icon Credit Card",
    usp: "A value-driven credit card from RBL Bank optimized for dining, travel, and lounge, featuring complimentary airport lounge access.",
    shortUsp: "Dining & Travel card"
  },
  {
    cardKey: "kotak-indianoil",
    cardName: "IndianOil Credit Card",
    usp: "A value-driven credit card from Kotak Mahindra Bank optimized for fuel, grocery, and dining.",
    shortUsp: "Fuel & Grocery card"
  },
  {
    cardKey: "icici-adani-one-signature",
    cardName: "Adani One Signature Credit Card",
    usp: "A value-driven credit card from ICICI Bank optimized for adani, airport, and travel, featuring complimentary airport lounge access.",
    shortUsp: "Adani & Airport card"
  },
  {
    cardKey: "axis-horizon",
    cardName: "HORIZON Credit Card",
    usp: "A value-driven credit card from Axis Bank optimized for travel, airlines, and travel edge, featuring complimentary airport lounge access.",
    shortUsp: "Travel & Airlines card"
  },
  {
    cardKey: "bobcard-etihad-guest-premium",
    cardName: "Etihad Guest Premium Credit Card",
    usp: "A value-driven credit card from Bank of Baroda optimized for travel, etihad, and flights, featuring complimentary airport lounge access.",
    shortUsp: "Travel & Etihad card"
  },
  {
    cardKey: "sbi-card-miles-elite",
    cardName: "MILES ELITE Credit Card",
    usp: "A value-driven credit card from SBI Card optimized for travel, air miles, and hotel points, featuring complimentary airport lounge access.",
    shortUsp: "Travel & Air Miles card"
  },
  {
    cardKey: "bobcard-etihad-guest",
    cardName: "Etihad Guest Credit Card",
    usp: "A value-driven credit card from Bank of Baroda optimized for travel, etihad, and flights, featuring complimentary airport lounge access.",
    shortUsp: "Travel & Etihad card"
  },
  {
    cardKey: "idfc-mayura",
    cardName: "Mayura Credit Card",
    usp: "A value-driven credit card from IDFC FIRST Bank optimized for metal card, zero forex, and lounge, featuring complimentary airport lounge access.",
    shortUsp: "Metal Card & Zero Forex card"
  },
  {
    cardKey: "reliance-sbi-prime",
    cardName: "Reliance PRIME Credit Card",
    usp: "A value-driven credit card from SBI Card optimized for reliance, shopping, and jiomart, featuring complimentary airport lounge access.",
    shortUsp: "Reliance & Shopping card"
  },
  {
    cardKey: "axis-airtel",
    cardName: "Airtel Credit Card",
    usp: "A value-driven credit card from Axis Bank optimized for airtel, utility bills, and zomato.",
    shortUsp: "Airtel & Utility Bills card"
  },
  {
    cardKey: "axis-fibe",
    cardName: "Fibe Credit Card",
    usp: "A value-driven credit card from Axis Bank optimized for cashback, food delivery, and entertainment, featuring complimentary airport lounge access and lifetime-free zero annual fee.",
    shortUsp: "Cashback & Food Delivery card"
  },
  {
    cardKey: "axis-privilege-easy",
    cardName: "Privilege Easy Credit Card",
    usp: "A value-driven credit card from Axis Bank optimized for secured card, fixed deposit, and rewards, featuring complimentary airport lounge access.",
    shortUsp: "Secured Card & Fixed Deposit card"
  },
  {
    cardKey: "axis-rewards",
    cardName: "REWARDS Credit Card",
    usp: "A value-driven credit card from Axis Bank optimized for apparel, departmental stores, and swiggy, featuring complimentary airport lounge access.",
    shortUsp: "Apparel & Departmental Stores card"
  },
  {
    cardKey: "axis-privilege",
    cardName: "PRIVILEGE Credit Card",
    usp: "A value-driven credit card from Axis Bank optimized for shopping, travel, and movies, featuring complimentary airport lounge access.",
    shortUsp: "Shopping & Travel card"
  },
  {
    cardKey: "axis-cashback",
    cardName: "Cashback Credit Card",
    usp: "A value-driven credit card from Axis Bank optimized for cashback, online spends, and retail.",
    shortUsp: "Cashback & Online Spends card"
  },
  {
    cardKey: "idfc-wow",
    cardName: "WOW! Credit Card",
    usp: "A value-driven credit card from IDFC FIRST Bank optimized for secured card, lifetime free, and forex, featuring lifetime-free zero annual fee.",
    shortUsp: "Secured Card & Lifetime Free card"
  },
  {
    cardKey: "rbl-world-safari",
    cardName: "World Safari Credit Card",
    usp: "A value-driven credit card from RBL Bank optimized for travel, low forex, and lounge, featuring complimentary airport lounge access.",
    shortUsp: "Travel & Low Forex card"
  },
  {
    cardKey: "idfc-ashva",
    cardName: "Ashva Credit Card",
    usp: "A value-driven credit card from IDFC FIRST Bank optimized for metal card, lifestyle, and lounge, featuring complimentary airport lounge access.",
    shortUsp: "Metal Card & Lifestyle card"
  },
  {
    cardKey: "icici-makemytrip",
    cardName: "MakeMyTrip Credit Card",
    usp: "A value-driven credit card from ICICI Bank optimized for travel, makemytrip, and low forex, featuring complimentary airport lounge access.",
    shortUsp: "Travel & Makemytrip card"
  },
  {
    cardKey: "indusind-pioneer-heritage-metal",
    cardName: "PIONEER Heritage Metal Credit Card",
    usp: "A value-driven credit card from IndusInd Bank optimized for luxury, travel, and lounge.",
    shortUsp: "Luxury & Travel card"
  },
  {
    cardKey: "kotak-white-reserve",
    cardName: "White Reserve Credit Card",
    usp: "A value-driven credit card from Kotak Mahindra Bank optimized for premium, travel, and lounge.",
    shortUsp: "Premium & Travel card"
  },
  {
    cardKey: "axis-reserve",
    cardName: "Reserve Credit Card",
    usp: "A value-driven credit card from Axis Bank optimized for ultra premium, travel, and hotels.",
    shortUsp: "Ultra Premium & Travel card"
  },
  {
    cardKey: "icici-times-black",
    cardName: "Times Black Credit Card",
    usp: "A value-driven credit card from ICICI Bank optimized for luxury, travel, and lounge.",
    shortUsp: "Luxury & Travel card"
  },
  {
    cardKey: "amex-platinum-reserve",
    cardName: "Platinum Reserve Credit Card",
    usp: "A value-driven credit card from American Express optimized for premium, lounge, and golf, featuring complimentary airport lounge access.",
    shortUsp: "Premium & Lounge card"
  },
  {
    cardKey: "axis-miles-and-more",
    cardName: "Miles and More Credit Card",
    usp: "A value-driven credit card from Axis Bank optimized for miles, lufthansa, and star alliance, featuring complimentary airport lounge access.",
    shortUsp: "Miles & Lufthansa card"
  },
  {
    cardKey: "axis-kwik",
    cardName: "Kwik Credit Card",
    usp: "A value-driven credit card from Axis Bank optimized for upi, rupay, and virtual card, featuring lifetime-free zero annual fee.",
    shortUsp: "Upi & Rupay card"
  },
  {
    cardKey: "axis-indianoil",
    cardName: "INDIANOIL Credit Card",
    usp: "A value-driven credit card from Axis Bank optimized for fuel, indianoil, and online shopping.",
    shortUsp: "Fuel & Indianoil card"
  },
  {
    cardKey: "axis-indianoil-easy",
    cardName: "IndianOil Easy Credit Card",
    usp: "A value-driven credit card from Axis Bank optimized for fuel, indianoil, and secured card, featuring lifetime-free zero annual fee.",
    shortUsp: "Fuel & Indianoil card"
  },
  {
    cardKey: "axis-indigo-premium",
    cardName: "IndiGo Premium Credit Card",
    usp: "A value-driven credit card from Axis Bank optimized for indigo, flights, and travel, featuring complimentary airport lounge access.",
    shortUsp: "Indigo & Flights card"
  },
  {
    cardKey: "hdfc-diners-club-privilege",
    cardName: "Diners Club Privilege Credit Card",
    usp: "A value-driven credit card from HDFC Bank optimized for dining, movies, and smartbuy, featuring complimentary airport lounge access.",
    shortUsp: "Dining & Movies card"
  },
  {
    cardKey: "hdfc-shoppers-stop-black",
    cardName: "Shoppers Stop BLACK Credit Card",
    usp: "A value-driven credit card from HDFC Bank optimized for shoppers stop, shopping, and premium lifestyle, featuring complimentary airport lounge access.",
    shortUsp: "Shoppers Stop & Shopping card"
  },
  {
    cardKey: "hdfc-irctc",
    cardName: "IRCTC Credit Card",
    usp: "A value-driven credit card from HDFC Bank optimized for train travel, irctc, and rail lounge.",
    shortUsp: "Train Travel & Irctc card"
  },
  {
    cardKey: "hdfc-tata-neu-plus",
    cardName: "Tata Neu Plus Credit Card",
    usp: "A value-driven credit card from HDFC Bank optimized for tata neu, tata brands, and upi, featuring complimentary airport lounge access.",
    shortUsp: "Tata Neu & Tata Brands card"
  },
  {
    cardKey: "hdfc-moneyback-plus",
    cardName: "MoneyBack+ Credit Card",
    usp: "A value-driven credit card from HDFC Bank optimized for household spends, shopping, and entry level rewards.",
    shortUsp: "Household Spends & Shopping card"
  },
  {
    cardKey: "hdfc-shoppers-stop",
    cardName: "Shoppers Stop Credit Card",
    usp: "A value-driven credit card from HDFC Bank optimized for shoppers stop, shopping, and entry level lifestyle.",
    shortUsp: "Shoppers Stop & Shopping card"
  },
  {
    cardKey: "hdfc-indianoil",
    cardName: "IndianOil Credit Card",
    usp: "A value-driven credit card from HDFC Bank optimized for fuel, groceries, and bill payments.",
    shortUsp: "Fuel & Groceries card"
  },
  {
    cardKey: "icici-adani-one-platinum",
    cardName: "Adani One Platinum Credit Card",
    usp: "A value-driven credit card from ICICI Bank optimized for adani, airport, and travel, featuring complimentary airport lounge access.",
    shortUsp: "Adani & Airport card"
  },
  {
    cardKey: "icici-coral-rupay",
    cardName: "Coral RuPay Credit Card",
    usp: "A value-driven credit card from ICICI Bank optimized for upi, movies, and railway lounge, featuring complimentary airport lounge access.",
    shortUsp: "Upi & Movies card"
  },
  {
    cardKey: "icici-coral",
    cardName: "Coral Credit Card",
    usp: "A value-driven credit card from ICICI Bank optimized for movies, railway lounge, and fuel, featuring complimentary airport lounge access.",
    shortUsp: "Movies & Railway Lounge card"
  },
  {
    cardKey: "icici-sapphiro",
    cardName: "Sapphiro Credit Card",
    usp: "A value-driven credit card from ICICI Bank optimized for premium, travel, and lounge, featuring complimentary airport lounge access.",
    shortUsp: "Premium & Travel card"
  },
  {
    cardKey: "icici-sapphiro-rupay",
    cardName: "Sapphiro RuPay Credit Card",
    usp: "A value-driven credit card from ICICI Bank optimized for premium, travel, and lounge, featuring complimentary airport lounge access.",
    shortUsp: "Premium & Travel card"
  },
  {
    cardKey: "icici-rubyx",
    cardName: "Rubyx Credit Card",
    usp: "A value-driven credit card from ICICI Bank optimized for lifestyle, movies, and lounge, featuring complimentary airport lounge access.",
    shortUsp: "Lifestyle & Movies card"
  },
  {
    cardKey: "icici-platinum-chip",
    cardName: "Platinum Chip Credit Card",
    usp: "A value-driven credit card from ICICI Bank optimized for lifetime free, entry level, and rewards, featuring lifetime-free zero annual fee.",
    shortUsp: "Lifetime Free & Entry Level card"
  },
  {
    cardKey: "icici-emeralde",
    cardName: "Emeralde Credit Card",
    usp: "A value-driven credit card from ICICI Bank optimized for premium, travel, and lounge.",
    shortUsp: "Premium & Travel card"
  },
  {
    cardKey: "krisflyer-sbi-apex",
    cardName: "KrisFlyer Apex Credit Card",
    usp: "A value-driven credit card from SBI Card optimized for singapore airlines, international travel, and travel, featuring complimentary airport lounge access.",
    shortUsp: "Singapore Airlines & International Travel card"
  },
  {
    cardKey: "sbi-card-elite",
    cardName: "ELITE Credit Card",
    usp: "A value-driven credit card from SBI Card optimized for premium rewards, dining, and grocery, featuring complimentary airport lounge access.",
    shortUsp: "Premium Rewards & Dining card"
  },
  {
    cardKey: "irctc-rupay-sbi",
    cardName: "IRCTC on RuPay Credit Card",
    usp: "Tailored for railway travellers, offering high rewards on train ticket bookings via the IRCTC app, combined with RuPay UPI compatibility and railway lounge access.",
    shortUsp: "IRCTC train bookings & UPI"
  },
  {
    cardKey: "tata-neu-plus-sbi",
    cardName: "Tata Neu Plus Credit Card",
    usp: "Ideal for Tata brand shoppers, offering value back as NeuCoins on BigBasket, Croma, Tata 1mg, and Tata CLiQ, along with RuPay UPI rewards and lounge access.",
    shortUsp: "Tata Neu ecosystem savings"
  },
  {
    cardKey: "irctc-sbi-platinum",
    cardName: "IRCTC Platinum Credit Card",
    usp: "Best for frequent railway travellers wanting value back on train ticket purchases through IRCTC, fuel surcharge waivers, and complimentary railway lounge visits.",
    shortUsp: "IRCTC train savings"
  },
  {
    cardKey: "shaurya-select-sbi",
    cardName: "Shaurya Select Credit Card",
    usp: "A dedicated card for defence personnel, providing accelerated rewards on Canteen Store Department (CSD) purchases, grocery shopping, dining, and airport lounge access.",
    shortUsp: "Defence CSD & lifestyle perks"
  },
  {
    cardKey: "hsbc-visa-platinum",
    cardName: "Visa Platinum Credit Card",
    usp: "A lifetime-free introductory card offering decent reward points on everyday retail, dining, and fuel purchases, with introductory bank discounts and zero fees.",
    shortUsp: "Lifetime-free everyday card"
  },
  {
    cardKey: "hsbc-rupay-platinum",
    cardName: "RuPay Platinum Credit Card",
    usp: "A zero-annual-fee card combining RuPay UPI payment capability with rewards on everyday transactions, dining benefits, and partner brand discounts.",
    shortUsp: "Lifetime-free UPI & rewards"
  },
  {
    cardKey: "federal-imperio",
    cardName: "Imperio Credit Card",
    usp: "A lifestyle card offering complimentary domestic airport lounge access, dining discounts, movie savings, and reward points on everyday grocery and healthcare spends.",
    shortUsp: "Lounge, dining, and lifestyle"
  },
  {
    cardKey: "federal-signet",
    cardName: "Signet Credit Card",
    usp: "An entry-level lifetime-free card offering movie ticket buy-one-get-one deals, shopping rewards, and partner merchant discounts.",
    shortUsp: "Lifetime-free shopping & movies"
  },
  {
    cardKey: "idfc-first-select",
    cardName: "Select Credit Card",
    usp: "A lifetime-free premium card offering reward points that never expire, complimentary domestic airport lounge visits, and low interest rates and forex markup.",
    shortUsp: "Lifetime-free premium rewards"
  },
  {
    cardKey: "equitas-powermiles",
    cardName: "PowerMiles Credit Card",
    usp: "A premium travel rewards card offering accelerated points on international transactions, complimentary airport lounge visits, and flexible rewards redemption.",
    shortUsp: "Premium travel & lounge access"
  },
  {
    cardKey: "csb-jupiter-edge-plus",
    cardName: "Jupiter Edge+ Credit Card",
    usp: "A digital-first credit card offering direct cashback on online transactions and RuPay UPI payments, managed seamlessly through the Jupiter app.",
    shortUsp: "Jupiter UPI & online cashback"
  },
  {
    cardKey: "kotak-cashback-plus",
    cardName: "Cashback+ Credit Card",
    usp: "A simple cashback card providing direct value back on online food delivery, grocery shopping, entertainment, and everyday expenses.",
    shortUsp: "Food, grocery, & movies cashback"
  },
  {
    cardKey: "yes-pop-club",
    cardName: "POP CLUB Credit Card",
    usp: "A co-branded card designed for younger spenders, offering reward points on partner brands, UPI compatibility, and zero-fee benefits.",
    shortUsp: "Young spenders UPI rewards"
  },
  {
    cardKey: "cheq-au",
    cardName: "CheQ Credit Card",
    usp: "A utility-focused credit card offering accelerated CheQ points on card bills, utilities, and grocery payments, with flexible redemption options.",
    shortUsp: "Bill payments & utilities"
  },
  {
    cardKey: "hdfc-pixel-play",
    cardName: "PIXEL Play Credit Card",
    usp: "A highly customizable digital-first card letting you choose your preferred 5% cashback categories (like dining, travel, or shopping) on the PayZapp app.",
    shortUsp: "Customizable 5% cashback"
  },
  {
    cardKey: "flipkart-sbi",
    cardName: "Flipkart Credit Card",
    usp: "Best for Flipkart shoppers, offering direct cashback on Flipkart, Myntra, and Cleartrip bookings alongside simple everyday reward points.",
    shortUsp: "Flipkart & Myntra cashback"
  },
  {
    cardKey: "yes-reserv",
    cardName: "RESERV Credit Card",
    usp: "A premium lifestyle card featuring golf privileges, complimentary domestic and international airport lounge access, and movie ticket discounts.",
    shortUsp: "Premium golf & lounge access"
  },
  {
    cardKey: "rbl-world-max",
    cardName: "World Max Credit Card",
    usp: "A premium card providing lounge access, accelerated reward points on dining and travel spends, and attractive milestone rewards.",
    shortUsp: "Premium travel & dining rewards"
  },
  {
    cardKey: "simplyclick-sbi",
    cardName: "SimplyCLICK Credit Card",
    usp: "One of India's most popular entry-level cards for online shopping, offering 10x reward points on key partner merchants like Amazon, Cleartrip, and BookMyShow.",
    shortUsp: "Online shopping 10x rewards"
  },
  {
    cardKey: "hdfc-swiggy-orange",
    cardName: "Swiggy Orange Credit Card",
    usp: "Offers dedicated cashback on Swiggy (food delivery, Instamart, Dineout, and Genie) along with flat cashback on general online shopping.",
    shortUsp: "Swiggy food & Instamart cashback"
  },
  {
    cardKey: "hdfc-swiggy-black",
    cardName: "Swiggy BLCK Credit Card",
    usp: "A premium Swiggy co-branded card offering high cashback on Swiggy orders, dining, and online shopping, alongside complementary Swiggy One membership.",
    shortUsp: "Swiggy One & premium cashback"
  },
  {
    cardKey: "sbi-card-miles",
    cardName: "MILES Credit Card",
    usp: "A travel-centric card built for air miles and hotel points accumulation, featuring complimentary domestic airport lounge access and multi-airline transfer partners.",
    shortUsp: "Travel miles & lounge access"
  },
  {
    cardKey: "bpcl-sbi-octane",
    cardName: "BPCL OCTANE Credit Card",
    usp: "An ultra-high-reward fuel card offering 7.25% value back on BPCL fuel purchases, 6.25% value back on BPCL gas bookings, and strong grocery rewards.",
    shortUsp: "7.25% BPCL fuel value back"
  },
  {
    cardKey: "idfc-first-power-plus",
    cardName: "Power+ Credit Card",
    usp: "A value-packed fuel and utility card offering savings on HPCL fuel purchases, HP Pay app transactions, grocery shopping, and utility bills.",
    shortUsp: "HPCL fuel savings & UPI"
  },
  {
    cardKey: "icici-hpcl-super-saver",
    cardName: "HPCL Super Saver Credit Card",
    usp: "Co-branded fuel card offering value back on HPCL fuel transactions, utility bill payments, departmental stores, and movie tickets.",
    shortUsp: "HPCL fuel & utility rewards"
  },
  {
    cardKey: "bpcl-sbi",
    cardName: "BPCL Credit Card",
    usp: "An entry-level fuel credit card offering 4.25% value back on BPCL fuel spends, alongside grocery, dining, and movie rewards at a low fee.",
    shortUsp: "BPCL fuel savings & low fee"
  },
  {
    cardKey: "idfc-first-power",
    cardName: "Power Credit Card",
    usp: "A low-fee fuel card offering cashbacks on HPCL fuel purchases, utility bills, and grocery shopping, with RuPay UPI compatibility.",
    shortUsp: "HPCL fuel & UPI cashback"
  },
  {
    cardKey: "icici-hpcl-coral",
    cardName: "HPCL Coral Credit Card",
    usp: "An entry-level fuel card providing cashback on HPCL fuel spending, fuel surcharge waivers, and discounts on BookMyShow movie tickets.",
    shortUsp: "HPCL fuel cashback & movies"
  },
  {
    cardKey: "axis-indianoil-premium",
    cardName: "IndianOil Premium Credit Card",
    usp: "Offers high reward points on fuel purchases at IndianOil outlets, online food ordering via Zomato, grocery spends, and domestic airport lounges.",
    shortUsp: "IndianOil fuel & lounge benefits"
  },
  {
    cardKey: "kotak-pvr-inox",
    cardName: "PVR INOX Credit Card",
    usp: "The ultimate card for movie lovers, offering free PVR INOX movie tickets each month upon hitting moderate monthly spend targets.",
    shortUsp: "Free PVR movie tickets"
  },
  {
    cardKey: "kotak-infinite",
    cardName: "Infinite Credit Card",
    usp: "A super-premium card for high net worth individuals, offering complimentary airport lounge access, golf privileges, and personalized concierge services.",
    shortUsp: "Wealth-centric golf & lounge"
  },
  {
    cardKey: "sc-platinum-rewards",
    cardName: "Platinum Rewards Credit Card",
    usp: "A lifetime-free reward card providing accelerated points on dining and fuel purchases, with no annual fee pressure.",
    shortUsp: "Lifetime-free fuel & dining rewards"
  },
  {
    cardKey: "phonepe-sbi-purple",
    cardName: "PhonePe PURPLE Credit Card",
    usp: "A co-branded card offering direct cashbacks on PhonePe spend, online purchases, and utility payments, with RuPay UPI functionality.",
    shortUsp: "PhonePe cashback & UPI"
  },
  {
    cardKey: "rbl-cookies",
    cardName: "Cookies Credit Card",
    usp: "An entry-level shopping card offering regular discount vouchers, cashback on online spends, and dining/entertainment savings.",
    shortUsp: "Shopping vouchers & rewards"
  },
  {
    cardKey: "hdfc-pixel-go",
    cardName: "PIXEL Go Credit Card",
    usp: "A digital-first card designed for mobile-centric users, featuring instant virtual card issuance, PayZapp cashbacks, and RuPay UPI support.",
    shortUsp: "Digital-first UPI & cashback"
  },
  {
    cardKey: "rbl-platinum-maxima-plus",
    cardName: "Platinum Maxima Plus Credit Card",
    usp: "A balanced lifestyle card featuring complimentary domestic airport lounge access, movie ticket discounts, and reward points on dining and grocery shopping.",
    shortUsp: "Lounge access & dining rewards"
  },
  {
    cardKey: "axis-samsung-signature",
    cardName: "Samsung Signature Credit Card",
    usp: "Offers 10% direct cashback on Samsung products year-round, alongside domestic lounge access and reward points on daily spends.",
    shortUsp: "10% Samsung product cashback"
  },
  {
    cardKey: "yes-paisabazaar-paisasave-rupay",
    cardName: "Paisabazaar PaisaSave RuPay Credit Card",
    usp: "A lifetime-free co-branded card offering flat cashback on everyday online purchases and RuPay UPI scans, powered by Paisabazaar.",
    shortUsp: "Lifetime-free UPI & online cashback"
  },
  {
    cardKey: "sbi-card-miles-prime",
    cardName: "MILES PRIME Credit Card",
    usp: "A premium travel card offering flexible air miles/hotel points transfers, complimentary domestic & international airport lounge visits, and travel insurance coverage.",
    shortUsp: "Premium travel miles & lounge"
  }
];

// Card ID alias map to support dataset card IDs that differ from marketing cardKeys
const CARD_KEY_ALIASES: Record<string, string[]> = {
  "sbi-aurum": ["aurum-sbi"],
  "amex-platinum-charge": ["amex-platinum"],
  "amex-mrcc": ["amex-membership-rewards"],
  "amazon-pay-icici": ["icici-amazon-pay"],
  "flipkart-axis": ["axis-flipkart", "axis-fk"],
  "tata-neu-infinity": ["hdfc-tata-neu-infinity", "tata-neu-infinity-sbi"],
  "kiwi-rupay": ["yes-kiwi"],
  "scapia-federal": ["scapia-bobcard"],
  "yes-marquee": ["yes-bank-marquee"],
};

// Additional curated fallbacks for cards outside the list of 25
const additionalCurated: Record<string, string> = {
  "indusind-tiger": "Lifetime-free travel card featuring a low 1.5% forex markup, complimentary lounge access, and quarterly golf privileges.",
  "indusind-legend": "Lifetime-free premium card with weekday/weekend reward structures, discounted 1.8% forex markup, and complimentary quarterly golf privileges."
};

const additionalCuratedShort: Record<string, string> = {
  "indusind-tiger": "Lifetime-free travel card with 1.5% forex, lounge access, and quarterly golf.",
  "indusind-legend": "Lifetime-free premium card with weekday/weekend rewards and 1.8% forex."
};

// Build lookup maps
const curatedMap: Record<string, string> = { ...additionalCurated };
const curatedShortMap: Record<string, string> = { ...additionalCuratedShort };

for (const item of creditCardUSPs) {
  curatedMap[item.cardKey] = item.usp;
  curatedShortMap[item.cardKey] = item.shortUsp;

  const aliases = CARD_KEY_ALIASES[item.cardKey] || [];
  for (const alias of aliases) {
    curatedMap[alias] = item.usp;
    curatedShortMap[alias] = item.shortUsp;
  }
}

// One-line USP for a card: a curated marketing line for popular cards, otherwise a short line
// generated from the card's own fields. Shared by the /ask results and the /recommend DTO.
export function getCardUsp(card: CreditCard): string {
  if (curatedMap[card.id]) {
    return curatedMap[card.id];
  }

  // Dynamic fallback generation
  const isLtf = card.joiningFee === 0 && card.annualFee === 0;
  const ltfText = isLtf ? "Lifetime free card" : "";
  const bestForText = card.bestFor.length > 0 ? `Optimized for ${card.bestFor.slice(0, 2).join(" and ")}` : "";

  const features: string[] = [];
  if (card.forexMarkup <= 2) {
    features.push(`low ${card.forexMarkup}% forex markup`);
  }
  if (card.loungeDomestic === "unlimited" || card.loungeInternational === "unlimited") {
    features.push("unlimited airport lounge access");
  } else if (card.loungeDomestic > 0) {
    features.push(`complimentary lounge access`);
  }

  const featuresText = features.length > 0 ? `featuring ${features.join(" and ")}` : "";

  const summary = [ltfText, bestForText, featuresText].filter(Boolean).join(", ").replace(/,\s*,/g, ",").trim();
  return summary ? summary + "." : "High-value rewards credit card.";
}

// Compact USP for a card: curated short line for popular cards, otherwise a very short line.
// Used for display constraints (e.g., homepage/popular picks section).
export function getCardShortUsp(card: CreditCard): string {
  if (curatedShortMap[card.id]) {
    return curatedShortMap[card.id];
  }

  // Dynamic fallback: compact description
  const parts: string[] = [];
  if (card.joiningFee === 0 && card.annualFee === 0) {
    parts.push("Lifetime free");
  }
  if (card.bestFor.length > 0) {
    parts.push(`best for ${card.bestFor.slice(0, 2).join(" & ")}`);
  } else {
    parts.push(`${card.rewardType} card`);
  }

  return parts.join(", ") + ".";
}
