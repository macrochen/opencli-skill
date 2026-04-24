---
name: opencli-skill
description: Wraps jackwener/opencli as a local skill for turning websites into CLI commands, reusing Chrome login state, running public-site queries, and exploring browser-backed adapters.
---

# OpenCLI Skill

使用这个 Skill 来调用 `opencli`，适合这些场景：

- 想把网站当成 CLI 来查询或操作
- 想复用 Chrome 已登录状态抓取站点数据
- 想执行 `opencli` 已内置的站点命令
- 想基于 `opencli` 的 `explore` / `generate` / `synthesize` 流程扩展适配器
- 想先列出内容，再按某几篇的链接继续抓正文并总结
- 想对 Reddit、Hacker News、知乎条目继续展开看详情

## Runtime

先执行一次：

```bash
~/.agents/skills/opencli-skill/scripts/bootstrap.sh
```

之后统一通过下面的包装脚本运行：

```bash
~/.agents/skills/opencli-skill/scripts/run-opencli.sh list
~/.agents/skills/opencli-skill/scripts/run-opencli.sh hackernews top --limit 5 -f yaml
~/.agents/skills/opencli-skill/scripts/open-opencli-guide.sh
```

## Browser prerequisites

浏览器类命令依赖：

1. Chrome 正在运行
2. 目标站点已经在 Chrome 中登录
3. 已安装 Playwright MCP Bridge 扩展
4. 首次执行 `opencli setup`

首次配置示例：

```bash
~/.agents/skills/opencli-skill/scripts/run-opencli.sh setup
```

公共接口命令如 `hackernews top`、`github search`、`v2ex hot` 不依赖浏览器登录。

## Working rules

- 默认优先直接运行已有内置命令，而不是重写一套抓取逻辑
- 需要查看命令清单时先运行 `list`
- 当用户先要列表、后要深入看其中某几篇时，优先复用列表里的原始链接，再运行对应详情命令抓正文
- 对雪球文章详情，优先使用 `xueqiu detail <链接或ID>`，不要直接抓页面可见卡片摘要
- 对 Reddit 单帖详情，优先使用 `reddit detail <链接或ID>`；如果需要完整评论树，再考虑 `reddit read`
- 对 Hacker News 单条详情，优先使用 `hackernews detail <链接或ID>`
- 对知乎问题详情，优先使用 `zhihu detail <链接或ID>` 先抓取标准化材料，再按 `references/article-summary-prompt.md` 做总结
- 如果用户明确要求“后台静默抓取知乎”或“不打断当前 Chrome”，优先使用 `zhihu background-browser ...`、`zhihu background-detail ...`、`zhihu background-hot-detail ...`
- 当前包装层里的 `zhihu hot` 也已经走后台静默抓取；需要少量结果或结构化输出时，可继续加 `--limit`、`-f json`
- 当前包装层里的 `zhihu detail` 也已经走同一条后台静默抓取链路，优先复用专用 Chrome 会话，不再接管前台主浏览器
- 同样的后台静默做法已开始扩展到 `xueqiu`、`reddit` 和 `weibo`，对于 `xueqiu hot/detail`、`reddit popular/detail`、`weibo hot`，优先走各自的专用 Chrome profile
- 当用户说“看第 2 篇”“总结 1、3、5”“展开这个链接”时，可以直接按编号或链接继续执行，无需让用户重复描述任务
- 如果是对列表里若干篇文章做批量总结，默认逐篇抓取，再分别整理；数量很多时可先提醒会稍慢，但继续执行
- 对需要浏览器登录态的批量 `detail` 抓取（尤其是知乎、Reddit、雪球），默认串行执行，不要并发抓取，以免出现超时、误判未登录或结果为空
- 当用户请求 `opencli-skill list`、"列出命令"、"有哪些命令" 这类意图时，必须展示完整命令清单，不要只给示例或只列前几项
- 当完整命令太多影响阅读时，优先生成或打开本地 HTML 导航页，而不是在聊天中一次性塞入超长列表
- 浏览器命令失败时，优先检查登录状态、扩展连接和 `doctor`
- 对 `opencli` 返回的内容做二次整理后再回复用户，不要直接原样转储
- 如果内容是非中文，先完整翻译为简体中文
- 如果内容是繁体中文，统一转换为简体中文
- 输出给用户时必须使用易读的 Markdown 格式，至少要包含标题、要点列表，必要时补充引用块、表格或分节
- 保留原始链接、作者、时间、排名等关键字段；翻译时不改动事实信息
- 当用户要求“总结某篇/几篇内容”时，必须套用 `references/article-summary-prompt.md` 中的结构与语气来总结
- 如果抓到的是软文、广告、信息严重不足或正文缺失，要明确说明无法按正常文章总结，并简短给出原因
- 只有在需要新增或修改适配器时，才去读上游文档：
  - `vendor/opencli/CLI-EXPLORER.md`
  - `vendor/opencli/CLI-ONESHOT.md`
  - `vendor/opencli/SKILL.md`

## Output style

默认输出流程：

1. 先运行 `opencli` 获取原始结果
2. 提取核心字段，去掉噪音
3. 将非简体中文内容统一转换为简体中文
4. 用 Markdown 重写结果，优先保证可扫描性

推荐格式：

- 列表类结果：用 `##` 标题 + 编号列表，每项保留标题、摘要、链接
- 单条详情：用 `##` 标题 + `-` 要点列表
- 长文本：先给“摘要”，再给“重点”，最后给“原始链接”
- 有结构化字段时，优先用 Markdown 表格或 YAML/JSON 代码块承载原始数据摘要

### Special case: article follow-up

当用户在列表结果之后要求继续看某篇或某几篇内容时：

1. 先根据上一次列表中的编号定位原始链接
2. 如果是雪球内容，运行 `xueqiu detail <链接>`
3. 如果是知乎内容，运行 `zhihu detail <链接>`
4. `detail` 命令只负责抓取和清洗正文/回答，返回适合总结的标准化材料
5. 再依据 `references/article-summary-prompt.md` 的结构与语气输出总结
6. 每篇都保留标题、作者（如有）、原始链接
7. 如果用户一次点多篇，按篇分节展示，标题里保留原列表编号
8. 如果这些内容依赖浏览器登录态，抓取阶段按篇串行执行，不要并发

### Special case: `list`

当请求是查看命令清单时：

1. 必须运行 `opencli list -f yaml` 或等价方式获取完整注册表
2. 必须列出全部命令，不得省略站点或子命令
3. 输出必须整理成 Markdown，推荐按站点分组
4. 每组至少包含：
   - 站点名
   - 子命令名
   - 命令类型或模式（如 public / cookie / browser）
   - 简短中文说明
5. 如果原始说明是英文或繁体中文，统一转成简体中文
6. 如果命令很多，允许分节展示，但不能用“其余略”这类省略方式
7. 如果用户需要高频查询或快速查找，优先引导其使用本地 HTML 页面与 Alfred workflow

## Background Browser 陷阱

各站点的 `background-browser login`（可见窗口）和 `background-browser start`（无头）共用同一端口（zhihu=9333, xueqiu=9334, weibo=9336, reddit=9335），不能同时运行。

**正确顺序：**
1. 首次登录：先 `stop`（释放端口）→ 再 `login`（弹出可见窗口）→ 用户手动登录
2. 登录完成后 cookie 保存在 profile 目录中
3. 后续使用：直接 `start`（无头），自动加载已保存的 cookie

**常见错误：** 先 `start`（无头占了端口）→ 再 `login`（端口被占，Chrome 静默失败，用户看不到登录窗口）。

## Useful commands

```bash
~/.agents/skills/opencli-skill/scripts/run-opencli.sh list -f yaml
~/.agents/skills/opencli-skill/scripts/run-opencli.sh doctor
~/.agents/skills/opencli-skill/scripts/run-opencli.sh doctor --live
~/.agents/skills/opencli-skill/scripts/run-opencli.sh validate
~/.agents/skills/opencli-skill/scripts/run-opencli.sh reddit hot --limit 5 -f json
~/.agents/skills/opencli-skill/scripts/run-opencli.sh reddit detail "https://www.reddit.com/r/programming/comments/1abc123/example/" -f json
~/.agents/skills/opencli-skill/scripts/run-opencli.sh hackernews detail "https://news.ycombinator.com/item?id=12345678" -f json
~/.agents/skills/opencli-skill/scripts/run-opencli.sh zhihu detail "https://www.zhihu.com/question/123456789" -f json
~/.agents/skills/opencli-skill/scripts/run-opencli.sh zhihu hot --limit 10 -f json
~/.agents/skills/opencli-skill/scripts/run-opencli.sh zhihu background-browser login
~/.agents/skills/opencli-skill/scripts/run-opencli.sh zhihu background-browser start
~/.agents/skills/opencli-skill/scripts/run-opencli.sh zhihu background-hot-detail 1~20
~/.agents/skills/opencli-skill/scripts/run-opencli.sh xueqiu background-browser login
~/.agents/skills/opencli-skill/scripts/run-opencli.sh xueqiu hot
~/.agents/skills/opencli-skill/scripts/run-opencli.sh xueqiu detail "https://xueqiu.com/7913104177/380018734" -f json
~/.agents/skills/opencli-skill/scripts/run-opencli.sh reddit background-browser login
~/.agents/skills/opencli-skill/scripts/run-opencli.sh reddit popular
~/.agents/skills/opencli-skill/scripts/run-opencli.sh reddit detail "https://www.reddit.com/r/programming/comments/1abc123/example/" -f json
~/.agents/skills/opencli-skill/scripts/run-opencli.sh weibo background-browser login
~/.agents/skills/opencli-skill/scripts/run-opencli.sh weibo hot
~/.agents/skills/opencli-skill/scripts/run-opencli.sh xueqiu detail "https://xueqiu.com/7913104177/380018734" -f json
~/.agents/skills/opencli-skill/scripts/run-opencli.sh youtube transcript --url "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
```
