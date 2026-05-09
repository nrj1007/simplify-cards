#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_FEED = "https://technofino.in/community/whats-new/posts/5982841/";
const CREDIT_KEYWORDS =
  /credit|cc|card|cashback|reward|devaluation|lounge|rupay|upi|axis|hdfc|sbi|idfc|kotak|icici|amex|indusind|bob|rbl|hsbc|standard chartered|federal|airtel|millennia|regalia|infinia|merchant|mcc/i;

function getArg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1 || index + 1 >= process.argv.length) return fallback;
  return process.argv[index + 1];
}

function toInt(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function decodeHtml(value = "") {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&ndash;/g, "-")
    .replace(/&mdash;/g, "-")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number.parseInt(dec, 10)));
}

function stripTags(value = "") {
  return decodeHtml(
    value
      .replace(/<blockquote[\s\S]*?<\/blockquote>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|tr|td|th)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/[ \t]+/g, " ")
    .replace(/(\r?\n\s*){2,}/g, "\n")
    .trim();
}

function absoluteUrl(base, href) {
  return new URL(href, base).toString();
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "CreditCardAI community signal scraper; manual review only"
    },
    redirect: "follow"
  });
  if (!response.ok) {
    throw new Error(`Fetch failed ${response.status} for ${url}`);
  }
  return {
    url: response.url,
    html: await response.text()
  };
}

function pageUrl(feed, pageNumber) {
  if (pageNumber === 1) return feed;
  return `${feed.replace(/\/$/, "")}/page-${pageNumber}`;
}

function extractServerTime(html) {
  const match = html.match(/XF\.samServerTime\s*=\s*(\d+)/);
  return match ? Number(match[1]) : Math.floor(Date.now() / 1000);
}

function extractFeedThreads(html, baseUrl, pageNumber) {
  const blocks = html.match(/<div class="structItem structItem--thread[\s\S]*?(?=<div class="structItem structItem--thread|<div class="block-footer")/g) ?? [];

  return blocks
    .map((block) => {
      const titleMatch = block.match(/<div class="structItem-title">[\s\S]*?<a href="([^"]+)"[^>]*>\s*([\s\S]*?)\s*<\/a>/);
      if (!titleMatch) return null;

      const forumMatches = [...block.matchAll(/<li><a href="\/community\/forums\/[^"]+">([\s\S]*?)<\/a><\/li>/g)];
      const timeMatches = [...block.matchAll(/<time[^>]*datetime="([^"]+)"[^>]*data-timestamp="(\d+)"[^>]*title="([^"]+)"/g)];
      const pairs = [...block.matchAll(/<dt>(Replies|Views)<\/dt>\s*<dd>([\s\S]*?)<\/dd>/g)];
      const author = block.match(/data-author="([^"]+)"/)?.[1] ?? "";

      const stats = Object.fromEntries(pairs.map((match) => [match[1].toLowerCase(), stripTags(match[2])]));
      const title = stripTags(titleMatch[2]);
      const forum = forumMatches.length ? stripTags(forumMatches.at(-1)[1]) : "";
      const latest = timeMatches.length ? timeMatches.at(-1) : undefined;

      return {
        page: pageNumber,
        title,
        url: absoluteUrl(baseUrl, titleMatch[1]),
        author: decodeHtml(author),
        forum,
        replies: stats.replies ?? "",
        views: stats.views ?? "",
        latestTime: latest?.[3] ?? "",
        latestTimestamp: latest ? Number(latest[2]) : 0,
        isCreditRelated: CREDIT_KEYWORDS.test(`${title} ${forum}`)
      };
    })
    .filter(Boolean);
}

function extractRecentComments(html, finalUrl, threadTitle, cutoffTimestamp) {
  const posts = html.match(/<article class="message message--post[\s\S]*?<\/article>/g) ?? [];

  return posts
    .map((post) => {
      const author = post.match(/data-author="([^"]+)"/)?.[1] ?? "";
      const postId = post.match(/data-content="post-(\d+)"/)?.[1] ?? "";
      const time = post.match(/<time[^>]*datetime="([^"]+)"[^>]*data-timestamp="(\d+)"[^>]*title="([^"]+)"/);
      const body = post.match(/<div class="bbWrapper">([\s\S]*?)<\/div>/)?.[1] ?? "";
      const text = stripTags(body);
      const timestamp = time ? Number(time[2]) : 0;

      return {
        threadTitle,
        threadUrl: finalUrl,
        postUrl: postId ? finalUrl.replace(/#post-\d+$/, "") + `#post-${postId}` : finalUrl,
        postId,
        author: decodeHtml(author),
        time: time?.[3] ?? "",
        timestamp,
        text: text.length > 1000 ? `${text.slice(0, 1000)}...` : text
      };
    })
    .filter((comment) => {
      if (comment.timestamp < cutoffTimestamp) return false;
      if (!comment.text) return false;
      if (/^[\w .-]+ said:\s*$/i.test(comment.text)) return false;
      return CREDIT_KEYWORDS.test(`${threadTitle} ${comment.text}`);
    });
}

function classifySignal(text) {
  if (/devaluation|effective|validity|reward.*valid|cashback.*credited/i.test(text)) return "terms-change";
  if (/launched|new .*card|received|ltf|lifetime free/i.test(text)) return "launch-or-offer";
  if (/merchant|mcc|asspl|cashback issue|reward.*not/i.test(text)) return "merchant-reward-behavior";
  if (/lounge|priority pass/i.test(text)) return "lounge";
  return "discussion";
}

function summarizeSignals(threads, comments) {
  const sourceItems = [
    ...threads.map((thread) => ({
      title: thread.title,
      url: thread.url,
      timestamp: thread.latestTimestamp,
      text: `${thread.title} ${thread.forum}`
    })),
    ...comments.map((comment) => ({
      title: comment.threadTitle,
      url: comment.postUrl,
      timestamp: comment.timestamp,
      text: comment.text
    }))
  ];

  const seen = new Set();
  return sourceItems
    .filter((item) => {
      const key = `${item.title}:${classifySignal(item.text)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((item) => ({
      title: item.title.replace(/\s+\|\s+TechnoFino.*$/i, ""),
      url: item.url,
      signalType: classifySignal(item.text),
      candidateText: item.text.slice(0, 500),
      requiresOfficialVerification: true,
      approvedForCardDb: false
    }));
}

async function main() {
  const feed = getArg("feed", DEFAULT_FEED);
  const pages = toInt(getArg("pages", "3"), 3);
  const hours = toInt(getArg("hours", "24"), 24);
  const maxThreads = toInt(getArg("threads", "12"), 12);
  const defaultOut = path.join("data", "community-signals", "pending", `${new Date().toISOString().slice(0, 10)}-technofino.json`);
  const out = getArg("out", defaultOut);

  const feedThreads = [];
  let serverTime = Math.floor(Date.now() / 1000);

  for (let page = 1; page <= pages; page += 1) {
    const { html, url } = await fetchText(pageUrl(feed, page));
    if (page === 1) serverTime = extractServerTime(html);
    feedThreads.push(...extractFeedThreads(html, url, page));
  }

  const cutoffTimestamp = serverTime - hours * 60 * 60;
  const recentCreditThreads = feedThreads
    .filter((thread) => thread.isCreditRelated && thread.latestTimestamp >= cutoffTimestamp)
    .sort((a, b) => b.latestTimestamp - a.latestTimestamp);

  const comments = [];
  for (const thread of recentCreditThreads.slice(0, maxThreads)) {
    try {
      const latestUrl = `${thread.url.replace(/\/$/, "")}/latest`;
      const { html, url } = await fetchText(latestUrl);
      comments.push(...extractRecentComments(html, url, thread.title, cutoffTimestamp));
    } catch (error) {
      comments.push({
        threadTitle: thread.title,
        threadUrl: thread.url,
        postUrl: thread.url,
        postId: "",
        author: "",
        time: "",
        timestamp: thread.latestTimestamp,
        text: `Thread comment fetch failed: ${error.message}`
      });
    }
  }

  const output = {
    generatedAt: new Date().toISOString(),
    source: "technofino",
    feed,
    pagesScanned: pages,
    windowHours: hours,
    cutoffTimestamp,
    requiresManualApproval: true,
    mayUpdateCardDbAutomatically: false,
    threads: recentCreditThreads,
    comments: comments.sort((a, b) => b.timestamp - a.timestamp),
    reviewQueue: summarizeSignals(recentCreditThreads, comments)
  };

  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  console.log(`Wrote ${out}`);
  console.log(`Credit threads: ${output.threads.length}`);
  console.log(`Recent comments: ${output.comments.length}`);
  console.log(`Review signals: ${output.reviewQueue.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
