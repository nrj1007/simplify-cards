"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.unsupportedQuestionLogPath = void 0;
exports.readUnsupportedQuestionLog = readUnsupportedQuestionLog;
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
exports.unsupportedQuestionLogPath = node_path_1.default.join(process.cwd(), "data", "question-logs", "unsupported-questions.json");
async function readUnsupportedQuestionLog() {
    try {
        const content = await promises_1.default.readFile(exports.unsupportedQuestionLogPath, "utf8");
        const entries = JSON.parse(content);
        return [...entries].sort((left, right) => right.loggedAt.localeCompare(left.loggedAt));
    }
    catch (error) {
        if (error.code === "ENOENT")
            return [];
        throw error;
    }
}
