import Link from "next/link";
import { ArrowRight } from "lucide-react";

const EXAMPLE_QUERIES = [
  "Best lifetime free cashback card",
  "Top cards for airport lounge access",
  "Best travel card under Rs 5000 fee",
  "Best card for online shopping",
];

type Props = {
  defaultQuery?: string;
  defaultMaxAnnualFee?: number;
  showHelperText?: boolean;
};

export default function AskBox({
  defaultQuery = "",
  defaultMaxAnnualFee,
  showHelperText = true
}: Props) {
  return (
    <form action="/ask" className="panel ask-panel" method="GET">
      <div className="field">
        <label htmlFor="query">Ask about Indian credit cards</label>
        {showHelperText ? (
          <div className="ask-examples">
            {EXAMPLE_QUERIES.map((q) => (
              <Link
                key={q}
                className="ask-example"
                href={`/ask?query=${encodeURIComponent(q)}`}
              >
                {q}
              </Link>
            ))}
          </div>
        ) : null}
        <textarea
          defaultValue={defaultQuery}
          id="query"
          name="query"
          placeholder="e.g. Best cashback card under Rs 2000 annual fee"
        />
      </div>
      {defaultMaxAnnualFee !== undefined ? <input name="maxAnnualFee" type="hidden" value={defaultMaxAnnualFee} /> : null}
      <button className="button" type="submit">
        Ask <ArrowRight size={16} />
      </button>
      {showHelperText ? (
        <p className="muted" style={{ margin: 0 }}>
          Answers are grounded in verified card data, not generic web results.
        </p>
      ) : null}
    </form>
  );
}
