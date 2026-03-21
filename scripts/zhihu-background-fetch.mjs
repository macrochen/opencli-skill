#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import playwright from '../vendor/opencli/node_modules/playwright/index.js';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT_DIR = process.env.OPENCLI_BG_OUTPUT_DIR || path.join(ROOT_DIR, 'outputs', 'zhihu');
const DEFAULT_CDP_HTTP_ENDPOINT = 'http://127.0.0.1:9333';
const STATE_DIR = process.env.OPENCLI_BG_STATE_DIR || path.join(ROOT_DIR, '.state', 'zhihu-background');
const HEADLESS_LOG_FILE = path.join(STATE_DIR, 'logs', 'headless.log');
const DEFAULT_HOT_LIMIT = 50;
const { chromium } = playwright;

function usage() {
  console.error(`Usage:
  zhihu-background-fetch.mjs hot [--limit N] [-f json]
  zhihu-background-fetch.mjs detail <zhihu-question-url> [--limit N] [-f json]
  zhihu-background-fetch.mjs detail-batch <url-file.txt> [output-dir]
  zhihu-background-fetch.mjs detail-hot <range> [output-dir]
`);
}

function ensureZhihuUrl(raw) {
  try {
    const url = new URL(raw);
    if (url.hostname !== 'www.zhihu.com' || !url.pathname.startsWith('/question/')) {
      throw new Error(`Unsupported Zhihu question URL: ${raw}`);
    }
    return url.toString();
  } catch (error) {
    throw new Error(`Invalid URL: ${raw}`);
  }
}

async function getPage(browser) {
  const contexts = browser.contexts();
  if (contexts.length > 0) {
    const existing = contexts[0].pages()[0];
    if (existing) return existing;
    return await contexts[0].newPage();
  }
  const context = await browser.newContext();
  return await context.newPage();
}

async function resolveCdpEndpoint() {
  if (process.env.OPENCLI_BG_CDP_ENDPOINT) {
    return process.env.OPENCLI_BG_CDP_ENDPOINT;
  }

  try {
    const response = await fetch(`${DEFAULT_CDP_HTTP_ENDPOINT}/json/version`);
    if (response.ok) {
      const payload = await response.json();
      if (payload?.webSocketDebuggerUrl) {
        return payload.webSocketDebuggerUrl;
      }
    }
  } catch {
    // Fall through to log discovery.
  }

  try {
    const logText = await fs.readFile(HEADLESS_LOG_FILE, 'utf8');
    const match = logText.match(/ws:\/\/127\.0\.0\.1:\d+\/devtools\/browser\/[^\s]+/);
    if (match) {
      return match[0];
    }
  } catch {
    // Fall back to the default HTTP endpoint if the log file does not exist yet.
  }

  return DEFAULT_CDP_HTTP_ENDPOINT;
}

function cleanText(value) {
  return String(value || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<blockquote[^>]*>/gi, '\n> ')
    .replace(/<\/blockquote>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function parseRange(raw, max) {
  const input = String(raw || '').trim();
  if (!input) {
    throw new Error('Range is required, for example: 1~20 or 3');
  }

  const normalized = input.replace(/\s+/g, '').replace(/-/g, '~');
  if (/^\d+$/.test(normalized)) {
    const value = Number(normalized);
    if (value < 1 || value > max) throw new Error(`Range ${raw} is out of bounds (1-${max}).`);
    return [value];
  }

  const match = normalized.match(/^(\d+)~(\d+)$/);
  if (!match) {
    throw new Error(`Unsupported range: ${raw}. Use forms like 1~20 or 3.`);
  }

  let start = Number(match[1]);
  let end = Number(match[2]);
  if (start > end) [start, end] = [end, start];
  if (start < 1 || end > max) throw new Error(`Range ${raw} is out of bounds (1-${max}).`);

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

async function fetchHotList(page, limit = DEFAULT_HOT_LIMIT) {
  await page.goto('https://www.zhihu.com', { waitUntil: 'domcontentloaded', timeout: 60_000 });
  const items = await page.evaluate(async (hotLimit) => {
    const res = await fetch(`https://www.zhihu.com/api/v3/feed/topstory/hot-lists/total?limit=${hotLimit}`, {
      credentials: 'include',
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch Zhihu hot list: HTTP ${res.status}`);
    }
    const text = await res.text();
    const parsed = JSON.parse(text.replace(/("id"\s*:\s*)(\d{16,})/g, '$1"$2"'));
    return (parsed?.data || []).map((item, index) => {
      const target = item.target || {};
      const questionId = target.id == null ? '' : String(target.id);
      return {
        rank: index + 1,
        title: target.title || '',
        url: questionId ? `https://www.zhihu.com/question/${questionId}` : '',
        heat: item.detail_text || '',
        answer_count: target.answer_count || 0,
      };
    });
  }, limit);

  return items.filter((item) => item.url);
}

function pad(value, width) {
  return String(value).padEnd(width, ' ');
}

function renderHotTable(items) {
  const headers = ['Rank', 'Title', 'Heat', 'Answers'];
  const rows = items.map((item) => [
    String(item.rank),
    item.title,
    item.heat,
    String(item.answer_count ?? 0),
  ]);
  const widths = headers.map((header, index) => {
    return Math.max(
      header.length,
      ...rows.map((row) => [...row[index]].length),
    );
  });

  const line = (parts) => `| ${parts.map((part, index) => pad(part, widths[index])).join(' | ')} |`;
  const separator = `|-${widths.map((width) => '-'.repeat(width)).join('-|-')}-|`;
  return [
    'zhihu/hot',
    line(headers),
    separator,
    ...rows.map((row) => line(row)),
  ].join('\n');
}

function renderDetailText(result) {
  const lines = [
    'zhihu/detail',
    `Title: ${result.title}`,
    `URL: ${result.url}`,
    `Answers: ${result.answer_count_visible}`,
    `Followers: ${result.follower_count}`,
    `Visits: ${result.visit_count}`,
  ];

  if (result.question_description) {
    lines.push('', 'Question:', result.question_description);
  }

  for (const answer of result.answers || []) {
    lines.push(
      '',
      `Answer ${answer.rank}: ${answer.author || 'Unknown'}`,
      `Votes: ${answer.votes ?? 0}`,
      answer.content || '(empty)',
    );
  }

  return lines.join('\n');
}

async function fetchQuestionViaApi(page, url, answerLimit = 5) {
  const questionId = url.match(/question\/(\d+)/)?.[1];
  if (!questionId) {
    throw new Error(`Unable to parse Zhihu question ID from URL: ${url}`);
  }

  const result = await page.evaluate(async ({ id, limit }) => {
    const [questionResp, answersResp] = await Promise.all([
      fetch(`https://www.zhihu.com/api/v4/questions/${id}?include=data[*].detail,excerpt,answer_count,follower_count,visit_count,title`, {
        credentials: 'include',
      }),
      fetch(`https://www.zhihu.com/api/v4/questions/${id}/answers?limit=${limit}&offset=0&sort_by=default&include=data[*].content,voteup_count,comment_count,author,excerpt`, {
        credentials: 'include',
      }),
    ]);

    const question = questionResp.ok ? await questionResp.json() : null;
    const answersJson = answersResp.ok ? await answersResp.json() : null;
    return {
      question,
      answers: answersJson?.data || [],
      questionStatus: questionResp.status,
      answersStatus: answersResp.status,
    };
  }, { id: questionId, limit: answerLimit });

  return result;
}

async function extractQuestionFromPage(page, answerLimit = 5) {
  return await page.evaluate((limit) => {
    const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const title =
      clean(document.querySelector('h1.QuestionHeader-title')?.textContent) ||
      clean(document.querySelector('h1')?.textContent);
    const description =
      clean(document.querySelector('.QuestionRichText, .QuestionHeader-detail, [class*="QuestionHeader-detail"]')?.textContent);
    const answerNodes = Array.from(document.querySelectorAll('.AnswerItem, [class*="List-item"]'));
    const answers = answerNodes.slice(0, limit).map((node, index) => ({
      rank: index + 1,
      author:
        clean(node.querySelector('.AuthorInfo-name')?.textContent) ||
        clean(node.querySelector('[data-zop-author-name]')?.textContent) ||
        clean(node.querySelector('a[href*="/people/"]')?.textContent),
      votes:
        Number(
          (clean(node.querySelector('button[aria-label*="赞同"]')?.textContent).match(/(\d+)/) || [])[1] ||
          (clean(node.querySelector('.VoteButton--up')?.textContent).match(/(\d+)/) || [])[1] ||
          0
        ),
      content:
        clean(node.querySelector('.RichContent-inner')?.textContent) ||
        clean(node.querySelector('.RichText')?.textContent),
    })).filter((item) => item.author || item.content);

    return {
      title,
      question_description: description,
      answers,
      answer_count_visible: answerNodes.length,
    };
  }, answerLimit);
}

async function extractQuestion(page, url, answerLimit = 5) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForTimeout(1200);

  const maybeLogin = await page.locator('input[name="username"], input[name="phoneNo"]').count();
  if (maybeLogin > 0) {
    throw new Error('Zhihu login is required in the dedicated profile before background fetching.');
  }

  const result = await fetchQuestionViaApi(page, url, answerLimit);
  const question = result?.question || {};
  let answers = Array.isArray(result?.answers) ? result.answers : [];
  let pageFallback = null;

  if (!question.title || answers.length === 0) {
    pageFallback = await extractQuestionFromPage(page, answerLimit);
  }

  if (answers.length === 0 && pageFallback?.answers?.length) {
    answers = pageFallback.answers;
  }

  const finalTitle = cleanText(question.title || pageFallback?.title);
  if (!finalTitle && answers.length === 0) {
    throw new Error(
      `Failed to fetch Zhihu question. Are you logged in? (question=${result?.questionStatus ?? 'n/a'}, answers=${result?.answersStatus ?? 'n/a'})`,
    );
  }

  return {
    url,
    title: finalTitle,
    question_description: cleanText(question.detail || question.excerpt || pageFallback?.question_description),
    answer_count_visible: question.answer_count ?? answers.length,
    follower_count: question.follower_count ?? 0,
    visit_count: question.visit_count ?? 0,
    answers: answers.slice(0, answerLimit).map((answer, index) => ({
      rank: index + 1,
      author: cleanText(answer.author?.name || answer.author),
      votes: answer.voteup_count ?? 0,
      content: cleanText(answer.content || answer.excerpt),
    })),
    fetched_at: new Date().toISOString(),
    source: 'background-cdp',
  };
}

async function writeJson(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function runDetail(url, outputFile) {
  const browser = await chromium.connectOverCDP(await resolveCdpEndpoint());
  try {
    const page = await getPage(browser);
    const result = await extractQuestion(page, ensureZhihuUrl(url));
    if (outputFile) {
      await writeJson(outputFile, result);
    } else {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    }
  } finally {
    await browser.close();
  }
}

async function runBatch(urlFile, outputDir) {
  const content = await fs.readFile(urlFile, 'utf8');
  const urls = content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const browser = await chromium.connectOverCDP(await resolveCdpEndpoint());
  try {
    const page = await getPage(browser);
    const results = [];
    for (let i = 0; i < urls.length; i += 1) {
      const url = ensureZhihuUrl(urls[i]);
      const result = await extractQuestion(page, url);
      const filePath = path.join(outputDir, `${i + 1}.json`);
      await writeJson(filePath, result);
      results.push({ index: i + 1, title: result.title, output: filePath });
      await page.waitForTimeout(1200);
    }
    process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
  } finally {
    await browser.close();
  }
}

async function runHot(limit, format) {
  const browser = await chromium.connectOverCDP(await resolveCdpEndpoint());
  try {
    const page = await getPage(browser);
    const hotList = await fetchHotList(page, Math.max(limit, DEFAULT_HOT_LIMIT));
    const items = hotList.slice(0, limit);
    if (format === 'json') {
      process.stdout.write(`${JSON.stringify(items, null, 2)}\n`);
      return;
    }

    process.stdout.write(`${renderHotTable(items)}\n`);
  } finally {
    await browser.close();
  }
}

async function runHotBatch(range, outputDir) {
  const browser = await chromium.connectOverCDP(await resolveCdpEndpoint());
  try {
    const page = await getPage(browser);
    const hotList = await fetchHotList(page, DEFAULT_HOT_LIMIT);
    const indexes = parseRange(range, hotList.length);
    const results = [];

    for (const index of indexes) {
      const item = hotList[index - 1];
      const result = await extractQuestion(page, item.url);
      result.hot_rank = item.rank;
      result.hot_heat = item.heat;
      const filePath = path.join(outputDir, `${item.rank}.json`);
      await writeJson(filePath, result);
      results.push({
        rank: item.rank,
        title: result.title,
        heat: item.heat,
        output: filePath,
        url: item.url,
      });
      await page.waitForTimeout(1200);
    }

    process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
  } finally {
    await browser.close();
  }
}

function parseHotArgs(args) {
  let limit = 20;
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

  if (!Number.isFinite(limit) || limit < 1) {
    throw new Error(`Invalid --limit value: ${limit}`);
  }
  if (!['table', 'json'].includes(format)) {
    throw new Error(`Unsupported format: ${format}. Use table or json.`);
  }

  return { limit, format };
}

function parseDetailArgs(args) {
  let target = '';
  let limit = 5;
  let format = 'json';

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg.startsWith('-') && !target) {
      target = arg;
      continue;
    }
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

  if (!target) {
    throw new Error('Detail target is required.');
  }
  if (!Number.isFinite(limit) || limit < 1) {
    throw new Error(`Invalid --limit value: ${limit}`);
  }
  if (!['json', 'text', 'table'].includes(format)) {
    throw new Error(`Unsupported format: ${format}. Use json or text.`);
  }

  return { target, limit, format };
}

async function runDetailCommand(target, limit, format) {
  const browser = await chromium.connectOverCDP(await resolveCdpEndpoint());
  try {
    const page = await getPage(browser);
    const result = await extractQuestion(page, ensureZhihuUrl(target), limit);
    if (format === 'json') {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      return;
    }
    process.stdout.write(`${renderDetailText(result)}\n`);
  } finally {
    await browser.close();
  }
}

async function main() {
  const [, , command, ...rest] = process.argv;
  const [arg1, arg2] = rest;
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  if (command === 'hot') {
    const { limit, format } = parseHotArgs(rest);
    await runHot(limit, format);
    return;
  }

  if (command === 'detail') {
    const { target, limit, format } = parseDetailArgs(rest);
    await runDetailCommand(target, limit, format);
    return;
  }

  if (command === 'detail-batch' && arg1) {
    const outputDir = arg2 ? path.resolve(arg2) : OUTPUT_DIR;
    await runBatch(path.resolve(arg1), outputDir);
    return;
  }

  if (command === 'detail-hot' && arg1) {
    const outputDir = arg2 ? path.resolve(arg2) : OUTPUT_DIR;
    await runHotBatch(arg1, outputDir);
    return;
  }

  usage();
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});
