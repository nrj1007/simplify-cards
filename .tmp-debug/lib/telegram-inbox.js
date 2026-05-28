"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.telegramInboxStatePath = exports.telegramInboxPath = exports.telegramInboxDir = void 0;
exports.extractUrlsFromText = extractUrlsFromText;
exports.buildTelegramInboxEntry = buildTelegramInboxEntry;
exports.ensureTelegramInboxDir = ensureTelegramInboxDir;
exports.readTelegramInbox = readTelegramInbox;
exports.writeTelegramInbox = writeTelegramInbox;
exports.readTelegramInboxState = readTelegramInboxState;
exports.writeTelegramInboxState = writeTelegramInboxState;
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
exports.telegramInboxDir = node_path_1.default.join(process.cwd(), "data", "telegram-inbox");
exports.telegramInboxPath = node_path_1.default.join(exports.telegramInboxDir, "messages.json");
exports.telegramInboxStatePath = node_path_1.default.join(exports.telegramInboxDir, "state.json");
function extractUrlsFromText(text) {
    var _a;
    const matches = (_a = text.match(/https?:\/\/[^\s<>"')\]]+/gi)) !== null && _a !== void 0 ? _a : [];
    return Array.from(new Set(matches));
}
function buildTelegramInboxEntry(update) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const message = update.message;
    if (!message)
        return null;
    const text = ((_b = (_a = message.text) !== null && _a !== void 0 ? _a : message.caption) !== null && _b !== void 0 ? _b : "").trim();
    if (!text)
        return null;
    const urls = extractUrlsFromText(text);
    const note = text === urls[0] || text === urls.join(" ") ? null : text;
    return {
        updateId: update.update_id,
        messageId: message.message_id,
        chatId: (_d = (_c = message.chat) === null || _c === void 0 ? void 0 : _c.id) !== null && _d !== void 0 ? _d : 0,
        senderId: (_f = (_e = message.from) === null || _e === void 0 ? void 0 : _e.id) !== null && _f !== void 0 ? _f : null,
        senderUsername: (_h = (_g = message.from) === null || _g === void 0 ? void 0 : _g.username) !== null && _h !== void 0 ? _h : null,
        receivedAt: new Date(message.date * 1000).toISOString(),
        text,
        urls,
        note,
        reviewed: false,
        reviewDecision: "pending"
    };
}
async function ensureTelegramInboxDir() {
    await promises_1.default.mkdir(exports.telegramInboxDir, { recursive: true });
}
async function readTelegramInbox() {
    try {
        const content = await promises_1.default.readFile(exports.telegramInboxPath, "utf8");
        const entries = JSON.parse(content);
        return [...entries].sort((left, right) => right.receivedAt.localeCompare(left.receivedAt));
    }
    catch (error) {
        if (error.code === "ENOENT")
            return [];
        throw error;
    }
}
async function writeTelegramInbox(entries) {
    await ensureTelegramInboxDir();
    await promises_1.default.writeFile(exports.telegramInboxPath, JSON.stringify(entries, null, 2));
}
async function readTelegramInboxState() {
    try {
        const content = await promises_1.default.readFile(exports.telegramInboxStatePath, "utf8");
        return JSON.parse(content);
    }
    catch (error) {
        if (error.code === "ENOENT") {
            return {
                lastUpdateId: 0,
                syncedAt: null
            };
        }
        throw error;
    }
}
async function writeTelegramInboxState(state) {
    await ensureTelegramInboxDir();
    await promises_1.default.writeFile(exports.telegramInboxStatePath, JSON.stringify(state, null, 2));
}
