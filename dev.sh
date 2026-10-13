#!/bin/sh
# Use system Node when available; Codex's bundled runtime is a local fallback.
set -eu
FORECAST_PROJECT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$FORECAST_PROJECT_DIR"
if command -v node >/dev/null 2>&1; then
  FORECAST_NODE_BIN=$(command -v node)
elif [ -x "$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node" ]; then
  FORECAST_NODE_BIN="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
else
  echo 'Install Node.js 20.9 or newer, then run npm install and npm run dev.' >&2
  exit 1
fi
export PATH="$(dirname "$FORECAST_NODE_BIN"):$PATH"
if [ ! -f node_modules/next/dist/bin/next ]; then
  echo 'Dependencies are missing. Run npm install (or pnpm install --frozen-lockfile) first.' >&2
  exit 1
fi
exec "$FORECAST_NODE_BIN" node_modules/next/dist/bin/next dev --hostname 0.0.0.0 "$@"
