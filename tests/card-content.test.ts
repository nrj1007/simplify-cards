import { describe, expect, it } from "vitest";
import { getCardContent, hasCardContent, type CardContentMap } from "../lib/card-content";

describe("card content helpers", () => {
  it("returns null when no card content exists", () => {
    expect(getCardContent("missing-card", {})).toBeNull();
    expect(hasCardContent("missing-card", {})).toBe(false);
  });

  it("sorts updates newest first and limits them to three", () => {
    const content: CardContentMap = {
      "sbi-cashback": {
        updates: [
          {
            title: "Old",
            summary: "Old note",
            sourceType: "manual",
            sourceLabel: "Manual",
            publishedAt: "2026-05-01"
          },
          {
            title: "Newest",
            summary: "Newest note",
            sourceType: "technofino",
            sourceLabel: "TechnoFino",
            publishedAt: "2026-05-04"
          },
          {
            title: "Middle",
            summary: "Middle note",
            sourceType: "manual",
            sourceLabel: "Manual",
            publishedAt: "2026-05-03"
          },
          {
            title: "Older",
            summary: "Older note",
            sourceType: "manual",
            sourceLabel: "Manual",
            publishedAt: "2026-05-02"
          }
        ],
        tips: [
          {
            text: "Use it mainly for online cashback.",
            sourceType: "manual",
            sourceLabel: "Manual"
          }
        ]
      }
    };

    const entry = getCardContent("sbi-cashback", content);

    expect(entry).not.toBeNull();
    expect(entry?.updates).toHaveLength(3);
    expect(entry?.updates[0].title).toBe("Newest");
    expect(entry?.updates[1].title).toBe("Middle");
    expect(entry?.updates[2].title).toBe("Older");
    expect(entry?.tips).toHaveLength(1);
    expect(hasCardContent("sbi-cashback", content)).toBe(true);
  });
});
