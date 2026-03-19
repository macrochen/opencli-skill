# opencli-skill usage

## Prerequisites

- Node.js 18+
- Chrome 正在运行
- 对于浏览器命令，目标网站已经在 Chrome 中登录
- Playwright MCP Bridge 扩展已安装

## Common commands

```bash
.gemini/skills/opencli-skill/scripts/run-opencli.sh list
.gemini/skills/opencli-skill/scripts/open-opencli-guide.sh
.gemini/skills/opencli-skill/scripts/run-opencli.sh hackernews top --limit 10
.gemini/skills/opencli-skill/scripts/run-opencli.sh hackernews detail "https://news.ycombinator.com/item?id=12345678" -f json
.gemini/skills/opencli-skill/scripts/run-opencli.sh github search --keyword "cli"
.gemini/skills/opencli-skill/scripts/run-opencli.sh reddit hot --limit 5 -f yaml
.gemini/skills/opencli-skill/scripts/run-opencli.sh reddit detail "https://www.reddit.com/r/programming/comments/1abc123/example/" -f json
.gemini/skills/opencli-skill/scripts/run-opencli.sh zhihu detail "https://www.zhihu.com/question/123456789" -f json
.gemini/skills/opencli-skill/scripts/run-opencli.sh xueqiu hot --limit 10 -f json
.gemini/skills/opencli-skill/scripts/run-opencli.sh xueqiu detail "https://xueqiu.com/7913104177/380018734" -f json
.gemini/skills/opencli-skill/scripts/run-opencli.sh doctor --live
```

## Browser troubleshooting

- 没数据：确认目标网站已在 Chrome 登录
- 连不上浏览器：先运行 `setup`，再运行 `doctor --live`
- 命令未知：先运行 `list -f yaml` 查看当前内置命令
- 雪球文章详情为空：优先检查链接是否为 `/用户ID/文章ID` 这种动态链接，再确认当前 Chrome 里的雪球登录态仍然有效
- Reddit / 知乎抓取结果为空：优先检查当前 Chrome 登录态；如果只是想看 Reddit 纯公开内容，也可以先试 `reddit read`
- 如果是批量抓取知乎 / Reddit / 雪球详情，优先串行执行；并发抓取更容易触发超时或拿到空结果
- Hacker News 详情失败：优先检查传入的是 `item?id=...` 链接或纯数字 story ID

## Response formatting rules

- 返回给用户前，先把英文或其他非中文内容翻译成简体中文
- 如果抓到的是繁体中文内容，也统一转换成简体中文
- 不直接倾倒原始终端输出，改写成更易读的 Markdown
- 对雪球文章二次总结时，套用 `article-summary-prompt.md` 的结构
- 对知乎问题二次总结时，也先用 `zhihu detail` 抓取标准化材料，再套用同一份 `article-summary-prompt.md`
- 推荐结构：
  - 标题
  - 简短摘要
  - 编号列表或要点列表
  - 原始链接

## Listing commands

- 当用户要求 `opencli-skill list` 时，先运行：

```bash
.gemini/skills/opencli-skill/scripts/run-opencli.sh list -f yaml
```

- 基于完整输出整理成 Markdown 命令目录
- 按站点分组，不省略任何命令
- 英文或繁体说明统一转成简体中文后再展示
- 如果命令清单太长，优先使用 `assets/opencli-guide.html` 作为主入口

## HTML guide

- 打开本地页面：

```bash
.gemini/skills/opencli-skill/scripts/open-opencli-guide.sh
```

- 页面支持：
  - 关键词搜索
  - 按站点筛选
  - 按模式筛选
  - 按是否需要浏览器筛选
  - 一键复制示例命令

## Upstream docs

- `vendor/opencli/README.md`
- `vendor/opencli/SKILL.md`
- `vendor/opencli/CLI-EXPLORER.md`
- `vendor/opencli/CLI-ONESHOT.md`
