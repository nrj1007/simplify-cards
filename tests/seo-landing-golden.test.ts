import { describe, expect, it } from "vitest";
import { SEO_LANDINGS, selectCardsForLanding } from "../lib/seo-landing";

describe("SEO landing page rankings", () => {
  it("produces stable top-10 card ordering for each landing page", () => {
    const golden: Record<string, string[]> = {};

    for (const landing of SEO_LANDINGS) {
      golden[landing.slug] = selectCardsForLanding(landing).map((score) => score.card.id);
    }

    expect(golden).toMatchSnapshot();
  }, 60000);
});
