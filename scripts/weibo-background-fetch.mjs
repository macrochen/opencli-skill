#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import playwright from '../vendor/opencli/node_modules/playwright/index.js';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_SKILL_OUTPUT_ROOT = path.join(process.cwd(), 'outputs', 'opencli-skill');
const STATE_DIR = process.env.OPENCLI_BG_STATE_DIR || path.join(DEFAULT_SKILL_OUTPUT_ROOT, 'shared-weibo-background-state');
const DEFAULT_CDP_HTTP_ENDPOINT = process.env.OPENCLI_BG_CDP_HTTP_ENDPOINT || 'http://127.0.0.1:9336';
const HEADLESS_LOG_FILE = path.join(STATE_DIR, 'logs', 'headless.log');
const { chromium } = playwright;

function usage() {
  console.error(`Usage:
  weibo-background-fetch.mjs hot [--limit N] [-f json]
`);
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

function parseArgs(args) {
  let limit = 30;
  let format = 'table';
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if ((arg === '--limit' || arg === '-l') && args[i + 1]) {
      limit = Number(args[i + 1]);
      i += 1;
      continue;
    }
    if ((arg === '--format' || arg === '-f') && args[i + 1]) {
      format = String(args[i + 1]).toLowerCase();
      i += 1;
      continue;
    }
  }
  if (!Number.isFinite(limit) || limit < 1) throw new Error(`Invalid --limit value: ${limit}`);
  return { limit: Math.min(limit, 50), format };
}

async function fetchHot(page, limit) {
  await page.goto('https://weibo.com', { waitUntil: 'domcontentloaded', timeout: 60_000 });
  const items = await page.evaluate(async (wanted) => {
    const resp = await fetch('/ajax/statuses/hot_band', { credentials: 'include' });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    const list = data.data?.band_list || [];
    return list.slice(0, wanted).map((item, index) => ({
      rank: item.realpos || (index + 1),
      word: item.word || '',
      hot_value: item.num || 0,
      category: item.category || '',
      label: item.label_name || '',
      url: `https://s.weibo.com/weibo?q=${encodeURIComponent(`#${item.word}#`)}`,
    }));
  }, limit);
  return items;
}

async function runHot(args) {
  const { limit, format } = parseArgs(args);
  const browser = await chromium.connectOverCDP(await resolveCdpEndpoint());
  try {
    const page = await getPage(browser);
    const items = await fetchHot(page, limit);
    if (format === 'json') {
      process.stdout.write(`${JSON.stringify(items, null, 2)}\n`);
      return;
    }
    const rows = items.map((item) => [item.rank, item.word, item.hot_value, item.category, item.label]);
    process.stdout.write(`${renderTable('weibo/hot', ['Rank', 'Word', 'Hot', 'Category', 'Label'], rows)}\n`);
  } finally {
    await browser.close();
  }
}

async function main() {
  const [, , command, ...rest] = process.argv;
  if (command === 'hot') return runHot(rest);
  usage();
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});
