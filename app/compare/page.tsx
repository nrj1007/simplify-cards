import { cards } from "@/lib/cards";

type Props = {
  searchParams: Promise<{
    a?: string;
    b?: string;
  }>;
};

export default async function ComparePage({ searchParams }: Props) {
  const params = await searchParams;
  const first = cards.find((card) => card.id === (params.a ?? "sbi-cashback")) ?? cards[0];
  const second = cards.find((card) => card.id === (params.b ?? "hdfc-millennia")) ?? cards[1];

  return (
    <section className="section">
      <div className="page-title">
        <h1>Compare Cards</h1>
        <p>Side-by-side comparison designed for SEO pages and user decisions.</p>
      </div>

      <form className="panel card" style={{ margin: "18px 0" }}>
        <div className="filters">
          <div className="field">
            <label htmlFor="a">First card</label>
            <select id="a" name="a" defaultValue={first.id}>
              {cards.map((card) => (
                <option value={card.id} key={card.id}>
                  {card.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="b">Second card</label>
            <select id="b" name="b" defaultValue={second.id}>
              {cards.map((card) => (
                <option value={card.id} key={card.id}>
                  {card.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button className="button">Compare</button>
      </form>

      <table className="compare-table">
        <tbody>
          <tr>
            <th>Feature</th>
            <th>{first.name}</th>
            <th>{second.name}</th>
          </tr>
          <tr>
            <td>Issuer</td>
            <td>{first.issuer}</td>
            <td>{second.issuer}</td>
          </tr>
          <tr>
            <td>Annual fee</td>
            <td>Rs {first.annualFee}</td>
            <td>Rs {second.annualFee}</td>
          </tr>
          <tr>
            <td>Best for</td>
            <td>{first.bestFor.join(", ")}</td>
            <td>{second.bestFor.join(", ")}</td>
          </tr>
          <tr>
            <td>Lounge access</td>
            <td>{first.loungeDomestic + first.loungeInternational} visits listed</td>
            <td>{second.loungeDomestic + second.loungeInternational} visits listed</td>
          </tr>
          <tr>
            <td>Forex markup</td>
            <td>{first.forexMarkup}%</td>
            <td>{second.forexMarkup}%</td>
          </tr>
          <tr>
            <td>Common exclusions</td>
            <td>{first.exclusions.join(", ")}</td>
            <td>{second.exclusions.join(", ")}</td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}
