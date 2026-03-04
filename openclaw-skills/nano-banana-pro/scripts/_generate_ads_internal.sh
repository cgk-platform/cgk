#!/usr/bin/env bash
# DO NOT USE set -e -- we handle errors per-image so one failure doesn't kill the batch
# Ignore SIGPIPE so broken exec pipes don't kill concurrent runs
trap '' PIPE

# Ad Image Generator - Generates 3 images (1 prompt x 3 ratios: 1:1, 9:16, 16:9) uploaded individually to Slack thread
# Internal script -- called by generate_ads_safe.sh. Do NOT invoke directly.

# PATH hardening -- ensure Homebrew tools (gtimeout, uv, etc.) are findable on macOS host.
# Harmless inside Docker containers where /opt/homebrew doesn't exist.
[[ -d /opt/homebrew/bin ]] && export PATH="/opt/homebrew/bin:$PATH"

# Timeout wrapper -- prefer gtimeout (GNU coreutils), fall back to timeout (BSD/macOS)
if command -v gtimeout &>/dev/null; then
    TIMEOUT_CMD="gtimeout"
elif command -v timeout &>/dev/null; then
    TIMEOUT_CMD="timeout"
else
    # No timeout available -- define a passthrough that just runs the command
    TIMEOUT_CMD=""
fi

# Derive profile root from script location (4 dirs up: <root>/skills/nano-banana-pro/scripts/this.sh)
PROFILE_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"

TIMESTAMP=$(date +%Y-%m-%d-%H-%M-%S)
BASE_DIR="${MEDIA_OUTPUT_DIR:-$PROFILE_ROOT/media}"
INBOUND_DIR="$PROFILE_ROOT/media/inbound"
SCRIPT="$PROFILE_ROOT/skills/nano-banana-pro/scripts/generate_image.py"
LOG_FILE="$BASE_DIR/generate-${TIMESTAMP}-$$.log"

# Print log path for the agent, then fully detach from exec pipe.
# This makes the script immune to BrokenPipeError when OpenClaw backgrounds
# the process. All subsequent output goes to the log file only.
echo "LOG:$LOG_FILE"
exec >>"$LOG_FILE" 2>&1

# --- Safe wrapper gate: block direct calls ---
if [ "$AD_GEN_SAFE" != "1" ]; then
  echo "ERROR: Direct calls to this script are blocked."
  echo "Use generate_ads_safe.sh instead -- it is the ONLY valid entry point."
  exit 1
fi

# Slack config -- MUST be passed as env vars, no hardcoded defaults
SLACK_CHANNEL_ID="${SLACK_CHANNEL_ID:-}"
SLACK_THREAD_TS="${SLACK_THREAD_TS:-}"

# Auto-read SLACK_BOT_TOKEN from this profile's openclaw.json if not in env
if [ -z "$SLACK_BOT_TOKEN" ]; then
    SLACK_BOT_TOKEN=$(python3 -c "
import json, sys
try:
    d = json.load(open('$PROFILE_ROOT/openclaw.json'))
    print(d.get('channels',{}).get('slack',{}).get('botToken',''))
except:
    pass
" 2>/dev/null)
fi

# Outbound allowlist check -- block posts to channels not in openclaw.json
# DMs (D-prefix) always allowed -- user is talking directly to the bot
if [ -n "$SLACK_CHANNEL_ID" ]; then
    if [[ "$SLACK_CHANNEL_ID" != D* ]]; then
        ALLOWED=$(python3 -c "
import json
try:
    d = json.load(open('$PROFILE_ROOT/openclaw.json'))
    print('yes' if '$SLACK_CHANNEL_ID' in d.get('channels',{}).get('slack',{}).get('channels',{}) else 'no')
except: print('no')
" 2>/dev/null)
        if [ "$ALLOWED" = "no" ]; then
            echo "[Slack] BLOCKED: $SLACK_CHANNEL_ID not in workspace allowlist"
            exit 0
        fi
    fi
fi

# Build thread_ts JSON fragment for Slack uploads (empty if not in a thread)
THREAD_JSON=""
if [ -n "$SLACK_THREAD_TS" ]; then
    THREAD_JSON=",\"thread_ts\":\"$SLACK_THREAD_TS\""
fi

# Config
MAX_RETRIES=2
RETRY_DELAY=10
IMAGE_TIMEOUT=120  # 2 min per attempt
PRIMARY_BACKEND="vertex-gemini"
FALLBACK_BACKEND="gemini"

# Counters
SUCCEEDED=0
FAILED=0
TOTAL=3
FAILED_FILES=""

# Parse optional flags before positional prompt args
# Use bash arrays so paths with spaces are preserved correctly
INPUT_IMAGES=()
INPUT_IMAGE_ARGS=()
NO_LOGO=false
AD_NAME=""
EXPECT_REFS=0
while [[ "$1" == --* ]]; do
    case "$1" in
        --input-image|--reference-image)
            INPUT_IMAGES+=("$2")
            INPUT_IMAGE_ARGS+=("-i" "$2")
            shift 2
            ;;
        --no-logo)
            NO_LOGO=true
            shift
            ;;
        --name)
            # Sanitize: lowercase, replace spaces/special chars with hyphens, trim to 60 chars
            AD_NAME=$(echo "$2" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9._-]/-/g' | sed 's/--*/-/g' | sed 's/^-//;s/-$//' | cut -c1-60)
            shift 2
            ;;
        --expect-references)
            EXPECT_REFS="$2"
            shift 2
            ;;
        *)
            echo "Unknown flag: $1" >&2
            shift
            ;;
    esac
done

# Reference image gate: if --expect-references N was set, verify we got at least N images
if [ "$EXPECT_REFS" -gt 0 ] 2>/dev/null && [ "${#INPUT_IMAGES[@]}" -lt "$EXPECT_REFS" ]; then
    echo "ERROR: Expected $EXPECT_REFS reference image(s) but only got ${#INPUT_IMAGES[@]}." >&2
    echo "The user uploaded $EXPECT_REFS image(s) in the thread. You MUST pass ALL of them as --input-image flags." >&2
    echo "Find them in media/inbound/ and add --input-image <path> for each one." >&2
    exit 1
fi

# Deduplicate INPUT_IMAGES (auto-scan + manual may overlap)
if [ ${#INPUT_IMAGES[@]} -gt 1 ]; then
    UNIQUE_IMAGES=()
    UNIQUE_ARGS=()
    SEEN_LIST=""
    for img in "${INPUT_IMAGES[@]}"; do
        REAL_IMG="$(realpath "$img" 2>/dev/null || echo "$img")"
        case " $SEEN_LIST " in
            *" $REAL_IMG "*)
                # Already seen -- skip duplicate
                ;;
            *)
                SEEN_LIST="$SEEN_LIST $REAL_IMG"
                UNIQUE_IMAGES+=("$img")
                UNIQUE_ARGS+=("-i" "$img")
                ;;
        esac
    done
    INPUT_IMAGES=("${UNIQUE_IMAGES[@]}")
    INPUT_IMAGE_ARGS=("${UNIQUE_ARGS[@]}")
fi

# Build filename prefix: TIMESTAMP or TIMESTAMP-name
if [ -n "$AD_NAME" ]; then
    FILE_PREFIX="${TIMESTAMP}-${AD_NAME}"
else
    FILE_PREFIX="${TIMESTAMP}"
fi

# Single prompt -- the same image resized to 3 aspect ratios
PROMPT="${1:-}"
if [ -z "$PROMPT" ]; then
  echo "ERROR: No prompt provided. Pass a prompt as the first argument." >&2
  exit 1
fi

# Logging helper -- stdout/stderr are already redirected to LOG_FILE via exec
log() {
    echo "[$(date '+%H:%M:%S')] $*"
}

# Generate a single image with retries and fallback backend
# Args: filename prompt aspect [extra_args...]
# Extra args (after the 3 required) are passed directly to the generate_image.py call.
# Used for consistency references (e.g., -i /path/to/1x1.png for ratio variants).
generate_with_retry() {
    local filename="$1"
    local prompt="$2"
    local aspect="$3"
    shift 3
    local extra_args=("$@")
    local attempt=1
    local delay=$RETRY_DELAY

    while [ $attempt -le $MAX_RETRIES ]; do
        log "  Attempt $attempt/$MAX_RETRIES (backend: $PRIMARY_BACKEND)"
        local START_TIME=$(date +%s)

        if ${TIMEOUT_CMD:+$TIMEOUT_CMD $IMAGE_TIMEOUT} uv run "$SCRIPT" \
            --prompt "$prompt" \
            "${LOGO_ARGS[@]}" \
            "${INPUT_IMAGE_ARGS[@]}" \
            "${extra_args[@]}" \
            --filename "$filename" \
            --aspect-ratio "$aspect" \
            --resolution 2K \
            --backend "$PRIMARY_BACKEND" ; then

            local END_TIME=$(date +%s)
            log "  OK ($(($END_TIME - $START_TIME))s)"
            return 0
        fi

        local END_TIME=$(date +%s)
        log "  FAILED after $(($END_TIME - $START_TIME))s"

        # On final retry, try fallback backend
        if [ "$attempt" -eq "$MAX_RETRIES" ] && [ -n "$FALLBACK_BACKEND" ] && [ "$FALLBACK_BACKEND" != "$PRIMARY_BACKEND" ]; then
            log "  Trying fallback backend: $FALLBACK_BACKEND"
            if ${TIMEOUT_CMD:+$TIMEOUT_CMD $IMAGE_TIMEOUT} uv run "$SCRIPT" \
                --prompt "$prompt" \
                "${LOGO_ARGS[@]}" \
                "${INPUT_IMAGE_ARGS[@]}" \
                "${extra_args[@]}" \
                --filename "$filename" \
                --aspect-ratio "$aspect" \
                --resolution 2K \
                --backend "$FALLBACK_BACKEND" ; then

                local END_TIME=$(date +%s)
                log "  OK via fallback ($(($END_TIME - $START_TIME))s)"
                return 0
            fi
            log "  Fallback also failed"
        fi

        if [ $attempt -lt $MAX_RETRIES ]; then
            log "  Retrying in ${delay}s..."
            sleep $delay
            delay=$((delay * 2))
        fi
        attempt=$((attempt + 1))
    done

    return 1
}

# Task tracking -- per-task file in active-tasks.d/ (no shared file = no race condition)
TASKS_DIR="$PROFILE_ROOT/workspace/memory/active-tasks.d"
TASK_ID="generate-ads-${FILE_PREFIX}-$$"
TASK_FILE="$TASKS_DIR/${TASK_ID}.json"
mkdir -p "$TASKS_DIR"

register_task() {
    python3 -c "
import json, sys, os
from datetime import datetime, timezone
json.dump({
    'taskId': sys.argv[1],
    'type': 'image-generation',
    'channel': 'channel:' + sys.argv[2],
    'threadId': sys.argv[3] if sys.argv[3] else '',
    'task': 'Ad batch generation (3 images -- 1:1, 9:16, 16:9)',
    'startedAt': datetime.now(timezone.utc).isoformat(),
    'pid': os.getpid(),
    'logFile': sys.argv[4]
}, open(sys.argv[5], 'w'), indent=2)
" "$TASK_ID" "$SLACK_CHANNEL_ID" "$SLACK_THREAD_TS" "$LOG_FILE" "$TASK_FILE" 2>/dev/null || true
}

deregister_task() {
    rm -f "$TASK_FILE" 2>/dev/null
}

# Register now; deregister on normal exit or unexpected termination
register_task
trap 'deregister_task' EXIT

log "=== ADS GENERATOR ==="
log "Profile root: $PROFILE_ROOT"
log "Timestamp: $TIMESTAMP"
if [ -n "$AD_NAME" ]; then
    log "Name: $AD_NAME"
fi
log "File prefix: $FILE_PREFIX"
log "Log file: $LOG_FILE"
log "Backend: $PRIMARY_BACKEND (fallback: $FALLBACK_BACKEND)"
log "Retries: $MAX_RETRIES | Timeout: ${IMAGE_TIMEOUT}s per image"
if [ "$NO_LOGO" = true ]; then
    log "Logo: disabled (--no-logo)"
fi
if [ ${#INPUT_IMAGES[@]} -gt 0 ]; then
    log "Reference image(s) (${#INPUT_IMAGES[@]}):"
    for img in "${INPUT_IMAGES[@]}"; do
        log "  - $img"
    done
fi
log ""

# STEP 1: Check for brand logo
log "STEP 1: Checking for brand logo..."
LOGO_ARGS=()
BRAND_DIR="$PROFILE_ROOT/workspace/brand"

if [ "$NO_LOGO" = true ]; then
    log "Logo disabled (--no-logo)"
else
    # Brand logo from workspace/brand/ -- the ONLY automatic logo source
    BRAND_LOGO=$(ls "$BRAND_DIR"/logo-primary.{png,jpg,jpeg,webp,gif} 2>/dev/null | head -1)
    if [ -n "$BRAND_LOGO" ]; then
        log "Using brand logo: $BRAND_LOGO"
        LOGO_ARGS=("-i" "$BRAND_LOGO")
    else
        log "No brand logo found (place one at $BRAND_DIR/logo-primary.png)"
    fi
fi
log ""

# STEP 2: Generate 3 images (same prompt x 3 aspect ratios)
# Strategy: generate 1:1 first, then use it as a style/consistency reference
# for 9:16 and 16:9 so all 3 ratios share the same visual identity.
log "STEP 2: Generating $TOTAL images (1 prompt x 3 ratios: 1:1, 9:16, 16:9)..."
log "Prompt: $PROMPT"
log ""
BATCH_START=$(date +%s)

# 1:1 (square) -- generated first, used as style reference for other ratios
SQUARE_IMAGE="$BASE_DIR/${FILE_PREFIX}-1x1.png"
log "PROGRESS: 1/${TOTAL} -- 1:1 (square)"
if generate_with_retry "$SQUARE_IMAGE" "$PROMPT" "1:1"; then
    SUCCEEDED=$((SUCCEEDED + 1))
else
    FAILED=$((FAILED + 1))
    FAILED_FILES="$FAILED_FILES 1x1"
fi

# Use generated 1:1 as consistency reference for remaining ratios
CONSISTENCY_ARGS=()
CONSISTENCY_PREFIX=""
if [ -f "$SQUARE_IMAGE" ]; then
    CONSISTENCY_ARGS=("-i" "$SQUARE_IMAGE")
    CONSISTENCY_PREFIX="A reference of the 1:1 square version is provided. Adapt this EXACT design to this aspect ratio. Maintain visual consistency -- same composition, colors, product placement, text, and layout. Only adjust cropping and spacing for the new ratio. "
    log "Using 1:1 image as consistency reference for remaining ratios"
fi

# 9:16 (vertical / Stories / Reels) -- uses 1:1 as reference
log "PROGRESS: 2/${TOTAL} -- 9:16 (vertical)"
if generate_with_retry "$BASE_DIR/${FILE_PREFIX}-9x16.png" \
    "${CONSISTENCY_PREFIX}${PROMPT}" "9:16" "${CONSISTENCY_ARGS[@]}"; then
    SUCCEEDED=$((SUCCEEDED + 1))
else
    FAILED=$((FAILED + 1))
    FAILED_FILES="$FAILED_FILES 9x16"
fi

# 16:9 (landscape) -- uses 1:1 as reference
log "PROGRESS: 3/${TOTAL} -- 16:9 (landscape)"
if generate_with_retry "$BASE_DIR/${FILE_PREFIX}-16x9.png" \
    "${CONSISTENCY_PREFIX}${PROMPT}" "16:9" "${CONSISTENCY_ARGS[@]}"; then
    SUCCEEDED=$((SUCCEEDED + 1))
else
    FAILED=$((FAILED + 1))
    FAILED_FILES="$FAILED_FILES 16x9"
fi

log "Generation done ($SUCCEEDED succeeded, $FAILED failed)"
log ""

BATCH_END=$(date +%s)
BATCH_ELAPSED=$((BATCH_END - BATCH_START))

log "Generation complete: $SUCCEEDED/$TOTAL succeeded, $FAILED failed (${BATCH_ELAPSED}s total)"
if [ -n "$FAILED_FILES" ]; then
    log "Failed images:$FAILED_FILES"
fi
log ""

# Write manifest.json for post-generation tooling
cat > "$BASE_DIR/manifest.json" << MANIFEST_EOF
{
  "files": {
    "1x1": "$BASE_DIR/${FILE_PREFIX}-1x1.png",
    "9x16": "$BASE_DIR/${FILE_PREFIX}-9x16.png",
    "16x9": "$BASE_DIR/${FILE_PREFIX}-16x9.png"
  },
  "file_prefix": "$FILE_PREFIX",
  "timestamp": "$TIMESTAMP",
  "succeeded": $SUCCEEDED,
  "failed": $FAILED,
  "log": "$LOG_FILE"
}
MANIFEST_EOF
log "Wrote manifest: $BASE_DIR/manifest.json"

# STEP 3: Upload each image to Slack thread individually
log "STEP 3: Uploading images to Slack..."

UPLOAD_MAX_RETRIES=5
UPLOAD_INITIAL_DELAY=2
UPLOADED=0

if [ "${SKIP_SLACK_UPLOAD:-0}" = "1" ]; then
    log "Slack upload skipped (SKIP_SLACK_UPLOAD=1) -- caller handles Slack posting"
elif [ -n "$SLACK_BOT_TOKEN" ] && [ -n "$SLACK_CHANNEL_ID" ]; then

    # Helper: make an HTTP request with retries + exponential backoff
    slack_request() {
        local attempt=1
        local delay=$UPLOAD_INITIAL_DELAY
        local resp http_code body retry_after

        while [ $attempt -le $UPLOAD_MAX_RETRIES ]; do
            resp=$(curl -s -w "\n%{http_code}" --connect-timeout 10 --max-time 60 "$@" )
            local curl_exit=$?

            if [ $curl_exit -ne 0 ]; then
                log "  Upload attempt $attempt/$UPLOAD_MAX_RETRIES: network error (curl exit $curl_exit), retrying in ${delay}s..."
                sleep $delay
                delay=$((delay * 2))
                attempt=$((attempt + 1))
                continue
            fi

            http_code=$(echo "$resp" | tail -1)
            body=$(echo "$resp" | sed '$d')

            if [ "$http_code" = "429" ]; then
                retry_after=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin).get('retry_after', $delay))" 2>/dev/null || echo "$delay")
                log "  Rate limited (429), waiting ${retry_after}s..."
                sleep "$retry_after"
                delay=$((delay * 2))
                attempt=$((attempt + 1))
                continue
            elif [ "$http_code" -ge 500 ] 2>/dev/null; then
                log "  Server error ($http_code), retrying in ${delay}s..."
                sleep $delay
                delay=$((delay * 2))
                attempt=$((attempt + 1))
                continue
            fi

            echo "$body"
            return 0
        done

        log "  Request failed after $UPLOAD_MAX_RETRIES attempts"
        echo "REQUEST_FAILED"
        return 1
    }

    # Upload a single file and complete it as a Slack message in the thread
    upload_and_post() {
        local FILEPATH=$1
        local TITLE=$2
        local FSIZE
        FSIZE=$(stat -f%z "$FILEPATH" 2>/dev/null || stat -c%s "$FILEPATH" 2>/dev/null)
        local FNAME=$(basename "$FILEPATH")

        # Step A: Get upload URL
        local RESP
        RESP=$(slack_request -X POST "https://slack.com/api/files.getUploadURLExternal" \
          -H "Authorization: Bearer $SLACK_BOT_TOKEN" \
          -H "Content-Type: application/x-www-form-urlencoded" \
          --data-urlencode "filename=$FNAME" \
          --data-urlencode "length=$FSIZE")

        if [ "$RESP" = "REQUEST_FAILED" ]; then
            log "  getUploadURL failed (network)"
            return 1
        fi

        local OK
        OK=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('ok',''))")
        if [ "$OK" != "True" ]; then
            log "  getUploadURL failed: $RESP"
            return 1
        fi

        local URL FID
        URL=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['upload_url'])")
        FID=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['file_id'])")

        # Step B: Upload file to presigned URL
        local UPLOAD_RESP
        UPLOAD_RESP=$(slack_request -X POST "$URL" -F file=@"$FILEPATH")
        if [ "$UPLOAD_RESP" = "REQUEST_FAILED" ]; then
            log "  File upload to presigned URL failed"
            return 1
        fi

        # Step C: Complete upload -- posts the file as a message in the channel/thread
        local COMPLETE_RESP
        COMPLETE_RESP=$(slack_request -X POST "https://slack.com/api/files.completeUploadExternal" \
          -H "Authorization: Bearer $SLACK_BOT_TOKEN" \
          -H "Content-Type: application/json" \
          -d "{\"files\":[{\"id\":\"$FID\",\"title\":\"$TITLE\"}],\"channel_id\":\"$SLACK_CHANNEL_ID\",\"initial_comment\":\"*$TITLE*\"$THREAD_JSON}")

        if [ "$COMPLETE_RESP" = "REQUEST_FAILED" ]; then
            log "  completeUpload failed (network)"
            return 1
        fi

        local COMPLETE_OK
        COMPLETE_OK=$(echo "$COMPLETE_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('ok',''))")
        if [ "$COMPLETE_OK" = "True" ]; then
            log "  Uploaded: $TITLE"
            return 0
        else
            log "  completeUpload failed: $COMPLETE_RESP"
            return 1
        fi
    }

    # Build display name for Slack titles (original casing from --name, or empty)
    DISPLAY_NAME=""
    if [ -n "$AD_NAME" ]; then
        DISPLAY_NAME="$AD_NAME -- "
    fi

    # Upload each image individually to the thread
    for RATIO_FILE in "1x1:1:1 (Square)" "9x16:9:16 (Vertical -- Stories/Reels)" "16x9:16:9 (Landscape)"; do
        RATIO_KEY="${RATIO_FILE%%:*}"
        RATIO_TITLE="${RATIO_FILE#*:}"
        IMG_PATH="$BASE_DIR/${FILE_PREFIX}-${RATIO_KEY}.png"

        if [ -f "$IMG_PATH" ]; then
            log "  Uploading $RATIO_KEY..."
            if upload_and_post "$IMG_PATH" "${DISPLAY_NAME}${RATIO_TITLE}"; then
                UPLOADED=$((UPLOADED + 1))
            else
                log "  Failed to upload $RATIO_KEY"
            fi
            # Small delay between uploads to avoid rate limits
            sleep 1
        else
            log "  Skipping $RATIO_KEY (not generated)"
        fi
    done

    log "Uploaded $UPLOADED/$SUCCEEDED images to Slack"
else
    log "SLACK_BOT_TOKEN or SLACK_CHANNEL_ID not set - skipping upload"
    log "Images available at: $BASE_DIR/${FILE_PREFIX}-*.png"
fi
log ""

log "=== DONE ==="
log "Results: $SUCCEEDED/$TOTAL generated, $UPLOADED uploaded | ${BATCH_ELAPSED}s total"
log "Images: $BASE_DIR/${FILE_PREFIX}-1x1.png, $BASE_DIR/${FILE_PREFIX}-9x16.png, $BASE_DIR/${FILE_PREFIX}-16x9.png"
log "Log: $LOG_FILE"
