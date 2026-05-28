"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const telegram_inbox_1 = require("@/lib/telegram-inbox");
(0, vitest_1.describe)("telegram inbox helpers", () => {
    (0, vitest_1.it)("extracts unique urls from text", () => {
        const urls = (0, telegram_inbox_1.extractUrlsFromText)("tip https://example.com/a and https://example.com/b and https://example.com/a again");
        (0, vitest_1.expect)(urls).toEqual(["https://example.com/a", "https://example.com/b"]);
    });
    (0, vitest_1.it)("builds an inbox entry with note and urls", () => {
        const entry = (0, telegram_inbox_1.buildTelegramInboxEntry)({
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
        (0, vitest_1.expect)(entry).toMatchObject({
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
    (0, vitest_1.it)("skips empty telegram messages", () => {
        const entry = (0, telegram_inbox_1.buildTelegramInboxEntry)({
            update_id: 102,
            message: {
                message_id: 8,
                date: 1778593871,
                chat: {
                    id: 470356562
                }
            }
        });
        (0, vitest_1.expect)(entry).toBeNull();
    });
});
