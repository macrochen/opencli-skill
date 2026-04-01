# opencli-skill

这个 Skill 把上游的 [jackwener/opencli](https://github.com/jackwener/opencli) 包装成本地可直接调用的能力。

现在额外支持雪球、Reddit、Hacker News、知乎的详情抓取：先跑列表命令，再用原始链接继续抓正文或主内容，适合做后续总结。`zhihu detail` 返回的是适合上层按模板总结的标准化材料，不在命令层直接调用模型。

## 目录

- `SKILL.md`: 给 agent 的使用说明
- `scripts/bootstrap.sh`: 安装依赖并构建 opencli
- `scripts/generate-opencli-guide.mjs`: 生成本地 HTML 命令导航页
- `scripts/open-opencli-guide.sh`: 在默认浏览器打开命令导航页
- `scripts/run-opencli.sh`: 统一运行入口
- `scripts/update-upstream.sh`: 更新上游源码并重新构建
- `references/usage.md`: 常用命令和注意事项
- `references/article-summary-prompt.md`: 通用文章/帖子总结模板
- `assets/opencli-guide.html`: 可离线打开的命令查询页面
- `assets/alfred-workflow/`: Alfred workflow 源文件
- `vendor/opencli`: 上游源码快照

## 快速开始

```bash
.gemini/skills/opencli-skill/scripts/bootstrap.sh
.gemini/skills/opencli-skill/scripts/run-opencli.sh list
.gemini/skills/opencli-skill/scripts/open-opencli-guide.sh
.gemini/skills/opencli-skill/scripts/run-opencli.sh reddit detail "https://www.reddit.com/r/programming/comments/1abc123/example/" -f json
.gemini/skills/opencli-skill/scripts/run-opencli.sh hackernews detail "https://news.ycombinator.com/item?id=12345678" -f json
.gemini/skills/opencli-skill/scripts/run-opencli.sh zhihu detail "https://www.zhihu.com/question/123456789" -f json
.gemini/skills/opencli-skill/scripts/run-opencli.sh xueqiu detail "https://xueqiu.com/7913104177/380018734" -f json
```

如果要用浏览器类命令，先在 Chrome 安装 Playwright MCP Bridge，并运行：

```bash
.gemini/skills/opencli-skill/scripts/run-opencli.sh setup
```

## Alfred

导入 `assets/alfred-workflow/opencli-guide.alfredworkflow` 后，在 Alfred 输入 `opencli`，会直接在默认浏览器打开本地命令导航页。

## 后台静默抓取实验版

如果你不想让批量抓取打断当前正在使用的 Chrome，可以使用专用的后台浏览器配置：

```bash
.gemini/skills/opencli-skill/scripts/run-opencli.sh zhihu background-browser login
```

第一次执行时，会启动一个单独的 Chrome profile，请在这个专用窗口里登录知乎一次。之后可以关闭它，再启动后台无头浏览器：

```bash
.gemini/skills/opencli-skill/scripts/run-opencli.sh zhihu background-browser start
.gemini/skills/opencli-skill/scripts/run-opencli.sh zhihu background-browser status
```

之后连热榜列表也可以走后台模式：

```bash
.gemini/skills/opencli-skill/scripts/run-opencli.sh zhihu hot
.gemini/skills/opencli-skill/scripts/run-opencli.sh zhihu hot --limit 10 -f json
.gemini/skills/opencli-skill/scripts/run-opencli.sh zhihu detail "https://www.zhihu.com/question/123456789" -f json
```

抓取单篇知乎详情：

```bash
.gemini/skills/opencli-skill/scripts/run-opencli.sh zhihu background-detail \
  "https://www.zhihu.com/question/123456789"
```

批量抓取时，把 URL 一行一个写进文本文件：

```bash
.gemini/skills/opencli-skill/scripts/run-opencli.sh zhihu background-detail-batch \
  /tmp/zhihu-urls.txt
```

如果只是想直接按热榜编号区间抓取：

```bash
.gemini/skills/opencli-skill/scripts/run-opencli.sh zhihu background-hot-detail 1~20
```

默认输出目录为当前工作目录下的 `outputs/opencli-skill/<yyyymmdd-zhihu-background>/`。浏览器登录状态和日志会统一落到 `outputs/opencli-skill/shared-zhihu-background-state/`。这套实验版方案使用独立 `user-data-dir` 和 CDP，不会接管你正在操作的前台 Chrome，但知乎页面结构变化或登录失效时仍需要重新适配。

## 扩展到其他站点

同样的“专用 profile + 动态 CDP”方案现在也已经接到第一批其他站点：

```bash
.gemini/skills/opencli-skill/scripts/run-opencli.sh xueqiu background-browser login
.gemini/skills/opencli-skill/scripts/run-opencli.sh xueqiu hot
.gemini/skills/opencli-skill/scripts/run-opencli.sh xueqiu detail "https://xueqiu.com/7913104177/380018734" -f json

.gemini/skills/opencli-skill/scripts/run-opencli.sh reddit background-browser login
.gemini/skills/opencli-skill/scripts/run-opencli.sh reddit popular
.gemini/skills/opencli-skill/scripts/run-opencli.sh reddit detail "https://www.reddit.com/r/programming/comments/1abc123/example/" -f json

.gemini/skills/opencli-skill/scripts/run-opencli.sh weibo background-browser login
.gemini/skills/opencli-skill/scripts/run-opencli.sh weibo hot
```

这批命令都会复用各自独立的 Chrome profile，不再占用你的日常主浏览器窗口。对应 profile 默认位于当前工作目录下的：

- `outputs/opencli-skill/shared-xueqiu-background-state/`
- `outputs/opencli-skill/shared-reddit-background-state/`
- `outputs/opencli-skill/shared-weibo-background-state/`
