#!/usr/bin/env bash
# Safe wrapper for ad generation (calls _generate_ads_internal.sh)
# Requires SLACK_CHANNEL_ID and SLACK_THREAD_TS to be set -- exits loudly if not.
#
# Usage:
#   SLACK_CHANNEL_ID="C0..." SLACK_THREAD_TS="1234..." \
#     ./generate_ads_safe.sh --category net-new --name "cooling-sheet" "prompt"
#
# Categories: net-new (default), iteration
# Clone ads go through clone_competitor.py plan + execute (NOT this script).
# Output: workspace/brand/creatives/<category>/<date>-<name>/
# Post-gen: uploads to Drive, posts 1:1 to Slack with Drive link, updates index.json

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROFILE_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

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

# ---------------------------------------------------------------------------
# Parse --category and --concept-name before passing remaining args through
# ---------------------------------------------------------------------------
CATEGORY="net-new"
CONCEPT_NAME_OVERRIDE=""
ITERATION_OF=""
COMPETITOR_REF=""
PASSTHROUGH_ARGS=()
AD_NAME=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --category)
            CATEGORY="$2"
            shift 2
            ;;
        --concept-name)
            CONCEPT_NAME_OVERRIDE="$2"
            shift 2
            ;;
        --iteration-of)
            ITERATION_OF="$2"
            shift 2
            ;;
        --competitor-ref)
            COMPETITOR_REF="$2"
            shift 2
            ;;
        --name)
            AD_NAME="$2"
            PASSTHROUGH_ARGS+=("$1" "$2")
            shift 2
            ;;
        *)
            PASSTHROUGH_ARGS+=("$1")
            shift
            ;;
    esac
done

# Validate category
case "$CATEGORY" in
    net-new|iteration) ;;
    clone)
        echo "ERROR: Clone ads go through clone_competitor.py, not generate_ads_safe.sh." >&2
        echo "Use: clone_competitor.py plan --session <ID> --index <N>" >&2
        echo "Then: clone_competitor.py execute --session <ID> --index <N>" >&2
        exit 1
        ;;
    *)
        echo "ERROR: Invalid --category '$CATEGORY'. Must be net-new or iteration." >&2
        exit 1
        ;;
esac

# Derive concept name: explicit override > --name > timestamp fallback
# Sanitize all name inputs (SEC: prevent shell injection via crafted names)
TIMESTAMP=$(date +%Y-%m-%d)
if [ -n "$CONCEPT_NAME_OVERRIDE" ]; then
    CONCEPT_NAME=$(echo "$CONCEPT_NAME_OVERRIDE" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9._-]/-/g' | sed 's/--*/-/g' | sed 's/^-//;s/-$//' | cut -c1-60)
elif [ -n "$AD_NAME" ]; then
    CONCEPT_NAME=$(echo "$AD_NAME" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9._-]/-/g' | sed 's/--*/-/g' | sed 's/^-//;s/-$//' | cut -c1-60)
else
    CONCEPT_NAME="ad-$(date +%H%M%S)"
fi

CONCEPT_ID="${TIMESTAMP}-${CONCEPT_NAME}"

# ---------------------------------------------------------------------------
# Create concept folder
# ---------------------------------------------------------------------------
CREATIVES_DIR="$PROFILE_ROOT/workspace/brand/creatives"
CONCEPT_DIR="$CREATIVES_DIR/$CATEGORY/$CONCEPT_ID"
mkdir -p "$CONCEPT_DIR"

echo "Creative output: $CONCEPT_DIR"
echo "Category: $CATEGORY | Concept: $CONCEPT_NAME"

# ---------------------------------------------------------------------------
# Auto-detect reference images from thread session history
# ---------------------------------------------------------------------------
SCANNER="$SCRIPT_DIR/scan_thread_media.py"
AUTO_IMAGE_ARGS=()
if [ -f "$SCANNER" ] && [ -n "$SLACK_THREAD_TS" ]; then
    while IFS= read -r img_path; do
        [ -n "$img_path" ] && AUTO_IMAGE_ARGS+=("--input-image" "$img_path")
    done < <(python3 "$SCANNER" "$SLACK_THREAD_TS" 2>/dev/null)
    if [ ${#AUTO_IMAGE_ARGS[@]} -gt 0 ]; then
        echo "Auto-detected $(( ${#AUTO_IMAGE_ARGS[@]} / 2 )) reference image(s) from thread $SLACK_THREAD_TS"
    fi
fi

# ---------------------------------------------------------------------------
# Run image generation into concept folder (suppress internal Slack uploads)
# ---------------------------------------------------------------------------
echo "Routing to channel: $SLACK_CHANNEL_ID thread: $SLACK_THREAD_TS"

if ! MEDIA_OUTPUT_DIR="$CONCEPT_DIR" \
     SKIP_SLACK_UPLOAD=1 \
     AD_GEN_SAFE=1 \
     "$SCRIPT_DIR/_generate_ads_internal.sh" "${AUTO_IMAGE_ARGS[@]}" "${PASSTHROUGH_ARGS[@]}"; then
    echo "ERROR: Image generation failed (see log for details)" >&2
    exit 1
fi

# ---------------------------------------------------------------------------
# Post-generation: Read manifest, upload to Drive, post to Slack, update index
# ---------------------------------------------------------------------------
MANIFEST="$CONCEPT_DIR/manifest.json"

if [ ! -f "$MANIFEST" ]; then
    echo "WARNING: No manifest.json found in $CONCEPT_DIR -- generation may have failed" >&2
    exit 0
fi

SUCCEEDED=$(MANIFEST_PATH="$MANIFEST" python3 -c "import json,os; print(json.load(open(os.environ['MANIFEST_PATH'])).get('succeeded',0))" 2>/dev/null || echo "0")
if [ "$SUCCEEDED" -eq 0 ] 2>/dev/null; then
    echo "WARNING: No images succeeded -- skipping post-generation steps" >&2
    exit 0
fi

# Extract prompt from passthrough args (last non-flag arg)
GEN_PROMPT=""
for arg in "${PASSTHROUGH_ARGS[@]}"; do
    if [[ "$arg" != --* ]]; then
        GEN_PROMPT="$arg"
    fi
done

# Save prompt.txt
if [ -n "$GEN_PROMPT" ]; then
    echo "$GEN_PROMPT" > "$CONCEPT_DIR/prompt.txt"
fi

# Upload to Drive + update index.json
UPLOADER="$SCRIPT_DIR/upload_creatives_to_drive.py"
DRIVE_URL=""
if [ -f "$UPLOADER" ]; then
    UPLOAD_ARGS=(
        "--concept-dir" "$CONCEPT_DIR"
        "--category" "$CATEGORY"
        "--concept-name" "$CONCEPT_NAME"
    )
    [ -n "$GEN_PROMPT" ] && UPLOAD_ARGS+=("--prompt" "$GEN_PROMPT")
    [ -n "$ITERATION_OF" ] && UPLOAD_ARGS+=("--iteration-of" "$ITERATION_OF")
    [ -n "$COMPETITOR_REF" ] && UPLOAD_ARGS+=("--competitor-ref-json" "$COMPETITOR_REF")

    DRIVE_URL=$(uv run "$UPLOADER" "${UPLOAD_ARGS[@]}" 2>/dev/null || echo "")
    if [ -n "$DRIVE_URL" ]; then
        echo "Drive: $DRIVE_URL"
    fi
fi

# ---------------------------------------------------------------------------
# Post 1:1 image to Slack with Drive link
# ---------------------------------------------------------------------------

# Read SLACK_BOT_TOKEN from openclaw.json if not in env (must be before the guard)
if [ -z "$SLACK_BOT_TOKEN" ]; then
    SLACK_BOT_TOKEN=$(PROFILE="$PROFILE_ROOT" python3 -c "
import json, os
try:
    d = json.load(open(os.path.join(os.environ['PROFILE'], 'openclaw.json')))
    print(d.get('channels',{}).get('slack',{}).get('botToken',''))
except: pass
" 2>/dev/null)
fi

SQUARE_IMG=""
for _f in "$CONCEPT_DIR"/*-1x1.png; do
    [ -f "$_f" ] && SQUARE_IMG="$_f" && break
done

if [ -n "$SQUARE_IMG" ] && [ -n "$SLACK_BOT_TOKEN" ] && [ -n "$SLACK_CHANNEL_ID" ]; then
    # Build Slack comment
    DISPLAY_NAME="$CONCEPT_NAME"
    COMMENT=":art: *${DISPLAY_NAME}*"
    if [ -n "$DRIVE_URL" ]; then
        COMMENT="$COMMENT\n:file_folder: <${DRIVE_URL}|View all sizes on Drive>"
    fi

    # Upload 1:1 image using Slack files API
    FSIZE=$(stat -f%z "$SQUARE_IMG" 2>/dev/null || stat -c%s "$SQUARE_IMG" 2>/dev/null)
    FNAME=$(basename "$SQUARE_IMG")

    # Step A: Get upload URL
    RESP=$(curl -s -X POST "https://slack.com/api/files.getUploadURLExternal" \
        -H "Authorization: Bearer $SLACK_BOT_TOKEN" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        --data-urlencode "filename=$FNAME" \
        --data-urlencode "length=$FSIZE" 2>/dev/null)

    OK=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('ok',''))" 2>/dev/null)
    if [ "$OK" = "True" ]; then
        URL=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['upload_url'])" 2>/dev/null)
        FID=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['file_id'])" 2>/dev/null)

        # Step B: Upload file
        curl -s -X POST "$URL" -F file=@"$SQUARE_IMG" >/dev/null 2>&1

        # Step C: Complete upload with comment
        THREAD_JSON=""
        [ -n "$SLACK_THREAD_TS" ] && THREAD_JSON=",\"thread_ts\":\"$SLACK_THREAD_TS\""

        curl -s -X POST "https://slack.com/api/files.completeUploadExternal" \
            -H "Authorization: Bearer $SLACK_BOT_TOKEN" \
            -H "Content-Type: application/json" \
            -d "{\"files\":[{\"id\":\"$FID\",\"title\":\"${DISPLAY_NAME} -- 1:1 (Square)\"}],\"channel_id\":\"$SLACK_CHANNEL_ID\",\"initial_comment\":\"$COMMENT\"$THREAD_JSON}" >/dev/null 2>&1

        echo "Posted 1:1 preview to Slack"
    fi
fi

# Also copy/symlink images to media/ for backward compatibility
for img in "$CONCEPT_DIR"/*.png; do
    [ -f "$img" ] && ln -sf "$img" "$PROFILE_ROOT/media/$(basename "$img")" 2>/dev/null || true
done

echo "Done. Concept: $CONCEPT_ID | Category: $CATEGORY"
