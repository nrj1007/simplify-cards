import type { ApplyLink } from "./types";

type CardLinkTarget = {
  applyUrl: string;
  affiliateUrl?: string;
  applyLinks?: ApplyLink[];
};

export function parseEarningsProfit(earnings?: string): number {
  if (!earnings) return 0;
  const match = earnings.replace(/,/g, "").match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

export function getBestCtaLink(card: CardLinkTarget): { url: string; isAffiliate: boolean } {
  if (card.applyLinks && card.applyLinks.length > 0) {
    const affiliateLinks = card.applyLinks.filter((link) => link.provider !== "official");
    if (affiliateLinks.length > 0) {
      let bestLink = affiliateLinks[0];
      let maxProfit = parseEarningsProfit(bestLink.earnings);
      
      for (let i = 1; i < affiliateLinks.length; i++) {
        const profit = parseEarningsProfit(affiliateLinks[i].earnings);
        if (profit > maxProfit) {
          maxProfit = profit;
          bestLink = affiliateLinks[i];
        }
      }
      return { url: bestLink.url, isAffiliate: true };
    }
    
    const officialLink = card.applyLinks.find((link) => link.provider === "official");
    if (officialLink) {
      return { url: officialLink.url, isAffiliate: false };
    }
    
    return { url: card.applyLinks[0].url, isAffiliate: card.applyLinks[0].provider !== "official" };
  }
  
  if (card.affiliateUrl) {
    return { url: card.affiliateUrl, isAffiliate: true };
  }
  return { url: card.applyUrl, isAffiliate: false };
}

export function isAffiliateLink(card: CardLinkTarget): boolean {
  return getBestCtaLink(card).isAffiliate;
}

export function cardCtaHref(card: CardLinkTarget): string {
  return getBestCtaLink(card).url;
}

export function cardCtaLabel(card: CardLinkTarget): string {
  return isAffiliateLink(card) ? "Apply" : "Check official site";
}

export function cardCtaRel(card: CardLinkTarget): string {
  return isAffiliateLink(card) ? "sponsored nofollow" : "nofollow";
}

