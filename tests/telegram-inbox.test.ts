import { describe, expect, it } from "vitest";
import { buildTelegramInboxEntry, extractUrlsFromText } from "@/lib/telegram-inbox";

describe("telegram inbox helpers", () => {
  it("extracts unique urls from text", () => {
    const urls = extractUrlsFromText(
      "tip https://example.com/a and https://example.com/b and https://example.com/a again"
    );

    expect(urls).toEqual(["https://example.com/a", "https://example.com/b"]);
  });

  it("builds an inbox entry with note and urls", () => {
    const entry = buildTelegramInboxEntry({
      update_id: 101,
      message: {
        message_id: 7,
        date: 1778593871,
        text: "update this https://technofino.in/community/threads/test",
        from: {
          id: 470356562,
          username: "n_007_m"
        },
        chat: {
          id: 470356562
        }
      }
    });

    expect(entry).toMatchObject({
      updateId: 101,
      messageId: 7,
      chatId: 470356562,
      senderUsername: "n_007_m",
      urls: ["https://technofino.in/community/threads/test"],
      note: "update this https://technofino.in/community/threads/test",
      reviewed: false,
      reviewDecision: "pending"
    });
  });

  it("skips empty telegram messages", () => {
    const entry = buildTelegramInboxEntry({
      update_id: 102,
      message: {
        message_id: 8,
        date: 1778593871,
        chat: {
          id: 470356562
        }
      }
    });

    expect(entry).toBeNull();
  });
});
