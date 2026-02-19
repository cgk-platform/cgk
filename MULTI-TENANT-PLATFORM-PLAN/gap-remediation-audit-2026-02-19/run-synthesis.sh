#!/bin/bash
set -euo pipefail

PROMPT_FILE="/Users/novarussell/Documents/cgk-platform/MULTI-TENANT-PLATFORM-PLAN/gap-remediation-audit-2026-02-19/synthesis-prompt.txt"
CGK_DIR="/Users/novarussell/Documents/cgk-platform"

echo "🚀 Starting CGK gap audit synthesis via OpenCode + Gemini 3 Pro..."
echo "   Dir: $CGK_DIR"
echo "   Prompt: $PROMPT_FILE"
echo "   Started: $(date)"
echo ""

export GOOGLE_GENERATIVE_AI_API_KEY="AIzaSyBnjtIe5OrkyaFgSvUy14r1mmcE3EN4D6M"

/opt/homebrew/bin/opencode run \
  -m google/gemini-3-pro-preview \
  --dir "$CGK_DIR" \
  "$(cat "$PROMPT_FILE")"

echo ""
echo "✅ OpenCode synthesis complete at $(date)"
