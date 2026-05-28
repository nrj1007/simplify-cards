"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const vitest_1 = require("vitest");
const question_logs_1 = require("../lib/question-logs");
const logDir = node_path_1.default.dirname(question_logs_1.unsupportedQuestionLogPath);
function cleanupLogFile() {
    if (node_fs_1.default.existsSync(question_logs_1.unsupportedQuestionLogPath))
        node_fs_1.default.rmSync(question_logs_1.unsupportedQuestionLogPath);
}
(0, vitest_1.describe)("question log helpers", () => {
    (0, vitest_1.beforeEach)(() => {
        node_fs_1.default.mkdirSync(logDir, { recursive: true });
        cleanupLogFile();
    });
    (0, vitest_1.afterEach)(() => {
        cleanupLogFile();
    });
    (0, vitest_1.it)("returns an empty list when no log file exists", async () => {
        await (0, vitest_1.expect)((0, question_logs_1.readUnsupportedQuestionLog)()).resolves.toEqual([]);
    });
    (0, vitest_1.it)("returns log entries newest first", async () => {
        node_fs_1.default.writeFileSync(question_logs_1.unsupportedQuestionLogPath, JSON.stringify([
            {
                query: "older question",
                loggedAt: "2026-05-11T10:00:00.000Z",
                reason: "older",
                input: { query: "older question" }
            },
            {
                query: "newer question",
                loggedAt: "2026-05-12T10:00:00.000Z",
                reason: "newer",
                input: { query: "newer question" }
            }
        ], null, 2));
        const entries = await (0, question_logs_1.readUnsupportedQuestionLog)();
        (0, vitest_1.expect)(entries).toHaveLength(2);
        (0, vitest_1.expect)(entries[0].query).toBe("newer question");
        (0, vitest_1.expect)(entries[1].query).toBe("older question");
    });
});
