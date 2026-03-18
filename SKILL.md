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

## Runtime

先执行一次：

```bash
.gemini/skills/opencli-skill/scripts/bootstrap.sh
```

之后统一通过下面的包装脚本运行：

```bash
.gemini/skills/opencli-skill/scripts/run-opencli.sh list
.gemini/skills/opencli-skill/scripts/run-opencli.sh hackernews top --limit 5 -f yaml
.gemini/skills/opencli-skill/scripts/open-opencli-guide.sh
```

## Browser prerequisites

浏览器类命令依赖：

1. Chrome 正在运行
2. 目标站点已经在 Chrome 中登录
3. 已安装 Playwright MCP Bridge 扩展
4. 首次执行 `opencli setup`

首次配置示例：

```bash
.gemini/skills/opencli-skill/scripts/run-opencli.sh setup
```

公共接口命令如 `hackernews top`、`github search`、`v2ex hot` 不依赖浏览器登录。

## Working rules

- 默认优先直接运行已有内置命令，而不是重写一套抓取逻辑
- 需要查看命令清单时先运行 `list`
- 当用户请求 `opencli-skill list`、"列出命令"、"有哪些命令" 这类意图时，必须展示完整命令清单，不要只给示例或只列前几项
- 当完整命令太多影响阅读时，优先生成或打开本地 HTML 导航页，而不是在聊天中一次性塞入超长列表
- 浏览器命令失败时，优先检查登录状态、扩展连接和 `doctor`
- 对 `opencli` 返回的内容做二次整理后再回复用户，不要直接原样转储
- 如果内容是非中文，先完整翻译为简体中文
- 如果内容是繁体中文，统一转换为简体中文
- 输出给用户时必须使用易读的 Markdown 格式，至少要包含标题、要点列表，必要时补充引用块、表格或分节
- 保留原始链接、作者、时间、排名等关键字段；翻译时不改动事实信息
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

## Useful commands

```bash
.gemini/skills/opencli-skill/scripts/run-opencli.sh list -f yaml
.gemini/skills/opencli-skill/scripts/run-opencli.sh doctor
.gemini/skills/opencli-skill/scripts/run-opencli.sh doctor --live
.gemini/skills/opencli-skill/scripts/run-opencli.sh validate
.gemini/skills/opencli-skill/scripts/run-opencli.sh reddit hot --limit 5 -f json
.gemini/skills/opencli-skill/scripts/run-opencli.sh youtube transcript --url "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
```
