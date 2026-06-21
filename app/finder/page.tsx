import type { Metadata } from "next";
import { cards, getIssuers, getTags } from "@/lib/cards";
import { buildPageMetadata } from "@/lib/seo";
import CardTile from "../ui/CardTile";
import FinderFilterForm from "../ui/FinderFilterForm";
import PageHero from "../ui/PageHero";

export const metadata: Metadata = buildPageMetadata({
  title: "Credit Card Finder",
  description:
    "Browse Indian credit cards by issuer, annual fee, and use case to shortlist cards before you compare rewards, lounges, and exclusions.",
  path: "/finder"
});

type Props = {
  searchParams: Promise<{
    issuer?: string;
    tag?: string;
    fee?: string;
  }>;
};

export default async function FinderPage({ searchParams }: Props) {
  const params = await searchParams;
  const feeLimit = params.fee ? Number(params.fee) : undefined;
  const filteredCards = cards.filter((card) => {
    const issuerOk = params.issuer ? card.issuer === params.issuer : true;
    const tagOk = params.tag ? card.tags.includes(params.tag) : true;
    const feeOk = feeLimit === undefined || Number.isNaN(feeLimit) ? true : card.annualFee <= feeLimit;
    return issuerOk && tagOk && feeOk;
  });

  return (
    <div className="page-shell">
      <PageHero
        eyebrow="✦ Card finder"
        title="Credit Card Finder"
        lead="Filter cards by issuer, annual fee, and use case to shortlist the right options."
      />
      <section className="page-content">
        <div className="container">
          <FinderFilterForm
            defaultFee={params.fee ?? ""}
            defaultIssuer={params.issuer ?? ""}
            defaultTag={params.tag ?? ""}
            issuers={getIssuers()}
            tags={getTags()}
          />

          {/* ad slot: finder page mid banner — restore when ads integrated */}

          <div className="grid cards">
            {filteredCards.map((card) => (
              <CardTile key={card.id} analyticsPage="finder" analyticsSource="finder" card={card} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
