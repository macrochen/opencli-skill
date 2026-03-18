#!/opt/homebrew/bin/node

import fs from "node:fs";
import path from "node:path";

const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const manifestPath = path.join(rootDir, "vendor/opencli/dist/cli-manifest.json");
const outputDir = path.join(rootDir, "assets");
const outputPath = path.join(outputDir, "opencli-guide.html");

const siteLabels = {
  bbc: "BBC",
  bilibili: "Bilibili",
  boss: "BOSS 直聘",
  coupang: "Coupang",
  ctrip: "携程",
  hackernews: "Hacker News",
  linkedin: "LinkedIn",
  reddit: "Reddit",
  reuters: "Reuters",
  smzdm: "什么值得买",
  twitter: "Twitter / X",
  v2ex: "V2EX",
  weibo: "微博",
  xiaohongshu: "小红书",
  xueqiu: "雪球",
  "yahoo-finance": "Yahoo Finance",
  youtube: "YouTube",
  zhihu: "知乎",
};

const strategyLabels = {
  public: "公开接口",
  cookie: "登录态 / Cookie",
  intercept: "网络拦截",
  ui: "页面交互",
  header: "请求头认证",
};

const commandDescriptions = {
  "bbc/news": "查看 BBC 新闻头条（RSS）",
  "bilibili/dynamic": "获取 Bilibili 用户动态流",
  "bilibili/favorite": "查看我的默认收藏夹",
  "bilibili/feed": "查看关注用户的动态时间线",
  "bilibili/following": "查看 Bilibili 用户关注列表",
  "bilibili/history": "查看我的观看历史",
  "bilibili/hot": "查看 B 站热门视频",
  "bilibili/me": "查看我的 Bilibili 个人资料",
  "bilibili/ranking": "查看 Bilibili 排行榜",
  "bilibili/search": "搜索 Bilibili 视频或用户",
  "bilibili/subtitle": "获取 Bilibili 视频字幕",
  "bilibili/user-videos": "查看指定用户投稿视频",
  "boss/detail": "查看 BOSS 直聘职位详情",
  "boss/search": "搜索 BOSS 直聘职位",
  "coupang/add-to-cart": "将 Coupang 商品加入购物车",
  "coupang/search": "搜索 Coupang 商品",
  "ctrip/search": "搜索携程旅行内容",
  "hackernews/top": "查看 Hacker News 热门文章",
  "linkedin/search": "搜索 LinkedIn 职位",
  "reddit/comment": "给 Reddit 帖子发表评论",
  "reddit/frontpage": "查看 Reddit 首页内容",
  "reddit/hot": "查看 Reddit 热门帖子",
  "reddit/popular": "查看 Reddit Popular 热门内容",
  "reddit/read": "阅读 Reddit 帖子与评论",
  "reddit/save": "收藏或取消收藏 Reddit 帖子",
  "reddit/saved": "查看我收藏的 Reddit 帖子",
  "reddit/search": "搜索 Reddit 帖子",
  "reddit/subreddit": "查看指定 Reddit 子版块内容",
  "reddit/subscribe": "订阅或取消订阅子版块",
  "reddit/upvote": "给 Reddit 帖子点赞或点踩",
  "reddit/upvoted": "查看我点过赞的 Reddit 帖子",
  "reddit/user": "查看 Reddit 用户资料",
  "reddit/user-comments": "查看 Reddit 用户评论历史",
  "reddit/user-posts": "查看 Reddit 用户发帖历史",
  "reuters/search": "搜索路透社新闻",
  "smzdm/search": "搜索什么值得买好价",
  "twitter/article": "提取 Twitter 长文并导出为 Markdown",
  "twitter/bookmark": "收藏推文",
  "twitter/bookmarks": "查看 Twitter / X 书签",
  "twitter/delete": "删除指定推文",
  "twitter/follow": "关注 Twitter 用户",
  "twitter/followers": "查看 Twitter / X 粉丝列表",
  "twitter/following": "查看 Twitter / X 关注列表",
  "twitter/like": "点赞指定推文",
  "twitter/notifications": "查看 Twitter / X 通知",
  "twitter/post": "发布新推文或线程",
  "twitter/profile": "查看 Twitter 用户资料",
  "twitter/reply": "回复指定推文",
  "twitter/search": "搜索 Twitter / X 推文",
  "twitter/thread": "查看推文线程及回复",
  "twitter/timeline": "查看 Twitter 首页时间线",
  "twitter/trending": "查看 Twitter / X 热门话题",
  "twitter/unbookmark": "取消收藏推文",
  "twitter/unfollow": "取消关注 Twitter 用户",
  "v2ex/daily": "执行 V2EX 每日签到",
  "v2ex/hot": "查看 V2EX 热门话题",
  "v2ex/latest": "查看 V2EX 最新话题",
  "v2ex/me": "查看 V2EX 个人资料",
  "v2ex/notifications": "查看 V2EX 提醒",
  "v2ex/topic": "查看 V2EX 主题详情和回复",
  "weibo/hot": "查看微博热搜",
  "xiaohongshu/feed": "查看小红书首页推荐流",
  "xiaohongshu/notifications": "查看小红书通知",
  "xiaohongshu/search": "搜索小红书笔记",
  "xiaohongshu/user": "查看小红书用户笔记",
  "xueqiu/feed": "查看雪球首页时间线",
  "xueqiu/hot": "查看雪球热门动态",
  "xueqiu/hot-stock": "查看雪球热门股票榜",
  "xueqiu/search": "搜索雪球股票",
  "xueqiu/stock": "查看雪球股票实时行情",
  "xueqiu/watchlist": "查看雪球自选股列表",
  "yahoo-finance/quote": "查看 Yahoo Finance 股票行情",
  "youtube/search": "搜索 YouTube 视频",
  "youtube/transcript": "获取 YouTube 视频字幕或转录",
  "youtube/transcript-group": "YouTube 字幕分组辅助命令",
  "youtube/transcript-group.test": "YouTube 字幕分组测试辅助命令",
  "youtube/utils": "YouTube 工具辅助命令",
  "youtube/video": "查看 YouTube 视频元数据",
  "zhihu/hot": "查看知乎热榜",
  "zhihu/question": "查看知乎问题详情和回答",
  "zhihu/search": "搜索知乎内容",
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function loadManifest() {
  return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
}

function getDescription(item) {
  return (
    commandDescriptions[item.command] ||
    item.description ||
    "未提供说明"
  );
}

function argsToText(args) {
  if (!args || args.length === 0) return "无";
  if (typeof args === "string") return args.trim() || "无";
  return args.map((arg) => arg.name).join(", ") || "无";
}

function buildUsage(item) {
  return `opencli-skill ${item.site} ${item.name}`;
}

const manifest = loadManifest()
  .map((item) => ({
    ...item,
    command: `${item.site}/${item.name}`,
    siteLabel: siteLabels[item.site] || item.site,
    strategyLabel: strategyLabels[item.strategy] || item.strategy,
    descriptionZh: getDescription({ ...item, command: `${item.site}/${item.name}` }),
    argsText: argsToText(item.args),
  }))
  .sort((a, b) => a.site.localeCompare(b.site) || a.name.localeCompare(b.name));

const siteGroups = Object.entries(
  manifest.reduce((acc, item) => {
    (acc[item.site] ||= []).push(item);
    return acc;
  }, {})
).map(([site, items]) => ({
  site,
  siteLabel: items[0].siteLabel,
  items,
}));

const totalCommands = manifest.length;
const totalSites = siteGroups.length;
const publicCommands = manifest.filter((item) => item.strategy === "public").length;

const cardsHtml = siteGroups
  .map(
    (group) => `
      <details class="site-section" data-site="${escapeHtml(group.site)}">
        <summary class="site-header">
          <div class="site-title-wrap">
            <span class="site-arrow" aria-hidden="true"></span>
            <div>
              <h2>${escapeHtml(group.siteLabel)}</h2>
              <p>${group.items.length} 个命令，默认折叠，点击展开</p>
            </div>
          </div>
        </summary>
        <div class="site-body">
          <div class="command-grid">
            ${group.items
              .map(
                (item) => `
                  <article
                    class="command-card"
                    data-site="${escapeHtml(item.site)}"
                    data-strategy="${escapeHtml(item.strategy)}"
                    data-browser="${item.browser ? "yes" : "no"}"
                    data-keywords="${escapeHtml(
                      [
                        item.site,
                        item.name,
                        item.siteLabel,
                        item.descriptionZh,
                        item.strategyLabel,
                        item.argsText,
                      ].join(" ").toLowerCase()
                    )}"
                  >
                    <div class="card-top">
                      <div>
                        <div class="command-name">${escapeHtml(item.site)} ${escapeHtml(item.name)}</div>
                        <div class="command-desc">${escapeHtml(item.descriptionZh)}</div>
                      </div>
                      <button class="copy-btn" data-command="${escapeHtml(buildUsage(item))}">复制</button>
                    </div>
                    <div class="meta-row">
                      <span class="chip">${escapeHtml(item.strategyLabel)}</span>
                      <span class="chip">${item.browser ? "需要浏览器" : "无需浏览器"}</span>
                    </div>
                    <div class="detail-block">
                      <div><strong>参数：</strong>${escapeHtml(item.argsText)}</div>
                      <div><strong>复制内容：</strong><code>${escapeHtml(buildUsage(item))}</code></div>
                    </div>
                  </article>
                `
              )
              .join("")}
          </div>
        </div>
      </details>
    `
  )
  .join("");

const filterOptions = siteGroups
  .map(
    (group) =>
      `<option value="${escapeHtml(group.site)}">${escapeHtml(group.siteLabel)}</option>`
  )
  .join("");

const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>OpenCLI 命令导航</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f5f1e8;
      --panel: rgba(255, 251, 245, 0.84);
      --panel-strong: #fffdfa;
      --text: #1e1b16;
      --muted: #6e6257;
      --line: rgba(61, 47, 34, 0.12);
      --accent: #0f766e;
      --accent-soft: rgba(15, 118, 110, 0.12);
      --shadow: 0 24px 50px rgba(76, 58, 39, 0.12);
      --radius: 24px;
      --mono: "SF Mono", "JetBrains Mono", ui-monospace, monospace;
      --sans: "PingFang SC", "Hiragino Sans GB", "Noto Sans CJK SC", sans-serif;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: var(--sans);
      color: var(--text);
      background:
        radial-gradient(circle at top left, rgba(15,118,110,0.18), transparent 30%),
        radial-gradient(circle at top right, rgba(217,119,6,0.14), transparent 26%),
        linear-gradient(180deg, #f8f4ec 0%, #f3ecdf 100%);
    }
    .shell {
      max-width: 1400px;
      margin: 0 auto;
      padding: 40px 24px 72px;
    }
    .hero {
      background: var(--panel);
      backdrop-filter: blur(12px);
      border: 1px solid var(--line);
      border-radius: calc(var(--radius) + 8px);
      box-shadow: var(--shadow);
      padding: 28px;
      margin-bottom: 24px;
    }
    .hero h1 {
      margin: 0 0 12px;
      font-size: clamp(32px, 5vw, 56px);
      line-height: 0.95;
      letter-spacing: -0.04em;
    }
    .hero p {
      margin: 0;
      color: var(--muted);
      font-size: 16px;
      line-height: 1.6;
      max-width: 920px;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 14px;
      margin-top: 22px;
    }
    .stat {
      background: var(--panel-strong);
      border: 1px solid var(--line);
      border-radius: 18px;
      padding: 16px 18px;
    }
    .stat strong {
      display: block;
      font-size: 28px;
      letter-spacing: -0.03em;
      margin-bottom: 4px;
    }
    .controls {
      display: grid;
      grid-template-columns: 1.7fr repeat(3, minmax(150px, 0.6fr));
      gap: 12px;
      margin: 24px 0 16px;
    }
    .controls input,
    .controls select {
      width: 100%;
      height: 52px;
      border: 1px solid var(--line);
      background: rgba(255,255,255,0.88);
      border-radius: 16px;
      padding: 0 16px;
      font-size: 15px;
      color: var(--text);
      outline: none;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.5);
    }
    .tips {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 12px;
      margin-bottom: 28px;
    }
    .tip {
      background: rgba(255,255,255,0.7);
      border: 1px dashed rgba(15, 118, 110, 0.25);
      border-radius: 18px;
      padding: 14px 16px;
      color: var(--muted);
      font-size: 14px;
      line-height: 1.6;
    }
    .site-section {
      margin-top: 28px;
      border: 1px solid var(--line);
      border-radius: 24px;
      background: rgba(255, 252, 248, 0.7);
      box-shadow: var(--shadow);
      overflow: hidden;
    }
    .site-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      list-style: none;
      cursor: pointer;
      padding: 20px 22px;
      user-select: none;
      transition: background 160ms ease;
    }
    .site-header::-webkit-details-marker { display: none; }
    .site-header:hover { background: rgba(255,255,255,0.45); }
    .site-title-wrap {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .site-arrow {
      width: 14px;
      height: 14px;
      border-right: 2px solid var(--accent);
      border-bottom: 2px solid var(--accent);
      transform: rotate(-45deg);
      transition: transform 180ms ease;
      margin-top: -4px;
    }
    .site-section[open] .site-arrow {
      transform: rotate(45deg);
      margin-top: 2px;
    }
    .site-header h2 {
      margin: 0;
      font-size: 28px;
      letter-spacing: -0.03em;
    }
    .site-header p {
      margin: 4px 0 0;
      color: var(--muted);
    }
    .site-body {
      padding: 0 18px 18px;
    }
    .command-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
      gap: 14px;
    }
    .command-card {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 22px;
      box-shadow: var(--shadow);
      padding: 18px;
    }
    .card-top {
      display: flex;
      gap: 14px;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
    }
    .command-name {
      font-family: var(--mono);
      font-size: 15px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .command-desc {
      color: var(--muted);
      line-height: 1.55;
      min-height: 44px;
    }
    .copy-btn {
      border: none;
      background: var(--accent);
      color: white;
      border-radius: 999px;
      padding: 10px 14px;
      cursor: pointer;
      font-size: 13px;
      white-space: nowrap;
    }
    .meta-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 12px;
    }
    .chip {
      display: inline-flex;
      align-items: center;
      padding: 6px 10px;
      border-radius: 999px;
      background: var(--accent-soft);
      color: var(--accent);
      font-size: 12px;
      font-weight: 700;
    }
    .detail-block {
      background: rgba(255,255,255,0.75);
      border: 1px solid var(--line);
      border-radius: 16px;
      padding: 12px 14px;
      line-height: 1.7;
      font-size: 14px;
    }
    code {
      font-family: var(--mono);
      font-size: 12px;
      word-break: break-all;
    }
    .empty-state {
      display: none;
      margin-top: 28px;
      background: rgba(255,255,255,0.76);
      border: 1px solid var(--line);
      border-radius: 22px;
      padding: 24px;
      color: var(--muted);
      text-align: center;
    }
    .footer {
      margin-top: 38px;
      color: var(--muted);
      font-size: 13px;
      text-align: center;
    }
    @media (max-width: 980px) {
      .controls {
        grid-template-columns: 1fr 1fr;
      }
    }
    @media (max-width: 640px) {
      .shell { padding: 18px 14px 42px; }
      .hero { padding: 20px; }
      .controls { grid-template-columns: 1fr; }
      .card-top { flex-direction: column; }
      .copy-btn { width: 100%; }
    }
  </style>
</head>
<body>
  <main class="shell">
    <section class="hero">
      <h1>OpenCLI 命令导航</h1>
      <p>这是一个专门为快速查命令设计的离线页面。你可以直接搜索站点、命令、参数和用途，按模式筛选是否需要浏览器，并一键复制调用示例。</p>
      <div class="stats">
        <div class="stat"><strong>${totalCommands}</strong><span>命令总数</span></div>
        <div class="stat"><strong>${totalSites}</strong><span>站点数量</span></div>
        <div class="stat"><strong>${publicCommands}</strong><span>无需登录的公开命令</span></div>
      </div>
    </section>

    <section class="controls">
      <input id="searchInput" type="search" placeholder="搜索站点、命令、描述、参数，例如 reddit、字幕、hot、AAPL" />
      <select id="siteFilter">
        <option value="">全部站点</option>
        ${filterOptions}
      </select>
      <select id="strategyFilter">
        <option value="">全部模式</option>
        <option value="public">公开接口</option>
        <option value="cookie">登录态 / Cookie</option>
        <option value="intercept">网络拦截</option>
        <option value="ui">页面交互</option>
        <option value="header">请求头认证</option>
      </select>
      <select id="browserFilter">
        <option value="">浏览器不限</option>
        <option value="yes">需要浏览器</option>
        <option value="no">无需浏览器</option>
      </select>
    </section>

    <section class="tips">
      <div class="tip"><strong>交互提示：</strong>先在搜索框里输入站点名或动词，比如 <code>reddit</code>、<code>search</code>、<code>字幕</code>，可以立刻缩小范围。</div>
      <div class="tip"><strong>交互提示：</strong>如果你只想找能直接用的命令，优先选择“公开接口”或“无需浏览器”。</div>
      <div class="tip"><strong>交互提示：</strong>点“复制”会把 <code>opencli-skill 站点 命令</code> 写入剪贴板，方便你直接以 Skill 的方式继续调用。</div>
    </section>

    <div id="results">
      ${cardsHtml}
    </div>
    <div id="emptyState" class="empty-state">没有匹配结果。可以试试更短的关键词，或者清空筛选条件。</div>

    <div class="footer">
      页面由 <code>scripts/generate-opencli-guide.mjs</code> 基于 OpenCLI manifest 自动生成。
    </div>
  </main>

  <script>
    const searchInput = document.getElementById("searchInput");
    const siteFilter = document.getElementById("siteFilter");
    const strategyFilter = document.getElementById("strategyFilter");
    const browserFilter = document.getElementById("browserFilter");
    const sections = Array.from(document.querySelectorAll(".site-section"));
    const cards = Array.from(document.querySelectorAll(".command-card"));
    const emptyState = document.getElementById("emptyState");

    function applyFilters() {
      const query = searchInput.value.trim().toLowerCase();
      const site = siteFilter.value;
      const strategy = strategyFilter.value;
      const browser = browserFilter.value;

      let visibleCards = 0;

      cards.forEach((card) => {
        const matchesQuery = !query || card.dataset.keywords.includes(query);
        const matchesSite = !site || card.dataset.site === site;
        const matchesStrategy = !strategy || card.dataset.strategy === strategy;
        const matchesBrowser = !browser || card.dataset.browser === browser;
        const visible = matchesQuery && matchesSite && matchesStrategy && matchesBrowser;
        card.style.display = visible ? "" : "none";
        if (visible) visibleCards += 1;
      });

      sections.forEach((section) => {
        const hasVisible = Array.from(section.querySelectorAll(".command-card")).some(
          (card) => card.style.display !== "none"
        );
        section.style.display = hasVisible ? "" : "none";
        section.open = false;
        if ((query || site || strategy || browser) && hasVisible) {
          section.open = true;
        }
      });

      emptyState.style.display = visibleCards === 0 ? "block" : "none";
    }

    [searchInput, siteFilter, strategyFilter, browserFilter].forEach((element) => {
      element.addEventListener("input", applyFilters);
      element.addEventListener("change", applyFilters);
    });

    document.querySelectorAll(".copy-btn").forEach((button) => {
      button.addEventListener("click", async () => {
        const text = button.dataset.command;
        try {
          await navigator.clipboard.writeText(text);
          const original = button.textContent;
          button.textContent = "已复制";
          setTimeout(() => {
            button.textContent = original;
          }, 1200);
        } catch (error) {
          button.textContent = "复制失败";
          setTimeout(() => {
            button.textContent = "复制";
          }, 1200);
        }
      });
    });

    searchInput.focus();
    applyFilters();
  </script>
</body>
</html>`;

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputPath, html, "utf8");
console.log(`Generated ${outputPath}`);
