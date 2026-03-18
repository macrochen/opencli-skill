#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OPENCLI_DIR="$ROOT_DIR/vendor/opencli"

if [[ ! -d "$OPENCLI_DIR" ]]; then
  echo "Missing upstream source: $OPENCLI_DIR" >&2
  exit 1
fi

cd "$OPENCLI_DIR"

if [[ "${1:-}" == "--clean" ]]; then
  rm -rf node_modules dist
fi

echo "Installing dependencies in $OPENCLI_DIR"
npm install

echo "Building opencli"
npm run build

echo "Generating HTML guide"
"$ROOT_DIR/scripts/generate-opencli-guide.mjs"

echo
echo "opencli is ready."
echo "Run: $ROOT_DIR/scripts/run-opencli.sh list"
