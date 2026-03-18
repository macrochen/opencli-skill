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
.gemini/skills/opencli-skill/scripts/run-opencli.sh github search --keyword "cli"
.gemini/skills/opencli-skill/scripts/run-opencli.sh reddit hot --limit 5 -f yaml
.gemini/skills/opencli-skill/scripts/run-opencli.sh doctor --live
```

## Browser troubleshooting

- 没数据：确认目标网站已在 Chrome 登录
- 连不上浏览器：先运行 `setup`，再运行 `doctor --live`
- 命令未知：先运行 `list -f yaml` 查看当前内置命令

## Response formatting rules

- 返回给用户前，先把英文或其他非中文内容翻译成简体中文
- 如果抓到的是繁体中文内容，也统一转换成简体中文
- 不直接倾倒原始终端输出，改写成更易读的 Markdown
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
