#!/usr/bin/env bash
# Safe wrapper for creative-analysis
# Requires SLACK_CHANNEL_ID and SLACK_THREAD_TS to be set -- replies in the calling thread.
# Validates required API keys are set before running -- exits loudly if not.
# Usage:
#   SLACK_CHANNEL_ID="<CHANNEL_ID>" SLACK_THREAD_TS="<THREAD_TS>" \
#     ./creative_analysis_safe.sh --date-preset last_7d --compare-preset last_30d --top 10

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILL_ENV="$SCRIPT_DIR/../.env"

if [ -z "$SLACK_CHANNEL_ID" ]; then
  echo "ERROR: SLACK_CHANNEL_ID is not set. Refusing to run." >&2
  echo "Set it to the chat_id from the inbound message metadata." >&2
  exit 1
fi

if [ -z "$SLACK_THREAD_TS" ]; then
  echo "ERROR: SLACK_THREAD_TS is not set. Refusing to run." >&2
  echo "Set it to the message_id from the inbound message metadata." >&2
  exit 1
fi

if [ -z "$META_ACCESS_TOKEN" ]; then
  # Try loading from .env
  if [ -f "$SKILL_ENV" ]; then
    META_ACCESS_TOKEN=$(grep -E '^META_ACCESS_TOKEN=' "$SKILL_ENV" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")
    export META_ACCESS_TOKEN
  fi
fi

if [ -z "$META_ACCESS_TOKEN" ]; then
  echo "ERROR: META_ACCESS_TOKEN is not set. Refusing to run." >&2
  echo "Set it in $SKILL_ENV" >&2
  exit 1
fi

if [ -z "$META_AD_ACCOUNT_ID" ]; then
  # Try loading from .env
  if [ -f "$SKILL_ENV" ]; then
    META_AD_ACCOUNT_ID=$(grep -E '^META_AD_ACCOUNT_ID=' "$SKILL_ENV" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")
    export META_AD_ACCOUNT_ID
  fi
fi

if [ -z "$META_AD_ACCOUNT_ID" ]; then
  echo "ERROR: META_AD_ACCOUNT_ID is not set. Refusing to run." >&2
  echo "Set it in $SKILL_ENV" >&2
  exit 1
fi

echo "Creative analysis: routing to channel=$SLACK_CHANNEL_ID thread=$SLACK_THREAD_TS"
CREATIVE_ANALYSIS_SAFE=1 exec uv run "$SCRIPT_DIR/meta_api_helper.py" creative-analysis "$@"
