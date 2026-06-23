type CardLinkTarget = {
  applyUrl: string;
  affiliateUrl?: string;
};

export function isAffiliateLink(card: CardLinkTarget) {
  return Boolean(card.affiliateUrl);
}

export function cardCtaHref(card: CardLinkTarget) {
  return card.affiliateUrl ?? card.applyUrl;
}

export function cardCtaLabel(card: CardLinkTarget) {
  return isAffiliateLink(card) ? "Apply" : "Check official site";
}

export function cardCtaRel(card: CardLinkTarget) {
  return isAffiliateLink(card) ? "sponsored nofollow" : "nofollow";
}
