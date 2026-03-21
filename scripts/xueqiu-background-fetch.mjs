#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import playwright from '../vendor/opencli/node_modules/playwright/index.js';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STATE_DIR = process.env.OPENCLI_BG_STATE_DIR || path.join(ROOT_DIR, '.state', 'xueqiu-background');
const DEFAULT_CDP_HTTP_ENDPOINT = process.env.OPENCLI_BG_CDP_HTTP_ENDPOINT || 'http://127.0.0.1:9334';
const HEADLESS_LOG_FILE = path.join(STATE_DIR, 'logs', 'headless.log');
const { chromium } = playwright;

function usage() {
  console.error(`Usage:
  xueqiu-background-fetch.mjs hot [--limit N] [-f json]
  xueqiu-background-fetch.mjs detail <target> [-f json]
`);
}

function cleanText(value) {
  return String(value || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<blockquote[^>]*>/gi, '\n> ')
    .replace(/<\/blockquote>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

async function resolveCdpEndpoint() {
  if (process.env.OPENCLI_BG_CDP_ENDPOINT) return process.env.OPENCLI_BG_CDP_ENDPOINT;
  try {
    const response = await fetch(`${DEFAULT_CDP_HTTP_ENDPOINT}/json/version`);
    if (response.ok) {
      const payload = await response.json();
      if (payload?.webSocketDebuggerUrl) return payload.webSocketDebuggerUrl;
    }
  } catch {}
  try {
    const logText = await fs.readFile(HEADLESS_LOG_FILE, 'utf8');
    const match = logText.match(/ws:\/\/127\.0\.0\.1:\d+\/devtools\/browser\/[^\s]+/);
    if (match) return match[0];
  } catch {}
  return DEFAULT_CDP_HTTP_ENDPOINT;
}

async function getPage(browser) {
  const contexts = browser.contexts();
  if (contexts.length > 0) {
    const page = contexts[0].pages()[0];
    if (page) return page;
    return await contexts[0].newPage();
  }
  const context = await browser.newContext();
  return await context.newPage();
}

function pad(value, width) {
  return String(value).padEnd(width, ' ');
}

function renderTable(title, headers, rows) {
  const widths = headers.map((header, index) => Math.max(header.length, ...rows.map((row) => [...String(row[index] || '')].length)));
  const line = (parts) => `| ${parts.map((part, index) => pad(part, widths[index])).join(' | ')} |`;
  const separator = `|-${widths.map((width) => '-'.repeat(width)).join('-|-')}-|`;
  return [title, line(headers), separator, ...rows.map((row) => line(row))].join('\n');
}

function parseHotArgs(args) {
  let limit = 20;
  let format = 'table';
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if ((arg === '--limit' || arg === '-l') && args[i + 1]) {
      limit = Number(args[i + 1]);
      i += 1;
    } else if ((arg === '--format' || arg === '-f') && args[i + 1]) {
      format = String(args[i + 1]).toLowerCase();
      i += 1;
    }
  }
  return { limit, format };
}

function parseDetailArgs(args) {
  let target = '';
  let format = 'json';
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg.startsWith('-') && !target) {
      target = arg;
    } else if ((arg === '--format' || arg === '-f') && args[i + 1]) {
      format = String(args[i + 1]).toLowerCase();
      i += 1;
    }
  }
  if (!target) throw new Error('Detail target is required.');
  return { target, format };
}

function parseStatusId(target) {
  const raw = String(target || '').trim();
  const urlMatch = raw.match(/xueqiu\.com\/(?:[\w-]+\/)?(\d{6,})/);
  const idMatch = raw.match(/\b(\d{6,})\b/);
  return urlMatch?.[1] || idMatch?.[1] || '';
}

async function fetchHot(page, limit) {
  await page.goto('https://xueqiu.com', { waitUntil: 'domcontentloaded', timeout: 60_000 });
  const items = await page.evaluate(async () => {
    const resp = await fetch('https://xueqiu.com/statuses/hot/listV3.json?source=hot&page=1', { credentials: 'include' });
    if (!resp.ok) throw new Error(`HTTP ${resp.status} Hint: Not logged in?`);
    const data = await resp.json();
    return (data.list || []).map((item, index) => {
      const user = item.user || {};
      return {
        rank: index + 1,
        author: user.screen_name || '',
        text: item.description || '',
        likes: item.fav_count ?? 0,
        replies: item.reply_count ?? 0,
        retweets: item.retweet_count ?? 0,
        url: `https://xueqiu.com/${user.id}/${item.id}`,
      };
    });
  });

  return items.slice(0, limit).map((item) => ({
    ...item,
    text: cleanText(item.text).slice(0, 200),
  }));
}

async function fetchDetail(page, target) {
  const statusId = parseStatusId(target);
  if (!statusId) throw new Error('Unable to parse Xueqiu article/status ID.');
  await page.goto('https://xueqiu.com', { waitUntil: 'domcontentloaded', timeout: 60_000 });
  const result = await page.evaluate(async (id) => {
    const resp = await fetch(`https://xueqiu.com/statuses/show.json?id=${encodeURIComponent(id)}`, { credentials: 'include' });
    if (!resp.ok) return { error: `HTTP ${resp.status}` };
    const data = await resp.json();
    const user = data.user || {};
    return {
      title: data.title || data.rawTitle || '',
      author: user.screen_name || '',
      created_at: data.created_at || null,
      edited_at: data.edited_at || null,
      likes: data.fav_count ?? data.like_count ?? 0,
      replies: data.reply_count ?? 0,
      retweets: data.retweet_count ?? 0,
      view_count: data.view_count ?? null,
      source: data.source || '',
      url: data.target ? `https://xueqiu.com${data.target}` : `https://xueqiu.com/${user.id || ''}/${data.id || id}`,
      summary: data.description || '',
      content: typeof data.text === 'string' && data.text.trim() ? data.text : (data.description || ''),
    };
  }, statusId);
  if (result?.error) throw new Error(`${result.error} (请确认雪球已登录，且链接有效)`);
  return {
    ...result,
    summary: cleanText(result.summary),
    content: cleanText(result.content),
    created_at: result.created_at ? new Date(result.created_at).toISOString() : '',
    edited_at: result.edited_at ? new Date(result.edited_at).toISOString() : '',
  };
}

async function runHot(args) {
  const { limit, format } = parseHotArgs(args);
  const browser = await chromium.connectOverCDP(await resolveCdpEndpoint());
  try {
    const page = await getPage(browser);
    const items = await fetchHot(page, limit);
    if (format === 'json') {
      process.stdout.write(`${JSON.stringify(items, null, 2)}\n`);
      return;
    }
    const rows = items.map((item) => [item.rank, item.author, item.text, item.likes]);
    process.stdout.write(`${renderTable('xueqiu/hot', ['Rank', 'Author', 'Text', 'Likes'], rows)}\n`);
  } finally {
    await browser.close();
  }
}

async function runDetail(args) {
  const { target, format } = parseDetailArgs(args);
  const browser = await chromium.connectOverCDP(await resolveCdpEndpoint());
  try {
    const page = await getPage(browser);
    const result = await fetchDetail(page, target);
    if (format === 'json') {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      return;
    }
    process.stdout.write([
      'xueqiu/detail',
      `Title: ${result.title}`,
      `Author: ${result.author}`,
      `URL: ${result.url}`,
      `Likes: ${result.likes}`,
      `Replies: ${result.replies}`,
      '',
      result.content,
    ].join('\n') + '\n');
  } finally {
    await browser.close();
  }
}

async function main() {
  const [, , command, ...rest] = process.argv;
  if (command === 'hot') return runHot(rest);
  if (command === 'detail') return runDetail(rest);
  usage();
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});
