#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OPENCLI_DIR="$ROOT_DIR/vendor/opencli"
ENTRYPOINT="$OPENCLI_DIR/dist/main.js"
BG_BROWSER_SCRIPT="$ROOT_DIR/scripts/zhihu-background-browser.sh"
BG_FETCH_SCRIPT="$ROOT_DIR/scripts/zhihu-background-fetch.mjs"
GENERIC_BG_BROWSER_SCRIPT="$ROOT_DIR/scripts/background-browser.sh"
XUEQIU_BG_FETCH_SCRIPT="$ROOT_DIR/scripts/xueqiu-background-fetch.mjs"
REDDIT_BG_FETCH_SCRIPT="$ROOT_DIR/scripts/reddit-background-fetch.mjs"
WEIBO_BG_FETCH_SCRIPT="$ROOT_DIR/scripts/weibo-background-fetch.mjs"

if [[ ! -f "$ENTRYPOINT" ]]; then
  "$ROOT_DIR/scripts/bootstrap.sh"
fi

if [[ "${1:-}" == "zhihu" ]]; then
  case "${2:-}" in
    hot)
      shift 2
      exec node "$BG_FETCH_SCRIPT" hot "$@"
      ;;
    detail)
      shift 2
      exec node "$BG_FETCH_SCRIPT" detail "$@"
      ;;
    background-browser|bg-browser)
      shift 2
      exec bash "$BG_BROWSER_SCRIPT" "$@"
      ;;
    background-detail|bg-detail)
      shift 2
      exec node "$BG_FETCH_SCRIPT" detail "$@"
      ;;
    background-detail-batch|bg-detail-batch)
      shift 2
      exec node "$BG_FETCH_SCRIPT" detail-batch "$@"
      ;;
    background-hot-detail|bg-hot-detail)
      shift 2
      exec node "$BG_FETCH_SCRIPT" detail-hot "$@"
      ;;
  esac
fi

if [[ "${1:-}" == "xueqiu" ]]; then
  case "${2:-}" in
    hot)
      shift 2
      exec node "$XUEQIU_BG_FETCH_SCRIPT" hot "$@"
      ;;
    detail)
      shift 2
      exec node "$XUEQIU_BG_FETCH_SCRIPT" detail "$@"
      ;;
    background-browser|bg-browser)
      shift 2
      exec bash "$GENERIC_BG_BROWSER_SCRIPT" xueqiu "$@"
      ;;
  esac
fi

if [[ "${1:-}" == "reddit" ]]; then
  case "${2:-}" in
    hot)
      shift 2
      exec node "$REDDIT_BG_FETCH_SCRIPT" hot "$@"
      ;;
    popular)
      shift 2
      exec node "$REDDIT_BG_FETCH_SCRIPT" popular "$@"
      ;;
    detail)
      shift 2
      exec node "$REDDIT_BG_FETCH_SCRIPT" detail "$@"
      ;;
    background-browser|bg-browser)
      shift 2
      exec bash "$GENERIC_BG_BROWSER_SCRIPT" reddit "$@"
      ;;
  esac
fi

if [[ "${1:-}" == "weibo" ]]; then
  case "${2:-}" in
    hot)
      shift 2
      exec node "$WEIBO_BG_FETCH_SCRIPT" hot "$@"
      ;;
    background-browser|bg-browser)
      shift 2
      exec bash "$GENERIC_BG_BROWSER_SCRIPT" weibo "$@"
      ;;
  esac
fi

exec node "$ENTRYPOINT" "$@"
