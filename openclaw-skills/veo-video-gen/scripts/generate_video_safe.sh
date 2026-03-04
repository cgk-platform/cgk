#!/usr/bin/env bash
# Safe wrapper for video generation (calls _generate_video_internal.py)
# Requires SLACK_CHANNEL_ID and SLACK_THREAD_TS to be set -- exits loudly if not.
# Validates backend-specific credentials before launching Python.
# Usage:
#   SLACK_CHANNEL_ID="<CHANNEL_ID>" SLACK_THREAD_TS="<THREAD_TS>" \
#     ./generate_video_safe.sh --prompt "..." --filename "..." --backend veo-fast

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

# Parse --backend from args (default: vertex-veo-fast)
BACKEND="vertex-veo-fast"
PREV=""
for ARG in "$@"; do
  case "$PREV" in
    -b|--backend) BACKEND="$ARG" ;;
  esac
  PREV="$ARG"
done

# Load .env if credential vars are empty -- derive path from script location
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROFILE_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
ENV_FILE="$PROFILE_ROOT/.env"
if [ -f "$ENV_FILE" ]; then
  # Safe line-by-line parsing (no eval)
  while IFS='=' read -r key value; do
    case "$key" in
      KLING_ACCESS_KEY|KLING_SECRET_KEY|OPENAI_API_KEY)
        export "$key=$value"
        ;;
    esac
  done < <(grep -E '^(KLING_ACCESS_KEY|KLING_SECRET_KEY|OPENAI_API_KEY)=' "$ENV_FILE" 2>/dev/null)
fi

# Validate backend-specific credentials
case "$BACKEND" in
  kling-pro|kling-std)
    if [ -z "$KLING_ACCESS_KEY" ] || [ -z "$KLING_SECRET_KEY" ]; then
      echo "ERROR: KLING_ACCESS_KEY and KLING_SECRET_KEY required for $BACKEND backend." >&2
      echo "Set them in $ENV_FILE or as environment variables." >&2
      exit 1
    fi
    ;;
  sora)
    if [ -z "$OPENAI_API_KEY" ]; then
      echo "ERROR: OPENAI_API_KEY required for sora backend." >&2
      echo "Set it in $ENV_FILE or as an environment variable." >&2
      exit 1
    fi
    ;;
esac

echo "Routing to channel: $SLACK_CHANNEL_ID thread: $SLACK_THREAD_TS"
VIDEO_GEN_SAFE=1 exec uv run "$(dirname "$0")/_generate_video_internal.py" "$@"
