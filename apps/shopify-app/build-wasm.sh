#!/bin/bash
# Serialized WASM build for Shopify CLI
# Shopify CLI runs build commands for all functions in parallel,
# which causes cargo workspace lock contention. This script uses
# mkdir-based locking to serialize the builds.

set -e

# Ensure cargo is in PATH
[ -f "$HOME/.cargo/env" ] && source "$HOME/.cargo/env"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WORKSPACE_ROOT="$SCRIPT_DIR"
LOCK_DIR="$WORKSPACE_ROOT/target/.shopify-build-lock"

# Ensure target dir exists
mkdir -p "$WORKSPACE_ROOT/target"

# Try to acquire lock (mkdir is atomic on POSIX)
if mkdir "$LOCK_DIR" 2>/dev/null; then
  # We got the lock — build the entire workspace
  trap "rmdir '$LOCK_DIR' 2>/dev/null" EXIT
  cd "$WORKSPACE_ROOT"
  cargo build --target=wasm32-wasip1 --release
else
  # Another build is running — wait for it to finish (up to 120s)
  WAITED=0
  while [ -d "$LOCK_DIR" ] && [ $WAITED -lt 120 ]; do
    sleep 1
    WAITED=$((WAITED + 1))
  done
  # If lock is still held after 120s, try to build anyway (stale lock)
  if [ -d "$LOCK_DIR" ]; then
    rmdir "$LOCK_DIR" 2>/dev/null || true
    cd "$WORKSPACE_ROOT"
    cargo build --target=wasm32-wasip1 --release
  fi
fi
