#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OPENCLI_DIR="$ROOT_DIR/vendor/opencli"

if [[ ! -d "$OPENCLI_DIR/.git" ]]; then
  echo "Missing git checkout: $OPENCLI_DIR" >&2
  exit 1
fi

cd "$OPENCLI_DIR"
git pull --ff-only

"$ROOT_DIR/scripts/bootstrap.sh"
