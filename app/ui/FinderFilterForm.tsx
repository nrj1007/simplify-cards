"use client";

type Props = {
  issuers: string[];
  tags: string[];
  defaultIssuer?: string;
  defaultTag?: string;
  defaultFee?: string;
};

export default function FinderFilterForm({ issuers, tags, defaultIssuer = "", defaultTag = "", defaultFee = "" }: Props) {
  return (
    <form className="panel card" method="GET" style={{ marginBottom: 18 }}>
      <div className="filters">
        <div className="field">
          <label htmlFor="issuer">Issuer</label>
          <select defaultValue={defaultIssuer} id="issuer" name="issuer">
            <option value="">All issuers</option>
            {issuers.map((issuer) => (
              <option key={issuer} value={issuer}>
                {issuer}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="tag">Use case</label>
          <select defaultValue={defaultTag} id="tag" name="tag">
            <option value="">All use cases</option>
            {tags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="fee">Max annual fee</label>
          <select defaultValue={defaultFee} id="fee" name="fee">
            <option value="">Any fee</option>
            <option value="0">₹0</option>
            <option value="1000">₹1,000</option>
            <option value="5000">₹5,000</option>
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
  );
}
