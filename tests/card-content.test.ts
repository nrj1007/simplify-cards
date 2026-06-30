import { describe, expect, it } from "vitest";
import { getAllUpdates, getCardContent, hasCardContent, type CardContentMap } from "../lib/card-content";

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

  it("aggregates updates across cards newest-first with card metadata", () => {
    const content: CardContentMap = {
      "sbi-cashback": {
        updates: [
          { title: "SBI older", summary: "x", sourceType: "manual", sourceLabel: "Manual", publishedAt: "2026-04-01" },
          { title: "SBI newest", summary: "x", sourceType: "manual", sourceLabel: "Manual", publishedAt: "2026-06-15" }
        ]
      },
      "icici-amazon-pay": {
        updates: [
          { title: "ICICI mid", summary: "x", sourceType: "manual", sourceLabel: "Manual", publishedAt: "2026-05-10" }
        ]
      }
    };

    const all = getAllUpdates(50, content);

    expect(all.map((u) => u.title)).toEqual(["SBI newest", "ICICI mid", "SBI older"]);
    expect(all[0]).toMatchObject({ cardId: "sbi-cashback", cardName: expect.any(String), cardIssuer: expect.any(String) });
    expect(all[1].cardId).toBe("icici-amazon-pay");
  });

  it("respects the limit argument", () => {
    const content: CardContentMap = {
      "sbi-cashback": {
        updates: [
          { title: "a", summary: "x", sourceType: "manual", sourceLabel: "Manual", publishedAt: "2026-06-03" },
          { title: "b", summary: "x", sourceType: "manual", sourceLabel: "Manual", publishedAt: "2026-06-02" },
          { title: "c", summary: "x", sourceType: "manual", sourceLabel: "Manual", publishedAt: "2026-06-01" }
        ]
      }
    };

    expect(getAllUpdates(2, content)).toHaveLength(2);
  });
});
