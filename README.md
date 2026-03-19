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
