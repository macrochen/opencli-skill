#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEFAULT_OUTPUT_ROOT="$(pwd)/outputs/opencli-skill"
SITE="${1:-}"
CMD="${2:-}"
CHROME_BIN="${OPENCLI_BG_CHROME_BIN:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"

if [[ -z "$SITE" || -z "$CMD" ]]; then
  echo "Usage: $(basename "$0") <zhihu|xueqiu|weibo|reddit> <login|start|stop|status>" >&2
  exit 1
fi

case "$SITE" in
  zhihu)
    PORT="${OPENCLI_BG_CHROME_PORT:-9333}"
    SITE_URL="https://www.zhihu.com/signin"
    STATE_DIR="${OPENCLI_BG_STATE_DIR:-$DEFAULT_OUTPUT_ROOT/shared-zhihu-background-state}"
    ;;
  xueqiu)
    PORT="${OPENCLI_BG_CHROME_PORT:-9334}"
    SITE_URL="https://xueqiu.com/"
    STATE_DIR="${OPENCLI_BG_STATE_DIR:-$DEFAULT_OUTPUT_ROOT/shared-xueqiu-background-state}"
    ;;
  weibo)
    PORT="${OPENCLI_BG_CHROME_PORT:-9336}"
    SITE_URL="https://weibo.com/"
    STATE_DIR="${OPENCLI_BG_STATE_DIR:-$DEFAULT_OUTPUT_ROOT/shared-weibo-background-state}"
    ;;
  reddit)
    PORT="${OPENCLI_BG_CHROME_PORT:-9335}"
    SITE_URL="https://www.reddit.com/"
    STATE_DIR="${OPENCLI_BG_STATE_DIR:-$DEFAULT_OUTPUT_ROOT/shared-reddit-background-state}"
    ;;
  *)
    echo "Unsupported site: $SITE" >&2
    exit 1
    ;;
esac

PROFILE_DIR="$STATE_DIR/profile"
LOG_DIR="$STATE_DIR/logs"
PID_FILE="$STATE_DIR/chrome.pid"
VERSION_URL="http://127.0.0.1:${PORT}/json/version"

mkdir -p "$PROFILE_DIR" "$LOG_DIR"

require_chrome() {
  if [[ ! -x "$CHROME_BIN" ]]; then
    echo "Chrome not found: $CHROME_BIN" >&2
    exit 1
  fi
}

is_running() {
  if [[ -f "$PID_FILE" ]]; then
    local pid
    pid="$(cat "$PID_FILE")"
    if kill -0 "$pid" >/dev/null 2>&1; then
      return 0
    fi
    rm -f "$PID_FILE"
  fi
  return 1
}

wait_for_cdp() {
  local attempts=40
  for _ in $(seq 1 "$attempts"); do
    if curl -fsS "$VERSION_URL" >/dev/null 2>&1; then
      return 0
    fi
    sleep 0.5
  done
  return 1
}

case "$CMD" in
  login)
    require_chrome
    open -na "Google Chrome" --args \
      --user-data-dir="$PROFILE_DIR" \
      --remote-debugging-port="$PORT" \
      --no-first-run \
      --no-default-browser-check \
      --new-window \
      "$SITE_URL"
    echo "Login Chrome launched for $SITE."
    echo "Profile: $PROFILE_DIR"
    ;;
  start)
    require_chrome
    if is_running; then
      echo "Dedicated Chrome is already running with PID $(cat "$PID_FILE")."
      echo "CDP endpoint: $VERSION_URL"
      exit 0
    fi
    nohup "$CHROME_BIN" \
      --headless=new \
      --user-data-dir="$PROFILE_DIR" \
      --remote-debugging-port="$PORT" \
      --no-first-run \
      --no-default-browser-check \
      --disable-background-networking \
      --disable-sync \
      about:blank \
      >"$LOG_DIR/headless.log" 2>&1 &
    echo $! >"$PID_FILE"
    if wait_for_cdp; then
      echo "Background Chrome started for $SITE."
      echo "CDP endpoint: $VERSION_URL"
    else
      echo "Background Chrome started but CDP did not become ready in time." >&2
      exit 1
    fi
    ;;
  stop)
    if is_running; then
      kill "$(cat "$PID_FILE")"
      rm -f "$PID_FILE"
      echo "Dedicated Chrome stopped for $SITE."
    else
      echo "Dedicated Chrome is not running for $SITE."
    fi
    ;;
  status)
    if is_running; then
      echo "Process: running (PID $(cat "$PID_FILE"))"
    else
      echo "Process: stopped"
    fi
    if curl -fsS "$VERSION_URL" >/dev/null 2>&1; then
      echo "CDP: ready at $VERSION_URL"
    else
      echo "CDP: not ready"
    fi
    echo "Profile: $PROFILE_DIR"
    ;;
  *)
    echo "Usage: $(basename "$0") <zhihu|xueqiu|weibo|reddit> <login|start|stop|status>" >&2
    exit 1
    ;;
esac
