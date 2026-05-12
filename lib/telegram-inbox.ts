import fs from "node:fs/promises";
import path from "node:path";

export type TelegramInboxEntry = {
  updateId: number;
  messageId: number;
  chatId: number;
  senderId: number | null;
  senderUsername: string | null;
  receivedAt: string;
  text: string;
  urls: string[];
  note: string | null;
  reviewed: boolean;
  reviewDecision: "pending" | "latest-update" | "tip" | "card-db-update" | "ignore";
};

export type TelegramInboxState = {
  lastUpdateId: number;
  syncedAt: string | null;
};

export const telegramInboxDir = path.join(process.cwd(), "data", "telegram-inbox");
export const telegramInboxPath = path.join(telegramInboxDir, "messages.json");
export const telegramInboxStatePath = path.join(telegramInboxDir, "state.json");

export function extractUrlsFromText(text: string) {
  const matches = text.match(/https?:\/\/[^\s<>"')\]]+/gi) ?? [];
  return Array.from(new Set(matches));
}

export function buildTelegramInboxEntry(update: {
  update_id: number;
  message?: {
    message_id: number;
    date: number;
    text?: string;
    caption?: string;
    from?: { id?: number; username?: string };
    chat?: { id?: number };
  };
}) {
  const message = update.message;
  if (!message) return null;

  const text = (message.text ?? message.caption ?? "").trim();
  if (!text) return null;

  const urls = extractUrlsFromText(text);
  const note = text === urls[0] || text === urls.join(" ") ? null : text;

  return {
    updateId: update.update_id,
    messageId: message.message_id,
    chatId: message.chat?.id ?? 0,
    senderId: message.from?.id ?? null,
    senderUsername: message.from?.username ?? null,
    receivedAt: new Date(message.date * 1000).toISOString(),
    text,
    urls,
    note,
    reviewed: false,
    reviewDecision: "pending"
  } satisfies TelegramInboxEntry;
}

export async function ensureTelegramInboxDir() {
  await fs.mkdir(telegramInboxDir, { recursive: true });
}

export async function readTelegramInbox() {
  try {
    const content = await fs.readFile(telegramInboxPath, "utf8");
    const entries = JSON.parse(content) as TelegramInboxEntry[];
    return [...entries].sort((left, right) => right.receivedAt.localeCompare(left.receivedAt));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

export async function writeTelegramInbox(entries: TelegramInboxEntry[]) {
  await ensureTelegramInboxDir();
  await fs.writeFile(telegramInboxPath, JSON.stringify(entries, null, 2));
}

export async function readTelegramInboxState() {
  try {
    const content = await fs.readFile(telegramInboxStatePath, "utf8");
    return JSON.parse(content) as TelegramInboxState;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {
        lastUpdateId: 0,
        syncedAt: null
      } satisfies TelegramInboxState;
    }

    throw error;
  }
}

export async function writeTelegramInboxState(state: TelegramInboxState) {
  await ensureTelegramInboxDir();
  await fs.writeFile(telegramInboxStatePath, JSON.stringify(state, null, 2));
}
