#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OPENCLI_DIR="$ROOT_DIR/vendor/opencli"
ENTRYPOINT="$OPENCLI_DIR/dist/main.js"

if [[ ! -f "$ENTRYPOINT" ]]; then
  "$ROOT_DIR/scripts/bootstrap.sh"
fi

exec node "$ENTRYPOINT" "$@"
