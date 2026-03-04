#!/usr/bin/env bash
# Safe wrapper for video extension (calls _extend_video_internal.py)
# Requires SLACK_CHANNEL_ID and SLACK_THREAD_TS to be set -- exits loudly if not.
# Reads .meta.json sidecar to detect backend and validate credentials upfront.
# Usage:
#   SLACK_CHANNEL_ID="<CHANNEL_ID>" SLACK_THREAD_TS="<THREAD_TS>" \
#     ./extend_video_safe.sh --video "..." --prompt "..." --extensions 3

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

# Parse --video from args to find .meta.json
VIDEO_PATH=""
PREV=""
for ARG in "$@"; do
  case "$PREV" in
    -v|--video) VIDEO_PATH="$ARG" ;;
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

# Detect backend from .meta.json and validate credentials
if [ -n "$VIDEO_PATH" ]; then
  META_PATH="${VIDEO_PATH%.*}.meta.json"
  if [ -f "$META_PATH" ]; then
    # Extract backend field from JSON (simple grep, no jq dependency)
    BACKEND=$(grep -o '"backend"[[:space:]]*:[[:space:]]*"[^"]*"' "$META_PATH" | head -1 | sed 's/.*"backend"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')
    case "$BACKEND" in
      kling-pro|kling-std)
        if [ -z "$KLING_ACCESS_KEY" ] || [ -z "$KLING_SECRET_KEY" ]; then
          echo "ERROR: KLING_ACCESS_KEY and KLING_SECRET_KEY required for $BACKEND extension." >&2
          echo "Set them in $ENV_FILE or as environment variables." >&2
          exit 1
        fi
        ;;
      sora)
        if [ -z "$OPENAI_API_KEY" ]; then
          echo "ERROR: OPENAI_API_KEY required for sora extension." >&2
          echo "Set it in $ENV_FILE or as an environment variable." >&2
          exit 1
        fi
        ;;
      vertex-veo|vertex-veo-fast|veo|veo-fast)
        # Vertex/Veo backends use GOOGLE_APPLICATION_CREDENTIALS (validated by Python)
        ;;
      "")
        echo "WARNING: No backend found in .meta.json -- Python script will determine backend." >&2
        ;;
      *)
        echo "ERROR: Unknown backend '$BACKEND' in $META_PATH. Refusing to run." >&2
        exit 1
        ;;
    esac
  else
    echo "WARNING: No .meta.json found at $META_PATH -- Python script will handle the error." >&2
  fi
fi

echo "Routing to channel: $SLACK_CHANNEL_ID thread: $SLACK_THREAD_TS"
VIDEO_EXTEND_SAFE=1 exec uv run "$(dirname "$0")/_extend_video_internal.py" "$@"
