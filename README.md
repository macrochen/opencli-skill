# opencli-skill

这个 Skill 把上游的 [jackwener/opencli](https://github.com/jackwener/opencli) 包装成本地可直接调用的能力。

## 目录

- `SKILL.md`: 给 agent 的使用说明
- `scripts/bootstrap.sh`: 安装依赖并构建 opencli
- `scripts/generate-opencli-guide.mjs`: 生成本地 HTML 命令导航页
- `scripts/open-opencli-guide.sh`: 在默认浏览器打开命令导航页
- `scripts/run-opencli.sh`: 统一运行入口
- `scripts/update-upstream.sh`: 更新上游源码并重新构建
- `references/usage.md`: 常用命令和注意事项
- `assets/opencli-guide.html`: 可离线打开的命令查询页面
- `assets/alfred-workflow/`: Alfred workflow 源文件
- `vendor/opencli`: 上游源码快照

## 快速开始

```bash
.gemini/skills/opencli-skill/scripts/bootstrap.sh
.gemini/skills/opencli-skill/scripts/run-opencli.sh list
.gemini/skills/opencli-skill/scripts/open-opencli-guide.sh
```

如果要用浏览器类命令，先在 Chrome 安装 Playwright MCP Bridge，并运行：

```bash
.gemini/skills/opencli-skill/scripts/run-opencli.sh setup
```

## Alfred

导入 `assets/alfred-workflow/opencli-guide.alfredworkflow` 后，在 Alfred 输入 `opencli`，会直接在默认浏览器打开本地命令导航页。
