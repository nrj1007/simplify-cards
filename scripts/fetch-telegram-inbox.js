const fs = require("node:fs");
const path = require("node:path");

const inboxDir = path.join(process.cwd(), "data", "telegram-inbox");
const inboxPath = path.join(inboxDir, "messages.json");
const statePath = path.join(inboxDir, "state.json");
const envLocalPath = path.join(process.cwd(), ".env.local");

function ensureDir() {
  fs.mkdirSync(inboxDir, { recursive: true });
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    if (error && error.code === "ENOENT") return fallback;
    throw error;
  }
}

function writeJson(filePath, value) {
  ensureDir();
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function loadEnvLocal() {
  try {
    const content = fs.readFileSync(envLocalPath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex <= 0) continue;

      const key = trimmed.slice(0, separatorIndex).trim();
      const rawValue = trimmed.slice(separatorIndex + 1).trim();
      const normalizedValue = rawValue.replace(/^['"]|['"]$/g, "");

      if (!(key in process.env)) {
        process.env[key] = normalizedValue;
      }
    }
  } catch (error) {
    if (error && error.code === "ENOENT") return;
    throw error;
  }
}

function extractUrls(text) {
  const matches = text.match(/https?:\/\/[^\s<>"')\]]+/gi) || [];
  return [...new Set(matches)];
}

function toEntry(update) {
  const message = update.message;
  if (!message) return null;

  const text = (message.text || message.caption || "").trim();
  if (!text) return null;

  const urls = extractUrls(text);
  const note = text === urls[0] || text === urls.join(" ") ? null : text;

  return {
    updateId: update.update_id,
    messageId: message.message_id,
    chatId: message.chat && typeof message.chat.id === "number" ? message.chat.id : 0,
    senderId: message.from && typeof message.from.id === "number" ? message.from.id : null,
    senderUsername: message.from && typeof message.from.username === "string" ? message.from.username : null,
    receivedAt: new Date(message.date * 1000).toISOString(),
    text,
    urls,
    note,
    reviewed: false,
    reviewDecision: "pending"
  };
}

async function main() {
  loadEnvLocal();

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = Number(process.env.TELEGRAM_CHAT_ID);

  if (!token) {
    throw new Error("Missing TELEGRAM_BOT_TOKEN");
  }

  if (!chatId || Number.isNaN(chatId)) {
    throw new Error("Missing or invalid TELEGRAM_CHAT_ID");
  }

  const state = readJson(statePath, { lastUpdateId: 0, syncedAt: null });
  const offset = state.lastUpdateId > 0 ? state.lastUpdateId + 1 : undefined;
  const url = new URL(`https://api.telegram.org/bot${token}/getUpdates`);
  if (offset !== undefined) {
    url.searchParams.set("offset", String(offset));
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Telegram polling failed with status ${response.status}`);
  }

  const payload = await response.json();
  const updates = Array.isArray(payload.result) ? payload.result : [];
  const entries = readJson(inboxPath, []);
  const knownUpdateIds = new Set(entries.map((entry) => entry.updateId));

  const newEntries = updates
    .map(toEntry)
    .filter(Boolean)
    .filter((entry) => entry.chatId === chatId)
    .filter((entry) => !knownUpdateIds.has(entry.updateId));

  const mergedEntries = [...entries, ...newEntries].sort((left, right) => right.receivedAt.localeCompare(left.receivedAt));
  const lastUpdateId =
    updates.reduce((max, update) => (typeof update.update_id === "number" && update.update_id > max ? update.update_id : max), state.lastUpdateId) ||
    state.lastUpdateId;

  writeJson(inboxPath, mergedEntries);
  writeJson(statePath, {
    lastUpdateId,
    syncedAt: new Date().toISOString()
  });

  console.log(
    JSON.stringify(
      {
        fetchedUpdates: updates.length,
        addedInboxEntries: newEntries.length,
        totalInboxEntries: mergedEntries.length,
        lastUpdateId
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
