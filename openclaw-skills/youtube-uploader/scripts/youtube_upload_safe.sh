#!/usr/bin/env bash
# Safe wrapper for YouTube upload (calls _youtube_upload_internal.py)
# Requires SLACK_CHANNEL_ID and SLACK_THREAD_TS to be set -- exits loudly if not.
# Validates YouTube OAuth credentials before launching Python.
# Usage:
#   SLACK_CHANNEL_ID="<CHANNEL_ID>" SLACK_THREAD_TS="<THREAD_TS>" \
#     ./youtube_upload_safe.sh --file "/path/to/video.mp4" --title "My Video"

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
SKILL_ENV="$SCRIPT_DIR/../.env"
PROFILE_ENV="$PROFILE_ROOT/.env"

# Load YouTube credentials from skill .env, fall back to profile .env
load_yt_var() {
  local var_name="$1"
  local val=""
  # Check skill .env first
  if [ -f "$SKILL_ENV" ]; then
    val="$(grep -E "^${var_name}=" "$SKILL_ENV" 2>/dev/null | head -1 | cut -d= -f2-)"
  fi
  # Fall back to profile .env
  if [ -z "$val" ] && [ -f "$PROFILE_ENV" ]; then
    val="$(grep -E "^${var_name}=" "$PROFILE_ENV" 2>/dev/null | head -1 | cut -d= -f2-)"
  fi
  if [ -n "$val" ]; then
    export "$var_name=$val"
  fi
}

# Only load if not already set
[ -z "$YOUTUBE_CLIENT_ID" ] && load_yt_var "YOUTUBE_CLIENT_ID"
[ -z "$YOUTUBE_CLIENT_SECRET" ] && load_yt_var "YOUTUBE_CLIENT_SECRET"
[ -z "$YOUTUBE_REFRESH_TOKEN" ] && load_yt_var "YOUTUBE_REFRESH_TOKEN"
[ -z "$YOUTUBE_CHANNEL_ID" ] && load_yt_var "YOUTUBE_CHANNEL_ID"

# Also load SLACK_BOT_TOKEN for Slack posting
[ -z "$SLACK_BOT_TOKEN" ] && load_yt_var "SLACK_BOT_TOKEN"

# Validate required credentials
if [ -z "$YOUTUBE_CLIENT_ID" ]; then
  echo "ERROR: YOUTUBE_CLIENT_ID is required." >&2
  echo "Set it in $SKILL_ENV or $PROFILE_ENV" >&2
  exit 1
fi

if [ -z "$YOUTUBE_CLIENT_SECRET" ]; then
  echo "ERROR: YOUTUBE_CLIENT_SECRET is required." >&2
  echo "Set it in $SKILL_ENV or $PROFILE_ENV" >&2
  exit 1
fi

if [ -z "$YOUTUBE_REFRESH_TOKEN" ]; then
  echo "ERROR: YOUTUBE_REFRESH_TOKEN is required." >&2
  echo "Run: uv run $SCRIPT_DIR/youtube_auth_setup.py" >&2
  exit 1
fi

echo "Routing to channel: $SLACK_CHANNEL_ID thread: $SLACK_THREAD_TS"
YOUTUBE_UPLOAD_SAFE=1 exec uv run "$SCRIPT_DIR/_youtube_upload_internal.py" "$@"
