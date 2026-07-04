import { describe, expect, it } from "vitest";
import {
  cleanHtmlText,
  classifyHighImpactKeywords,
  computeSha256,
  computeSimpleDiff
} from "../scripts/audit-official-pages.mjs";

describe("Official Page Auditor", () => {
  it("strips HTML tags, scripts, styles, and dynamic noise from page HTML", () => {
    const rawHtml = `
      <html>
        <head>
          <script>var csrfToken = "abc123xyz";</script>
          <style>body { color: red; }</style>
        </head>
        <body>
          <header><h1>Bank Header</h1></header>
          <div class="content">
            <h2>HDFC Infinia Lounge Benefits</h2>
            <p>Complimentary unlimited domestic lounge access.</p>
            <span>Copyright © 2026 HDFC Bank Ltd.</span>
          </div>
          <footer>Footer Menu</footer>
        </body>
      </html>
    `;

    const cleaned = cleanHtmlText(rawHtml);

    expect(cleaned).not.toContain("csrfToken");
    expect(cleaned).not.toContain("Bank Header");
    expect(cleaned).not.toContain("Footer Menu");
    expect(cleaned).toContain("HDFC Infinia Lounge Benefits");
    expect(cleaned).toContain("Complimentary unlimited domestic lounge access.");
  });

  it("computes deterministic SHA-256 hashes", () => {
    const text = "Complimentary unlimited domestic lounge access.";
    const hash1 = computeSha256(text);
    const hash2 = computeSha256(text);
    const hash3 = computeSha256("Modified text");

    expect(hash1).toHaveLength(64);
    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hash3);
  });

  it("computes simple diff between old and new text", () => {
    const oldText = "Line 1\nUnlimited Lounge Access\nLine 3";
    const newText = "Line 1\nComplimentary lounge access capped at 4 visits w.e.f Aug 2026\nLine 3";

    const diff = computeSimpleDiff(oldText, newText);

    expect(diff.removed).toContain("Unlimited Lounge Access");
    expect(diff.added[0]).toContain("Complimentary lounge access capped at 4 visits");
  });

  it("identifies high-impact keywords in diff text", () => {
    const diffLines = [
      "Complimentary lounge access capped at 4 visits w.e.f 1st August 2026.",
      "Revised annual fee waiver threshold to Rs 15 Lakhs."
    ];

    const keywords = classifyHighImpactKeywords(diffLines);

    expect(keywords).toContain("lounge");
    expect(keywords.some((k) => k.startsWith("cap"))).toBe(true);
    expect(keywords).toContain("w.e.f");
    expect(keywords).toContain("revised");
    expect(keywords).toContain("fee");
  });
});
