import { describe, it, expect } from "vitest";
import { scoreCards } from "../lib/recommend";

describe("Discontinued cards", () => {
  it("should not recommend discontinued cards by default in generic queries", () => {
    const results = scoreCards({ query: "best credit card under 5000" });
    const discontinued = results.filter(r => r.card.status === "discontinued");
    expect(discontinued.length).toBe(0);
  });
});
