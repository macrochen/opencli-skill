#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import playwright from '../vendor/opencli/node_modules/playwright/index.js';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_SKILL_OUTPUT_ROOT = path.join(process.cwd(), 'outputs', 'opencli-skill');
const STATE_DIR = process.env.OPENCLI_BG_STATE_DIR || path.join(DEFAULT_SKILL_OUTPUT_ROOT, 'shared-reddit-background-state');
const DEFAULT_CDP_HTTP_ENDPOINT = process.env.OPENCLI_BG_CDP_HTTP_ENDPOINT || 'http://127.0.0.1:9335';
const HEADLESS_LOG_FILE = path.join(STATE_DIR, 'logs', 'headless.log');
const { chromium } = playwright;

function usage() {
  console.error(`Usage:
  reddit-background-fetch.mjs hot [subreddit] [--limit N] [-f json]
  reddit-background-fetch.mjs popular [--limit N] [-f json]
  reddit-background-fetch.mjs detail <target> [--limit N] [-f json]
`);
}

function normalizeText(text) {
  return String(text || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
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

function parseArgs(args, detail = false) {
  let target = '';
  let limit = detail ? 8 : 20;
  let format = 'table';
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg.startsWith('-') && !target) {
      target = arg;
    } else if ((arg === '--limit' || arg === '-l') && args[i + 1]) {
      limit = Number(args[i + 1]);
      i += 1;
    } else if ((arg === '--format' || arg === '-f') && args[i + 1]) {
      format = String(args[i + 1]).toLowerCase();
      i += 1;
    }
  }
  return { target, limit, format };
}

function parseHotArgs(args) {
  let subreddit = '';
  let limit = 20;
  let format = 'table';
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg.startsWith('-') && !subreddit) {
      subreddit = arg;
    } else if ((arg === '--limit' || arg === '-l') && args[i + 1]) {
      limit = Number(args[i + 1]);
      i += 1;
    } else if ((arg === '--format' || arg === '-f') && args[i + 1]) {
      format = String(args[i + 1]).toLowerCase();
      i += 1;
    }
  }
  return { subreddit, limit, format };
}

async function fetchHot(page, subreddit, limit) {
  await page.goto('https://www.reddit.com', { waitUntil: 'domcontentloaded', timeout: 60_000 });
  const items = await page.evaluate(async ({ sub, wanted }) => {
    const path = sub ? `/r/${sub}/hot.json` : '/hot.json';
    const res = await fetch(`${path}?limit=${wanted}&raw_json=1`, { credentials: 'include' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return (data?.data?.children || []).map((child, index) => ({
      rank: index + 1,
      title: child.data.title,
      subreddit: child.data.subreddit_name_prefixed,
      score: child.data.score,
      comments: child.data.num_comments,
      url: `https://www.reddit.com${child.data.permalink}`,
    }));
  }, { sub: subreddit, wanted: limit });
  return items;
}

async function fetchPopular(page, limit) {
  await page.goto('https://www.reddit.com', { waitUntil: 'domcontentloaded', timeout: 60_000 });
  const items = await page.evaluate(async (wanted) => {
    const res = await fetch(`/r/popular.json?limit=${wanted}&raw_json=1`, { credentials: 'include' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return (data?.data?.children || []).map((child, index) => ({
      rank: index + 1,
      title: child.data.title,
      subreddit: child.data.subreddit_name_prefixed,
      score: child.data.score,
      comments: child.data.num_comments,
      url: `https://www.reddit.com${child.data.permalink}`,
    }));
  }, limit);
  return items;
}

async function fetchDetail(page, target, limit) {
  await page.goto('https://www.reddit.com', { waitUntil: 'domcontentloaded', timeout: 60_000 });
  const data = await page.evaluate(async ({ rawTarget, wanted }) => {
    const match = rawTarget.match(/comments\/([a-z0-9]+)/i) || rawTarget.match(/\b([a-z0-9]{5,8})\b/i);
    const postId = match ? match[1] : '';
    if (!postId) return { error: 'Failed to parse Reddit post ID from target' };

    const res = await fetch(`/comments/${postId}.json?sort=best&limit=${Math.max(wanted * 3, 100)}&depth=3&raw_json=1`, {
      credentials: 'include',
    });
    if (!res.ok) return { error: `Reddit API returned HTTP ${res.status}` };
    const payload = await res.json();
    const post = payload?.[0]?.data?.children?.[0]?.data;
    if (!post) return { error: 'Post not found' };

    const topLevel = (payload?.[1]?.data?.children || []).filter((item) => item.kind === 't1').slice(0, wanted);
    const comments = topLevel.map((item, index) => ({
      rank: index + 1,
      author: item.data?.author || '[deleted]',
      score: item.data?.score || 0,
      body: item.data?.body || '',
    }));

    let content = post.selftext || '';
    if (!content && post.url && !post.is_self) content = `Link post: ${post.url}`;

    return {
      title: post.title || '',
      subreddit: post.subreddit_name_prefixed || '',
      author: post.author || '[deleted]',
      score: post.score || 0,
      comments: post.num_comments || 0,
      created_at: post.created_utc ? new Date(post.created_utc * 1000).toISOString() : '',
      url: `https://www.reddit.com${post.permalink || ''}`,
      content,
      top_comments: comments,
    };
  }, { rawTarget: target, wanted: limit });

  if (!data || typeof data !== 'object') throw new Error('Failed to fetch Reddit post');
  if (data.error) throw new Error(String(data.error));
  return {
    ...data,
    content: normalizeText(data.content),
    top_comments: (data.top_comments || []).map((item) => ({
      rank: item.rank,
      author: item.author,
      score: item.score,
      body: normalizeText(item.body),
    })),
  };
}

async function runPopular(args) {
  const { limit, format } = parseArgs(args, false);
  const browser = await chromium.connectOverCDP(await resolveCdpEndpoint());
  try {
    const page = await getPage(browser);
    const items = await fetchPopular(page, limit);
    if (format === 'json') {
      process.stdout.write(`${JSON.stringify(items, null, 2)}\n`);
      return;
    }
    const rows = items.map((item) => [item.rank, item.title, item.subreddit, item.score, item.comments]);
    process.stdout.write(`${renderTable('reddit/popular', ['Rank', 'Title', 'Subreddit', 'Score', 'Comments'], rows)}\n`);
  } finally {
    await browser.close();
  }
}

async function runHot(args) {
  const { subreddit, limit, format } = parseHotArgs(args);
  const browser = await chromium.connectOverCDP(await resolveCdpEndpoint());
  try {
    const page = await getPage(browser);
    let items = await fetchHot(page, subreddit, limit);
    if (items.length === 0 && !subreddit) {
      items = await fetchPopular(page, limit);
    }
    if (format === 'json') {
      process.stdout.write(`${JSON.stringify(items, null, 2)}\n`);
      return;
    }
    const rows = items.map((item) => [item.rank, item.title, item.subreddit, item.score, item.comments]);
    process.stdout.write(`${renderTable('reddit/hot', ['Rank', 'Title', 'Subreddit', 'Score', 'Comments'], rows)}\n`);
  } finally {
    await browser.close();
  }
}

async function runDetail(args) {
  const { target, limit, format } = parseArgs(args, true);
  if (!target) throw new Error('Detail target is required.');
  const browser = await chromium.connectOverCDP(await resolveCdpEndpoint());
  try {
    const page = await getPage(browser);
    const result = await fetchDetail(page, target, limit);
    if (format === 'json') {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      return;
    }
    const lines = [
      'reddit/detail',
      `Title: ${result.title}`,
      `Subreddit: ${result.subreddit}`,
      `URL: ${result.url}`,
      `Score: ${result.score}`,
      `Comments: ${result.comments}`,
      '',
      result.content,
    ];
    for (const comment of result.top_comments || []) {
      lines.push('', `Comment ${comment.rank}: ${comment.author} (${comment.score})`, comment.body);
    }
    process.stdout.write(`${lines.join('\n')}\n`);
  } finally {
    await browser.close();
  }
}

async function main() {
  const [, , command, ...rest] = process.argv;
  if (command === 'hot') return runHot(rest);
  if (command === 'popular') return runPopular(rest);
  if (command === 'detail') return runDetail(rest);
  usage();
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});
