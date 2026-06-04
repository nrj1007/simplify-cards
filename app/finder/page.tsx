import { cards, getIssuers, getTags } from "@/lib/cards";
import CardTile from "../ui/CardTile";
import PageHero from "../ui/PageHero";

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
          <form className="panel card" style={{ marginBottom: 18 }}>
        <div className="filters">
          <div className="field">
            <label htmlFor="issuer">Issuer</label>
            <select id="issuer" name="issuer" defaultValue={params.issuer ?? ""}>
              <option value="">All issuers</option>
              {getIssuers().map((issuer) => (
                <option value={issuer} key={issuer}>
                  {issuer}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="tag">Use case</label>
            <select id="tag" name="tag" defaultValue={params.tag ?? ""}>
              <option value="">All use cases</option>
              {getTags().map((tag) => (
                <option value={tag} key={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="fee">Max annual fee</label>
            <select id="fee" name="fee" defaultValue={params.fee ?? ""}>
              <option value="">Any fee</option>
              <option value="0">Rs 0</option>
              <option value="1000">Rs 1,000</option>
              <option value="5000">Rs 5,000</option>
            </select>
          </div>
        </div>
        <div className="actions">
          <button className="button">Apply filters</button>
          <a className="button secondary" href="/finder">
            Reset
          </a>
        </div>
      </form>

          {/* ad slot: finder page mid banner — restore when ads integrated */}

          <div className="grid cards">
            {filteredCards.map((card) => (
              <CardTile key={card.id} card={card} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
