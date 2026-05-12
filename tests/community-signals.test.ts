import { describe, expect, it } from "vitest";
import {
  buildCardContentAdditions,
  buildCommunitySignalDraft,
  mergeCardContent,
  type PendingTechnofinoFile
} from "../lib/community-signals";

describe("community signal ingestion helpers", () => {
  it("suggests card matches from Technofino text", () => {
    const file: PendingTechnofinoFile = {
      fileName: "2026-05-12-technofino.json",
      generatedAt: "2026-05-12T10:00:00.000Z",
      source: "technofino",
      reviewQueue: [
        {
          title: "HDFC Regalia Gold lounge access updated",
          url: "https://technofino.in/example",
          signalType: "terms-change",
          candidateText: "Users are discussing a new HDFC Regalia Gold lounge access condition.",
          requiresOfficialVerification: true,
          approvedForCardDb: false
        }
      ]
    };

    const draft = buildCommunitySignalDraft(file, file.reviewQueue[0]);

    expect(draft.matchedCards.length).toBeGreaterThan(0);
    expect(draft.matchedCards[0].cardId).toContain("regalia");
    expect(draft.suggestedContentType).toBe("update");
  });

  it("builds card-content additions only for approved entries", () => {
    const file: PendingTechnofinoFile = {
      fileName: "2026-05-12-technofino.json",
      generatedAt: "2026-05-12T10:00:00.000Z",
      source: "technofino",
      reviewQueue: [
        {
          title: "HDFC Regalia Gold devaluation",
          url: "https://technofino.in/regalia",
          signalType: "terms-change",
          candidateText: "Reward redemption ratios changed.",
          requiresOfficialVerification: true,
          approvedForCardDb: false,
          approvedForCardContent: true,
          cardIds: ["hdfc-regalia-gold"],
          publishedAt: "2026-05-12"
        },
        {
          title: "SBI Cashback tip",
          url: "https://technofino.in/sbi",
          signalType: "merchant-reward-behavior",
          candidateText: "Some users report better consistency on direct merchant checkout than wallet reloads.",
          requiresOfficialVerification: true,
          approvedForCardDb: false,
          approvedForCardContent: true,
          cardIds: ["sbi-cashback"]
        }
      ]
    };

    const drafts = file.reviewQueue.map((signal) => buildCommunitySignalDraft(file, signal));
    const additions = buildCardContentAdditions(drafts);

    expect(additions["hdfc-regalia-gold"].updates).toHaveLength(1);
    expect(additions["hdfc-regalia-gold"].updates?.[0].publishedAt).toBe("2026-05-12");
    expect(additions["sbi-cashback"].tips).toHaveLength(1);
  });

  it("dedupes merged card-content entries", () => {
    const merged = mergeCardContent(
      {
        "sbi-cashback": {
          tips: [
            {
              text: "Use direct online checkout where possible.",
              sourceType: "technofino",
              sourceLabel: "TechnoFino",
              sourceUrl: "https://technofino.in/sbi"
            }
          ]
        }
      },
      {
        "sbi-cashback": {
          tips: [
            {
              text: "Use direct online checkout where possible.",
              sourceType: "technofino",
              sourceLabel: "TechnoFino",
              sourceUrl: "https://technofino.in/sbi"
            }
          ]
        }
      }
    );

    expect(merged["sbi-cashback"].tips).toHaveLength(1);
  });
});
