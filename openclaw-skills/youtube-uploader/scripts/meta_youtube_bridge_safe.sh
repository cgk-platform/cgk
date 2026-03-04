#!/usr/bin/env bash
# Safe wrapper for Meta-to-YouTube bridge (calls _meta_youtube_bridge_internal.py)
# Requires SLACK_CHANNEL_ID and SLACK_THREAD_TS to be set -- exits loudly if not.
# Validates both Meta and YouTube credentials before launching Python.
# Usage:
#   SLACK_CHANNEL_ID="<CHANNEL_ID>" SLACK_THREAD_TS="<THREAD_TS>" \
#     ./meta_youtube_bridge_safe.sh --top 20 --date-preset last_7d

set -e

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

# Derive profile root from script location
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROFILE_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
YT_SKILL_ENV="$SCRIPT_DIR/../.env"
META_SKILL_ENV="$PROFILE_ROOT/skills/meta-ads/.env"
PROFILE_ENV="$PROFILE_ROOT/.env"

# Generic credential loader: check skill .env, meta skill .env, then profile .env
load_var() {
  local var_name="$1"
  local val=""
  # Check YouTube skill .env first
  if [ -f "$YT_SKILL_ENV" ]; then
    val="$(grep -E "^${var_name}=" "$YT_SKILL_ENV" 2>/dev/null | head -1 | cut -d= -f2-)"
  fi
  # Check Meta skill .env
  if [ -z "$val" ] && [ -f "$META_SKILL_ENV" ]; then
    val="$(grep -E "^${var_name}=" "$META_SKILL_ENV" 2>/dev/null | head -1 | cut -d= -f2-)"
  fi
  # Fall back to profile .env
  if [ -z "$val" ] && [ -f "$PROFILE_ENV" ]; then
    val="$(grep -E "^${var_name}=" "$PROFILE_ENV" 2>/dev/null | head -1 | cut -d= -f2-)"
  fi
  if [ -n "$val" ]; then
    export "$var_name=$val"
  fi
}

# Load YouTube credentials (only if not already set)
[ -z "$YOUTUBE_CLIENT_ID" ] && load_var "YOUTUBE_CLIENT_ID"
[ -z "$YOUTUBE_CLIENT_SECRET" ] && load_var "YOUTUBE_CLIENT_SECRET"
[ -z "$YOUTUBE_REFRESH_TOKEN" ] && load_var "YOUTUBE_REFRESH_TOKEN"
[ -z "$YOUTUBE_CHANNEL_ID" ] && load_var "YOUTUBE_CHANNEL_ID"

# Load Meta credentials (only if not already set)
[ -z "$META_ACCESS_TOKEN" ] && load_var "META_ACCESS_TOKEN"
[ -z "$META_AD_ACCOUNT_ID" ] && load_var "META_AD_ACCOUNT_ID"
[ -z "$META_API_VERSION" ] && load_var "META_API_VERSION"

# Load Slack token
[ -z "$SLACK_BOT_TOKEN" ] && load_var "SLACK_BOT_TOKEN"

# Validate YouTube credentials
if [ -z "$YOUTUBE_CLIENT_ID" ]; then
  echo "ERROR: YOUTUBE_CLIENT_ID is required." >&2
  echo "Set it in $YT_SKILL_ENV or $PROFILE_ENV" >&2
  exit 1
fi

if [ -z "$YOUTUBE_CLIENT_SECRET" ]; then
  echo "ERROR: YOUTUBE_CLIENT_SECRET is required." >&2
  echo "Set it in $YT_SKILL_ENV or $PROFILE_ENV" >&2
  exit 1
fi

if [ -z "$YOUTUBE_REFRESH_TOKEN" ]; then
  echo "ERROR: YOUTUBE_REFRESH_TOKEN is required." >&2
  echo "Run: uv run $SCRIPT_DIR/youtube_auth_setup.py" >&2
  exit 1
fi

# Validate Meta credentials
if [ -z "$META_ACCESS_TOKEN" ]; then
  echo "ERROR: META_ACCESS_TOKEN is required." >&2
  echo "Set it in $META_SKILL_ENV or $PROFILE_ENV" >&2
  exit 1
fi

if [ -z "$META_AD_ACCOUNT_ID" ]; then
  echo "ERROR: META_AD_ACCOUNT_ID is required." >&2
  echo "Set it in $META_SKILL_ENV or $PROFILE_ENV" >&2
  exit 1
fi

echo "Routing to channel: $SLACK_CHANNEL_ID thread: $SLACK_THREAD_TS"
META_YT_BRIDGE_SAFE=1 exec uv run "$SCRIPT_DIR/_meta_youtube_bridge_internal.py" "$@"
