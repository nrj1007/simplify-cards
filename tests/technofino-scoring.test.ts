import { describe, expect, it } from "vitest";

const scoringModulePath = "../skills/community-signals/scripts/technofino-scoring.mjs";

describe("Technofino signal scoring", () => {
  it("keeps high-signal credit-card terms-change items", async () => {
    const { scoreCommunityItem, summarizeSignals } = await import(scoringModulePath);
    const item = {
      title: "Indusind Legend Credit Card- Devaluation",
      forum: "Super Premium Credit Cards",
      text: "Indusind Legend Credit Card devaluation effective June 15 with revised charges and reward changes"
    };

    const score = scoreCommunityItem(item);
    const queue = summarizeSignals(
      [
        {
          title: item.title,
          forum: item.forum,
          url: "https://technofino.in/community/threads/indusind-ledgend-credit-card-devaluation.45690/",
          latestTimestamp: 1778560000
        }
      ],
      []
    );

    expect(score.isRelevantCreditCardSignal).toBe(true);
    expect(score.score).toBeGreaterThanOrEqual(5);
    expect(queue[0].signalType).toBe("terms-change");
    expect(queue[0].candidateCardIds).toContain("indusind-legend");
  });

  it("filters bank-account and debit-card noise", async () => {
    const { scoreCommunityItem, summarizeSignals } = await import(scoringModulePath);
    const noisyItems = [
      {
        title: "Wiki",
        forum: "Bank Account",
        text: "Wiki Bank Account",
        url: "https://technofino.in/community/forums/kotak-bank-811-super-savings-account-benefits-important-update.4/",
        latestTimestamp: 1778560000
      },
      {
        title: "Free INR 50 APAY voucher with Visa DC",
        forum: "Debit Card Offers",
        text: "Free INR 50 APAY voucher with Visa debit card",
        url: "https://technofino.in/community/threads/free-inr-50-apay-voucher-with-visa-dc.48167/",
        latestTimestamp: 1778560000
      }
    ];

    expect(scoreCommunityItem(noisyItems[0]).isRelevantCreditCardSignal).toBe(false);
    expect(scoreCommunityItem(noisyItems[1]).isRelevantCreditCardSignal).toBe(false);
    expect(summarizeSignals(noisyItems, [])).toHaveLength(0);
  });

  it("filters one-off application support posts", async () => {
    const { scoreCommunityItem } = await import(scoringModulePath);

    const score = scoreCommunityItem({
      title: "Axis bank CC application not complete due to Office email wrong entered",
      forum: "Axis Bank Credit Card",
      text: "Axis bank CC application not complete due to Office email wrong entered"
    });

    expect(score.isRelevantCreditCardSignal).toBe(false);
  });

  it("keeps launch and offer discussions with card context", async () => {
    const { summarizeSignals } = await import(scoringModulePath);

    const queue = summarizeSignals(
      [
        {
          title: "PhonePe SBI Card - CVP new SBI CC launching",
          forum: "Credit Card - General",
          text: "PhonePe SBI Card new SBI CC launching",
          url: "https://technofino.in/community/threads/phonepe-sbi-card-cvp-new-sbi-cc-launching.42666/",
          latestTimestamp: 1778560000
        }
      ],
      []
    );

    expect(queue).toHaveLength(1);
    expect(queue[0].signalType).toBe("launch-or-offer");
    expect(queue[0].relevanceScore).toBeGreaterThanOrEqual(5);
  });

  it("does not match generic one-word card aliases across issuers", async () => {
    const { matchCardsForSignal } = await import(scoringModulePath);

    const matches = matchCardsForSignal("Kotak Cashback Card LTF Trick Credit Card Offers");

    expect(matches.map((match: { cardId: string }) => match.cardId)).toContain("kotak-cashback-plus");
    expect(matches.map((match: { cardId: string }) => match.cardId)).not.toContain("axis-cashback");
  });

  it("does not match ambiguous one-word card aliases without issuer context", async () => {
    const { matchCardsForSignal, summarizeSignals } = await import(scoringModulePath);

    const matches = matchCardsForSignal("Help required on Celesta and another card");
    const queue = summarizeSignals(
      [
        {
          title: "Amex India points to spouse Krisflyer Account",
          forum: "Singapore Airlines KrisFlyer",
          text: "Amex India points to spouse Krisflyer Account",
          url: "https://technofino.in/community/threads/amex-india-points-to-spouse-krisflyer-account.48182/",
          latestTimestamp: 1778560000
        }
      ],
      []
    );

    expect(matches.map((match: { cardId: string }) => match.cardId)).not.toContain("federal-celesta");
    expect(matches.map((match: { cardId: string }) => match.cardId)).not.toContain("indusind-celesta");
    expect(queue).toHaveLength(0);
  });

  it("checks whether fresh comments still match old thread topics", async () => {
    const { isCommentRelevantToThread } = await import(scoringModulePath);

    const relevant = isCommentRelevantToThread(
      "Kotak Cashback Card LTF Trick",
      "Kotak Cashback can be made LTF if retention approves after renewal fee posts."
    );
    const unrelated = isCommentRelevantToThread(
      "Kotak Cashback Card LTF Trick",
      "I am planning to apply for Amex points transfer to KrisFlyer."
    );

    expect(relevant.isRelevant).toBe(true);
    expect(unrelated.isRelevant).toBe(false);
  });

  it("adds discussion details to review queue entries", async () => {
    const { summarizeSignals } = await import(scoringModulePath);

    const queue = summarizeSignals(
      [
        {
          title: "Indusind Legend Credit Card- Devaluation",
          forum: "Super Premium Credit Cards",
          url: "https://technofino.in/community/threads/indusind-ledgend-credit-card-devaluation.45690/",
          latestTimestamp: 1778560000
        }
      ],
      []
    );

    expect(queue[0].discussionDetails).toMatch(/possible terms/i);
    expect(queue[0].discussionDetails).toMatch(/matched cards/i);
  });

  it("prioritizes recently created threads over old threads with fresh comments", async () => {
    const { summarizeSignals } = await import(scoringModulePath);

    const queue = summarizeSignals(
      [
        {
          title: "PhonePe SBI Card - CVP new SBI CC launching",
          forum: "Credit Card - General",
          text: "PhonePe SBI Card new SBI CC launching",
          url: "https://technofino.in/community/threads/phonepe-sbi-card-cvp-new-sbi-cc-launching.42666/",
          latestTimestamp: 1778560000,
          createdTimestamp: 1778560000,
          isRecentlyCreatedThread: true
        }
      ],
      [
        {
          threadTitle: "Kotak Cashback Card LTF Trick",
          postUrl: "https://technofino.in/community/threads/kotak-cashback-card-ltf-trick.45254/#post-1",
          timestamp: 1778570000,
          text: "Kotak Cashback can be made LTF if retention approves after renewal fee posts."
        }
      ]
    );

    expect(queue[0].title).toMatch(/PhonePe SBI/);
    expect(queue[0].sourceType).toBe("thread");
    expect(queue[0].isRecentlyCreatedThread).toBe(true);
  });
});
