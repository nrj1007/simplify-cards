"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.askFeedbackLogPath = void 0;
exports.logAskFeedback = logAskFeedback;
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
exports.askFeedbackLogPath = node_path_1.default.join(process.cwd(), "data", "question-logs", "ask-feedback.json");
async function logAskFeedback(entry) {
    const logDir = node_path_1.default.dirname(exports.askFeedbackLogPath);
    await promises_1.default.mkdir(logDir, { recursive: true });
    let existingEntries = [];
    try {
        const existingContent = await promises_1.default.readFile(exports.askFeedbackLogPath, "utf8");
        existingEntries = JSON.parse(existingContent);
    }
    catch (error) {
        if (error.code !== "ENOENT")
            throw error;
    }
    existingEntries.push(entry);
    await promises_1.default.writeFile(exports.askFeedbackLogPath, JSON.stringify(existingEntries, null, 2));
    return entry;
}
