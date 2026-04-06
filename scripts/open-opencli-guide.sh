#!/bin/zsh

set -euo pipefail

ROOT_DIR="/Users/shi/.agents/skills/opencli-skill"
PAGE="$ROOT_DIR/assets/opencli-guide.html"
GENERATOR="$ROOT_DIR/scripts/generate-opencli-guide.mjs"
NODE_BIN="/opt/homebrew/bin/node"

if [[ ! -x "$NODE_BIN" ]]; then
  osascript -e 'display notification "找不到 /opt/homebrew/bin/node" with title "OpenCLI Guide"'
  exit 1
fi

if [[ ! -f "$PAGE" ]]; then
  "$NODE_BIN" "$GENERATOR"
fi

if ! open "$PAGE"; then
  if ! open -a "Google Chrome" "$PAGE"; then
    open -a "Safari" "$PAGE"
  fi
fi

echo "OpenCLI 命令页已打开"
