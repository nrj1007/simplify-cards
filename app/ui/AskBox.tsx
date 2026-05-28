type Props = {
  defaultQuery?: string;
  defaultMaxAnnualFee?: number;
  showHelperText?: boolean;
};

export default function AskBox({
  defaultQuery = "Best card for online shopping and lounge access under Rs 5000 fee",
  defaultMaxAnnualFee,
  showHelperText = true
}: Props) {
  return (
    <form action="/ask" className="panel ask-panel" method="GET">
      <div className="field">
        <label htmlFor="query">Ask about Indian credit cards</label>
        <textarea defaultValue={defaultQuery} id="query" name="query" />
      </div>
      {defaultMaxAnnualFee !== undefined ? <input name="maxAnnualFee" type="hidden" value={defaultMaxAnnualFee} /> : null}
      <button className="button" type="submit">
        Ask
      </button>
      {showHelperText ? (
        <p className="muted" style={{ margin: 0 }}>
          We answer from the verified card dataset and log anything that needs a future database update.
        </p>
      ) : null}
    </form>
  );
}
