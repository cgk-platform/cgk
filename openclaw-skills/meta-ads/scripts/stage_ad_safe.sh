#!/usr/bin/env bash
# Unified ad pipeline wrapper for meta_api_helper.py (stage-ad + launch-ad)
# Enforces a multi-step workflow: each step MUST complete before the next.
# Agents cannot skip steps because 'plan' validates session state.
# Routes to stage-ad or launch-ad based on destination choice.
#
# Workflow:
#   1. start --media <path>[,<path2>,<path3>]             -> creates session, checks media
#   2. confirm-media --session <ID> --description "..."  -> records vision analysis
#   3. set-product --session <ID> --product "..."        -> records user-confirmed product
#   4. get-copy-options --session <ID> [--top 5]         -> shows copy options with ROAS
#   5. set-copy --session <ID> --copy-from <ad_id>       -> records user's copy choice
#   6. set-destination --session <ID> --campaign-id <ID> --adset-id <ID>  -> campaign/adset selection
#   7. set-budget --session <ID> --budget 50 --budget-type daily          -> budget + bid strategy
#   8. set-status --session <ID> --status PAUSED|ACTIVE                   -> ad status
#   9. plan --session <ID> [--name "Ad Name"]            -> creates plan (ONLY if steps 1-8 complete)
#  10. execute --plan <plan_file>                        -> routes to stage-ad or launch-ad
#
# Additional:
#   session-status --session <ID>   -> show step completion
#   list-sessions                   -> list active sessions
#   check-media --path <path>       -> standalone media check

set -euo pipefail

# --- Derive profile root from script location (no hardcoded paths) ---
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROFILE_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
HELPER="$SCRIPT_DIR/meta_api_helper.py"
PLANS_DIR="$PROFILE_ROOT/workspace/.staging-plans"
SESSIONS_DIR="$PROFILE_ROOT/workspace/.staging-sessions"
SESSION_TTL=3600      # 60 minutes
PLAN_TTL=1800         # 30 minutes
CLEANUP_AGE=86400     # 24 hours

# --- Temporal hard gate constants ---
GATE_DIR="$SESSIONS_DIR/gates"
GATE_MIN_DELAY=30

_check_gate() {
  local gate_file="$1" entry_name="$2" exit_name="$3"
  if [[ ! -f "$gate_file" ]]; then
    echo "ERROR: HARD GATE -- $entry_name must run before $exit_name." >&2
    exit 1
  fi
  local gate_ts age
  gate_ts="$(cat "$gate_file")"
  age=$(( $(date +%s) - gate_ts ))
  if [[ "$age" -lt "$GATE_MIN_DELAY" ]]; then
    echo "ERROR: HARD GATE -- ${GATE_MIN_DELAY}s minimum between $entry_name and $exit_name (${age}s elapsed)." >&2
    echo "This gate requires user input via Slack. Do not auto-proceed." >&2
    exit 1
  fi
}

_write_gate() {
  local gate_file="$1"
  mkdir -p "$GATE_DIR" 2>/dev/null || true
  echo "$(date +%s)" > "$gate_file"
}

# --- Load credentials from profile .env (safe line-by-line, no eval) ---
ENV_FILE="$PROFILE_ROOT/.env"
if [ -f "$ENV_FILE" ]; then
  while IFS='=' read -r key value; do
    case "$key" in
      META_ACCESS_TOKEN|META_APP_ID|META_APP_SECRET|META_AD_ACCOUNT_ID)
        export "$key=$value"
        ;;
    esac
  done < <(grep -E '^(META_ACCESS_TOKEN|META_APP_ID|META_APP_SECRET|META_AD_ACCOUNT_ID)=' "$ENV_FILE" 2>/dev/null)
fi
# Also load from skill .env if available
SKILL_ENV="$SCRIPT_DIR/../.env"
if [ -f "$SKILL_ENV" ]; then
  while IFS='=' read -r key value; do
    case "$key" in
      META_ACCESS_TOKEN|META_APP_ID|META_APP_SECRET|META_AD_ACCOUNT_ID|META_BUSINESS_ID|META_PIXEL_ID)
        export "$key=$value"
        ;;
    esac
  done < <(grep -E '^(META_ACCESS_TOKEN|META_APP_ID|META_APP_SECRET|META_AD_ACCOUNT_ID|META_BUSINESS_ID|META_PIXEL_ID)=' "$SKILL_ENV" 2>/dev/null)
fi

# --- Validate Slack delivery env vars ---
validate_slack_env() {
  if [ -z "${SLACK_CHANNEL_ID:-}" ]; then
    echo "ERROR: SLACK_CHANNEL_ID is not set. Refusing to run." >&2
    echo "Set it to the chat_id from the inbound message metadata." >&2
    exit 1
  fi
  if [ -z "${SLACK_THREAD_TS:-}" ]; then
    echo "ERROR: SLACK_THREAD_TS is not set. Refusing to run." >&2
    echo "Set it to the message_id from the inbound message metadata." >&2
    exit 1
  fi
}

# --- Media readiness check ---
check_media_ready() {
  local filepath="$1"
  local max_wait="${2:-60}"
  local poll_interval=3

  if [ ! -e "$filepath" ]; then
    echo "ERROR: File not found: $filepath" >&2
    return 1
  fi
  if [ ! -r "$filepath" ]; then
    echo "ERROR: File not readable: $filepath" >&2
    return 1
  fi

  local elapsed=0
  local prev_size
  prev_size=$(stat -f%z "$filepath" 2>/dev/null || stat --format=%s "$filepath" 2>/dev/null)

  while [ "$elapsed" -lt "$max_wait" ]; do
    sleep "$poll_interval"
    elapsed=$((elapsed + poll_interval))
    local curr_size
    curr_size=$(stat -f%z "$filepath" 2>/dev/null || stat --format=%s "$filepath" 2>/dev/null)
    if [ "$curr_size" = "$prev_size" ]; then
      echo "$curr_size"
      return 0
    fi
    prev_size="$curr_size"
    echo "  File still downloading... ($curr_size bytes, ${elapsed}s elapsed)" >&2
  done

  echo "ERROR: File size still changing after ${max_wait}s -- upload may not be complete." >&2
  return 2
}

# --- Get media info via ffprobe ---
get_media_info() {
  local filepath="$1"
  local ext="${filepath##*.}"
  ext=$(echo "$ext" | tr '[:upper:]' '[:lower:]')

  local media_type="unknown"
  case "$ext" in
    mp4|mov|avi|mkv|webm) media_type="video" ;;
    png|jpg|jpeg|webp|gif|bmp|tiff) media_type="image" ;;
  esac

  local dimensions="unknown"
  local duration=""
  local fps=""
  local codec=""
  if command -v ffprobe >/dev/null 2>&1; then
    local width height
    width=$(ffprobe -v error -select_streams v:0 -show_entries stream=width -of csv=p=0 "$filepath" 2>/dev/null || true)
    height=$(ffprobe -v error -select_streams v:0 -show_entries stream=height -of csv=p=0 "$filepath" 2>/dev/null || true)
    if [ -n "$width" ] && [ -n "$height" ]; then
      dimensions="${width}x${height}"
    fi
    if [ "$media_type" = "video" ]; then
      duration=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$filepath" 2>/dev/null | cut -d. -f1 || true)
      fps=$(ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate -of csv=p=0 "$filepath" 2>/dev/null || true)
      codec=$(ffprobe -v error -select_streams v:0 -show_entries stream=codec_name -of csv=p=0 "$filepath" 2>/dev/null || true)
    fi
  fi

  # Return pipe-delimited: type|dimensions|duration|fps|codec
  echo "$media_type|$dimensions|${duration:-}|${fps:-}|${codec:-}"
}

# --- Sandbox path resolution ---
# Elevated exec runs on the HOST, not inside the sandbox container.
# The agent may pass /workspace/ paths (sandbox-internal). Translate them
# to the real host path ($PROFILE_ROOT) so the script works regardless.
resolve_host_path() {
  local path="$1"
  case "$path" in
    /workspace/*)
      local resolved="${PROFILE_ROOT}${path#/workspace}"
      echo "NOTE: Translated sandbox path -> host path:" >&2
      echo "  $path -> $resolved" >&2
      echo "  (Use absolute host paths to avoid this translation.)" >&2
      echo "$resolved"
      ;;
    /workspace)
      echo "$PROFILE_ROOT"
      ;;
    *)
      echo "$path"
      ;;
  esac
}

# --- JSON string escaping (no jq dependency) ---
json_escape() {
  local s="$1"
  s="${s//\\/\\\\}"
  s="${s//\"/\\\"}"
  s="${s//$'\n'/\\n}"
  s="${s//$'\r'/\\r}"
  s="${s//$'\t'/\\t}"
  echo "$s"
}

# --- Read a field from a plan JSON file (python3, handles escapes correctly) ---
_plan_get() {
  python3 -c "
import json, sys
with open(sys.argv[1]) as f:
    d = json.load(f)
v = d.get(sys.argv[2], '')
if isinstance(v, list):
    v = ','.join(str(x) for x in v)
sys.stdout.write(str(v))
" "$1" "$2"
}

# --- Write key=value pairs to a session JSON file (python3, no sed corruption) ---
_session_set() {
  local session_file="$1"; shift
  python3 -c "
import json, sys
with open(sys.argv[1]) as f:
    d = json.load(f)
for pair in sys.argv[2:]:
    eq = pair.index('=')
    k, v = pair[:eq], pair[eq+1:]
    if v == 'true': d[k] = True
    elif v == 'false': d[k] = False
    else: d[k] = v
with open(sys.argv[1] + '.tmp', 'w') as f:
    json.dump(d, f, indent=2, ensure_ascii=False)
" "$session_file" "$@"
  mv "${session_file}.tmp" "$session_file"
  chmod 600 "$session_file"
}

# --- Session file helpers ---
ensure_sessions_dir() {
  mkdir -p "$SESSIONS_DIR/completed"
}

generate_session_id() {
  echo "stg-$(date +%Y%m%d-%H%M%S)-$$"
}

get_session_file() {
  local session_id="$1"
  echo "$SESSIONS_DIR/${session_id}.json"
}

validate_session_exists() {
  local session_id="$1"
  local session_file
  session_file=$(get_session_file "$session_id")
  if [ ! -f "$session_file" ]; then
    echo "ERROR: Session not found: $session_id" >&2
    echo "Run 'stage_ad_safe.sh list-sessions' to see active sessions." >&2
    exit 1
  fi
  # Check session age
  local session_mtime now age_seconds
  session_mtime=$(stat -f%m "$session_file" 2>/dev/null || stat --format=%Y "$session_file" 2>/dev/null)
  now=$(date +%s)
  age_seconds=$((now - session_mtime))
  if [ "$age_seconds" -gt "$SESSION_TTL" ]; then
    echo "ERROR: Session $session_id has expired (${age_seconds}s old, max ${SESSION_TTL}s)." >&2
    echo "Start a new session with 'stage_ad_safe.sh start --media <path>'." >&2
    exit 1
  fi
  # Thread affinity: if caller has a thread context, it must match the session's thread
  if [ -n "${SLACK_THREAD_TS:-}" ]; then
    local session_thread
    session_thread=$(session_get "$session_file" "slack_thread_ts")
    if [ -n "$session_thread" ] && [ "$session_thread" != "$SLACK_THREAD_TS" ]; then
      echo "ERROR: Session $session_id belongs to thread $session_thread, but current thread is $SLACK_THREAD_TS." >&2
      echo "Start a new session for this thread: stage_ad_safe.sh start --media <path>" >&2
      exit 1
    fi
  fi
}

# Read a JSON field from session file (python3, handles escapes correctly)
session_get() {
  local session_file="$1"
  local field="$2"
  python3 -c "
import json, sys
with open(sys.argv[1]) as f:
    d = json.load(f)
v = d.get(sys.argv[2], '')
if isinstance(v, bool):
    v = 'true' if v else 'false'
sys.stdout.write(str(v))
" "$session_file" "$field"
}

# Check if a step is completed (returns 0 if true, 1 if false)
session_step_done() {
  local session_file="$1"
  local step="$2"
  grep -q "\"${step}_done\": *true" "$session_file" 2>/dev/null
}

# Clean up old sessions (>24h) and expired gate lockfiles
cleanup_old_sessions() {
  local now
  now=$(date +%s)
  for sf in "$SESSIONS_DIR"/stg-*.json; do
    [ -f "$sf" ] || continue
    local mtime
    mtime=$(stat -f%m "$sf" 2>/dev/null || stat --format=%Y "$sf" 2>/dev/null)
    local age=$((now - mtime))
    if [ "$age" -gt "$CLEANUP_AGE" ]; then
      rm -f "$sf"
    fi
  done
  # Clean up expired gate lockfiles (>24h)
  if [ -d "$GATE_DIR" ]; then
    for gf in "$GATE_DIR"/gate-*.lock; do
      [ -f "$gf" ] || continue
      local gmtime
      gmtime=$(stat -f%m "$gf" 2>/dev/null || stat --format=%Y "$gf" 2>/dev/null)
      local gage=$((now - gmtime))
      if [ "$gage" -gt "$CLEANUP_AGE" ]; then
        rm -f "$gf"
      fi
    done
  fi
}

# --- SUBCOMMAND: start ---
cmd_start() {
  local media=""

  while [ $# -gt 0 ]; do
    case "$1" in
      --media|--path) media="$2"; shift 2 ;;
      *) echo "ERROR: Unknown flag: $1" >&2; exit 1 ;;
    esac
  done

  if [ -z "$media" ]; then
    echo "ERROR: --media is required." >&2
    echo "Usage: stage_ad_safe.sh start --media /path/to/file" >&2
    echo "  Multi-file: --media /path/1x1.png,/path/9x16.png,/path/16x9.png" >&2
    exit 1
  fi

  ensure_sessions_dir
  cleanup_old_sessions

  # Split on comma for multi-file support
  IFS=',' read -ra MEDIA_PATHS <<< "$media"

  local all_paths="" all_dimensions="" all_sizes=""
  local first_type="" first_duration="" first_fps="" first_codec=""
  local file_count=0
  local summary_lines=""

  for raw_path in "${MEDIA_PATHS[@]}"; do
    local filepath
    filepath="$(echo "$raw_path" | xargs)"  # trim whitespace
    filepath="$(resolve_host_path "$filepath")"  # sandbox -> host path

    if [ ! -e "$filepath" ]; then
      echo "ERROR: File not found: $filepath" >&2
      exit 1
    fi

    echo "Checking media readiness: $filepath"
    local stable_size
    stable_size=$(check_media_ready "$filepath" 60) || exit $?
    echo "  File ready: $stable_size bytes"

    local info
    info=$(get_media_info "$filepath")
    local media_type dimensions duration fps codec
    IFS='|' read -r media_type dimensions duration fps codec <<< "$info"

    echo "  Media type: $media_type"
    echo "  Dimensions: $dimensions"
    [ -n "$duration" ] && echo "  Duration: ${duration}s"
    echo "  File size: $stable_size bytes"

    # Verify consistent media type across all files
    if [ -z "$first_type" ]; then
      first_type="$media_type"
      first_duration="$duration"
      first_fps="$fps"
      first_codec="$codec"
    elif [ "$media_type" != "$first_type" ]; then
      echo "ERROR: Mixed media types. File '$filepath' is $media_type but first file is $first_type." >&2
      echo "All files in a session must be the same type (all images or all videos)." >&2
      exit 1
    fi

    # Accumulate pipe/comma-separated values
    [ -n "$all_paths" ] && all_paths="$all_paths,"
    all_paths="${all_paths}${filepath}"
    [ -n "$all_dimensions" ] && all_dimensions="$all_dimensions|"
    all_dimensions="${all_dimensions}${dimensions}"
    [ -n "$all_sizes" ] && all_sizes="$all_sizes|"
    all_sizes="${all_sizes}${stable_size}"

    # Build summary line for output
    local size_kb=$(( stable_size / 1024 ))
    summary_lines="${summary_lines}    ${filepath##*/} ($media_type, $dimensions, ${size_kb}KB)\n"

    file_count=$((file_count + 1))
    echo ""
  done

  # Generate session
  local session_id
  session_id=$(generate_session_id)
  local session_file
  session_file=$(get_session_file "$session_id")
  local created_iso
  created_iso=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  local escaped_media escaped_profile
  escaped_media=$(json_escape "$all_paths")
  escaped_profile=$(json_escape "$PROFILE_ROOT")

  printf '%s\n' "{
  \"version\": 2,
  \"session_id\": \"$session_id\",
  \"created\": \"$created_iso\",
  \"profile_root\": \"$escaped_profile\",
  \"media_path\": \"$escaped_media\",
  \"media_type\": \"$first_type\",
  \"media_dimensions\": \"$all_dimensions\",
  \"media_duration\": \"${first_duration:-}\",
  \"media_fps\": \"${first_fps:-}\",
  \"media_codec\": \"${first_codec:-}\",
  \"media_file_size\": \"$all_sizes\",
  \"slack_channel_id\": \"${SLACK_CHANNEL_ID:-}\",
  \"slack_thread_ts\": \"${SLACK_THREAD_TS:-}\",
  \"media_checked_done\": true,
  \"media_checked_at\": \"$created_iso\",
  \"vision_done\": false,
  \"vision_description\": \"\",
  \"vision_at\": \"\",
  \"product_done\": false,
  \"product\": \"\",
  \"product_at\": \"\",
  \"copy_options_shown_done\": false,
  \"copy_options_shown_at\": \"\",
  \"copy_done\": false,
  \"copy_source\": \"\",
  \"copy_from_id\": \"\",
  \"copy_body\": \"\",
  \"copy_headline\": \"\",
  \"copy_link\": \"\",
  \"copy_cta\": \"\",
  \"copy_at\": \"\",
  \"destination_done\": false,
  \"campaign_id\": \"\",
  \"campaign_name\": \"\",
  \"adset_id\": \"\",
  \"adset_name\": \"\",
  \"clone_targeting_from\": \"\",
  \"destination_at\": \"\",
  \"budget_done\": false,
  \"budget\": \"\",
  \"budget_type\": \"\",
  \"bid_strategy\": \"\",
  \"bid_amount\": \"\",
  \"roas_floor\": \"\",
  \"budget_at\": \"\",
  \"status_done\": false,
  \"ad_status\": \"\",
  \"status_at\": \"\"
}" > "$session_file"

  chmod 600 "$session_file"

  echo ""
  echo "============================================"
  echo "  STAGING SESSION STARTED"
  echo "============================================"
  echo "  Session ID: $session_id"
  if [ "$file_count" -eq 1 ]; then
    echo "  Media: ${all_paths##*/}"
    echo "  Type: $first_type ($all_dimensions)"
    [ -n "$first_duration" ] && echo "  Duration: ${first_duration}s"
    echo "  Size: $all_sizes bytes"
  else
    echo "  Media: $file_count files"
    printf '%b' "$summary_lines"
  fi
  echo "============================================"
  echo ""
  echo "NEXT STEP (2 of 10): Analyze the media with vision, then run:"
  echo "  stage_ad_safe.sh confirm-media --session $session_id --description \"<what you see>\""
  echo ""
  echo ">>> ONE STEP AT A TIME. Do NOT ask about product, copy, campaigns, or budget yet."
  echo ">>> Complete THIS step, then the script tells you the next one."
  echo ""
  echo "Session expires in 60 minutes."
}

# --- SUBCOMMAND: confirm-media ---
cmd_confirm_media() {
  local session_id=""
  local description=""

  while [ $# -gt 0 ]; do
    case "$1" in
      --session) session_id="$2"; shift 2 ;;
      --description) description="$2"; shift 2 ;;
      *) echo "ERROR: Unknown flag: $1" >&2; exit 1 ;;
    esac
  done

  if [ -z "$session_id" ]; then
    echo "ERROR: --session is required." >&2
    exit 1
  fi
  if [ -z "$description" ]; then
    echo "ERROR: --description is required. Describe what you see in the media." >&2
    exit 1
  fi

  validate_session_exists "$session_id"
  local session_file
  session_file=$(get_session_file "$session_id")

  if session_step_done "$session_file" "vision"; then
    echo "WARNING: Vision analysis already recorded for this session. Overwriting."
  fi

  local now_iso
  now_iso=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  # Update session file
  _session_set "$session_file" \
    "vision_done=true" \
    "vision_description=$description" \
    "vision_at=$now_iso"

  # Touch the session file to refresh TTL
  touch "$session_file"

  # Write gate-entry lockfile (confirm-media is gate-entry for set-product)
  _write_gate "$GATE_DIR/gate-media-${session_id}.lock"

  echo "Vision analysis recorded for session $session_id."
  echo ""
  echo "NEXT STEP (3 of 10): Ask the user ONLY this question:"
  echo "  \"What product is this ad for?\""
  echo "Wait for their answer, then run:"
  echo "  stage_ad_safe.sh set-product --session $session_id --product \"<user's answer>\""
  echo ""
  echo ">>> ONE STEP AT A TIME. Do NOT mention copy, campaigns, budget, or status."
  echo ">>> Ask the ONE question above, wait for the answer, then run the command."
}

# --- SUBCOMMAND: set-product ---
cmd_set_product() {
  local session_id=""
  local product=""

  while [ $# -gt 0 ]; do
    case "$1" in
      --session) session_id="$2"; shift 2 ;;
      --product) product="$2"; shift 2 ;;
      *) echo "ERROR: Unknown flag: $1" >&2; exit 1 ;;
    esac
  done

  if [ -z "$session_id" ]; then
    echo "ERROR: --session is required." >&2
    exit 1
  fi
  if [ -z "$product" ]; then
    echo "ERROR: --product is required." >&2
    exit 1
  fi

  validate_session_exists "$session_id"
  local session_file
  session_file=$(get_session_file "$session_id")

  # Temporal hard gate: confirm-media must have run >= 30s ago
  _check_gate "$GATE_DIR/gate-media-${session_id}.lock" "confirm-media" "set-product"

  # Validate prerequisite: vision must be done
  if ! session_step_done "$session_file" "vision"; then
    echo "ERROR: Vision analysis has not been completed yet." >&2
    echo "First analyze the media with vision, then run:" >&2
    echo "  stage_ad_safe.sh confirm-media --session $session_id --description \"<what you see>\"" >&2
    exit 1
  fi

  local now_iso
  now_iso=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  _session_set "$session_file" \
    "product_done=true" \
    "product=$product" \
    "product_at=$now_iso"
  touch "$session_file"

  echo "Product set to '$product' for session $session_id."
  echo ""
  echo "NEXT STEP (4 of 10): Show copy options by running:"
  echo "  stage_ad_safe.sh get-copy-options --session $session_id --top 5"
  echo ""
  echo ">>> ONE STEP AT A TIME. Do NOT ask about campaigns, budget, or status yet."
}

# --- SUBCOMMAND: get-copy-options ---
cmd_get_copy_options() {
  local session_id=""
  local campaign_filter=""
  local top_n="5"

  while [ $# -gt 0 ]; do
    case "$1" in
      --session) session_id="$2"; shift 2 ;;
      --campaign-filter|--filter) campaign_filter="$2"; shift 2 ;;
      --top) top_n="$2"; shift 2 ;;
      *) echo "ERROR: Unknown flag: $1" >&2; exit 1 ;;
    esac
  done

  if [ -z "$session_id" ]; then
    echo "ERROR: --session is required." >&2
    exit 1
  fi

  validate_session_exists "$session_id"
  local session_file
  session_file=$(get_session_file "$session_id")

  # Validate prerequisite: product must be set
  if ! session_step_done "$session_file" "product"; then
    echo "ERROR: Product has not been confirmed by the user yet." >&2
    echo "Ask the user what product this is for, then run:" >&2
    echo "  stage_ad_safe.sh set-product --session $session_id --product \"<user's answer>\"" >&2
    exit 1
  fi

  echo "Fetching top $top_n ad copy options..."
  echo ""

  # Build args for list-ad-copy
  local helper_args=(list-ad-copy --top "$top_n")
  if [ -n "$campaign_filter" ]; then
    helper_args+=(--campaign "$campaign_filter")
  fi

  # Call meta_api_helper.py list-ad-copy (not gated -- it's a read-only query)
  uv run "$HELPER" "${helper_args[@]}" 2>&1 || true

  # Mark copy_options_shown
  local now_iso
  now_iso=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  _session_set "$session_file" \
    "copy_options_shown_done=true" \
    "copy_options_shown_at=$now_iso"
  touch "$session_file"

  # Write gate-entry lockfile (get-copy-options is gate-entry for set-copy)
  _write_gate "$GATE_DIR/gate-copyopts-${session_id}.lock"

  echo ""
  echo "NEXT STEP (5 of 10): Present these options to the user and ask which to use."
  echo "When they choose, run:"
  echo "  stage_ad_safe.sh set-copy --session $session_id --copy-from <ad_id>"
  echo "  OR: stage_ad_safe.sh set-copy --session $session_id --body \"...\" --headline \"...\" --link \"...\" --cta SHOP_NOW"
  echo ""
  echo ">>> ONE STEP AT A TIME. Do NOT ask about campaigns, budget, or status yet."
}

# --- SUBCOMMAND: set-copy ---
cmd_set_copy() {
  local session_id=""
  local copy_from=""
  local body=""
  local headline=""
  local link=""
  local cta="SHOP_NOW"

  while [ $# -gt 0 ]; do
    case "$1" in
      --session) session_id="$2"; shift 2 ;;
      --copy-from) copy_from="$2"; shift 2 ;;
      --body) body="$2"; shift 2 ;;
      --headline) headline="$2"; shift 2 ;;
      --link) link="$2"; shift 2 ;;
      --cta) cta="$2"; shift 2 ;;
      *) echo "ERROR: Unknown flag: $1" >&2; exit 1 ;;
    esac
  done

  if [ -z "$session_id" ]; then
    echo "ERROR: --session is required." >&2
    exit 1
  fi
  if [ -z "$copy_from" ] && [ -z "$body" ]; then
    echo "ERROR: Provide either --copy-from <ad_id> or --body + --headline + --link." >&2
    exit 1
  fi

  validate_session_exists "$session_id"
  local session_file
  session_file=$(get_session_file "$session_id")

  # Temporal hard gate: get-copy-options must have run >= 30s ago
  _check_gate "$GATE_DIR/gate-copyopts-${session_id}.lock" "get-copy-options" "set-copy"

  # Validate prerequisite: product must be set
  if ! session_step_done "$session_file" "product"; then
    echo "ERROR: Product has not been confirmed by the user yet." >&2
    echo "Ask the user what product this is for, then run:" >&2
    echo "  stage_ad_safe.sh set-product --session $session_id --product \"<user's answer>\"" >&2
    exit 1
  fi

  local resolved_body="" resolved_headline="" resolved_link="" copy_source_str=""

  if [ -n "$copy_from" ]; then
    copy_source_str="copy-from:$copy_from"
    echo "Fetching copy from ad $copy_from..."
    local copy_output
    if copy_output=$(uv run "$HELPER" get-ad-copy --ad-id "$copy_from" 2>&1); then
      echo "$copy_output"
      resolved_body=$(echo "$copy_output" | grep -i "^Body:" | sed 's/^Body: *//' || true)
      resolved_headline=$(echo "$copy_output" | grep -i "^Headline:" | sed 's/^Headline: *//' || true)
      resolved_link=$(echo "$copy_output" | grep -i "^Link:" | sed 's/^Link: *//' || true)
    else
      echo "WARNING: Could not fetch copy from ad $copy_from. Plan will reference ad ID only." >&2
    fi
  else
    copy_source_str="manual"
    resolved_body="$body"
    resolved_headline="$headline"
    resolved_link="$link"
  fi

  local now_iso
  now_iso=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  _session_set "$session_file" \
    "copy_done=true" \
    "copy_source=$copy_source_str" \
    "copy_from_id=${copy_from:-}" \
    "copy_body=$resolved_body" \
    "copy_headline=$resolved_headline" \
    "copy_link=$resolved_link" \
    "copy_cta=$cta" \
    "copy_at=$now_iso"
  touch "$session_file"

  echo ""
  echo "Copy recorded for session $session_id."
  echo ""
  echo "NEXT STEP (6 of 10): Show available campaigns by running:"
  echo "  stage_ad_safe.sh set-destination --session $session_id"
  echo "  (Run WITHOUT --campaign-id first to list campaigns for the user.)"
  echo ""
  echo ">>> ONE STEP AT A TIME. Do NOT ask about budget or status yet."
}

# --- SUBCOMMAND: set-destination ---
cmd_set_destination() {
  local session_id="" campaign_id="" adset_id="" clone_targeting_from=""

  while [ $# -gt 0 ]; do
    case "$1" in
      --session) session_id="$2"; shift 2 ;;
      --campaign-id) campaign_id="$2"; shift 2 ;;
      --adset-id) adset_id="$2"; shift 2 ;;
      --clone-targeting-from) clone_targeting_from="$2"; shift 2 ;;
      *) echo "ERROR: Unknown flag: $1" >&2; exit 1 ;;
    esac
  done

  if [ -z "$session_id" ]; then
    echo "ERROR: --session is required." >&2
    exit 1
  fi

  validate_session_exists "$session_id"
  local session_file
  session_file=$(get_session_file "$session_id")

  # Validate prerequisite: copy must be set
  if ! session_step_done "$session_file" "copy"; then
    echo "ERROR: Copy has not been selected yet." >&2
    echo "Complete copy selection first, then run set-destination." >&2
    exit 1
  fi

  # If no campaign_id provided, show available campaigns (simple listing -- no metrics)
  if [ -z "$campaign_id" ]; then
    echo "Fetching available campaigns..."
    echo ""
    uv run "$HELPER" list-campaigns --limit 20 2>&1 || true
    echo ""
    echo "Show this list to the user. Options:" >&2
    echo "  - Pick an active campaign by ID" >&2
    echo "  - Use 'staging' for creative testing (PAUSED)" >&2
    echo "" >&2
    echo "Then run: stage_ad_safe.sh set-destination --session $session_id --campaign-id <ID> --adset-id <ID>" >&2
    echo "  For staging: stage_ad_safe.sh set-destination --session $session_id --campaign-id staging --adset-id staging" >&2
    exit 1
  fi

  # If campaign_id is "staging", auto-set adset_id to "staging" too
  if [ "$campaign_id" = "staging" ]; then
    adset_id="staging"
  fi

  # If no adset_id, show ad sets in that campaign with a suggested name
  if [ -z "$adset_id" ]; then
    echo "Fetching ad sets in campaign $campaign_id..."
    echo ""
    uv run "$HELPER" list-campaign-adsets --campaign-id "$campaign_id" 2>&1 || true
    echo ""
    # Generate suggested name from session context
    local product media_type format_label date_str suggested_name
    product=$(session_get "$session_file" "product")
    media_type=$(session_get "$session_file" "media_type")
    format_label="Static"
    [ "$media_type" = "video" ] && format_label="Video"
    date_str=$(date +"%m.%d.%y")
    suggested_name="$format_label | ${product:-Creative} | $date_str"
    echo "Show this list to the user. Options:" >&2
    echo "  - Pick an existing ad set by ID" >&2
    echo "  - 'new' to create: \"$suggested_name\"" >&2
    echo "" >&2
    echo "Then run: stage_ad_safe.sh set-destination --session $session_id --campaign-id $campaign_id --adset-id <ID>" >&2
    exit 1
  fi

  # Record in session
  local now_iso
  now_iso=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  _session_set "$session_file" \
    "destination_done=true" \
    "campaign_id=$campaign_id" \
    "adset_id=$adset_id" \
    "clone_targeting_from=${clone_targeting_from:-}" \
    "destination_at=$now_iso"
  touch "$session_file"

  echo ""
  echo "Destination set for session $session_id."
  if [ "$adset_id" = "staging" ]; then
    echo "  Route: STAGING (staging campaign, PAUSED)"
  else
    echo "  Campaign: $campaign_id"
    echo "  Ad Set:   $adset_id"
    [ -n "$clone_targeting_from" ] && echo "  Clone targeting from: $clone_targeting_from"
  fi
  echo ""
  echo "NEXT STEP (7 of 10): Ask the user about budget. Then run:"
  echo "  stage_ad_safe.sh set-budget --session $session_id --budget 50 --budget-type daily"
  if [ "$adset_id" = "staging" ]; then
    echo "  (Budget is N/A for staging -- will auto-skip)"
  fi
  echo ""
  echo ">>> ONE STEP AT A TIME. Do NOT ask about ad status yet."
}

# --- SUBCOMMAND: set-budget ---
cmd_set_budget() {
  local session_id="" budget="" budget_type="daily" bid_strategy="" bid_amount="" roas_floor=""

  while [ $# -gt 0 ]; do
    case "$1" in
      --session) session_id="$2"; shift 2 ;;
      --budget) budget="$2"; shift 2 ;;
      --budget-type) budget_type="$2"; shift 2 ;;
      --bid-strategy) bid_strategy="$2"; shift 2 ;;
      --bid-amount) bid_amount="$2"; shift 2 ;;
      --roas-floor) roas_floor="$2"; shift 2 ;;
      *) echo "ERROR: Unknown flag: $1" >&2; exit 1 ;;
    esac
  done

  if [ -z "$session_id" ]; then
    echo "ERROR: --session is required." >&2
    exit 1
  fi

  validate_session_exists "$session_id"
  local session_file
  session_file=$(get_session_file "$session_id")

  # Validate prerequisite: destination must be set
  if ! session_step_done "$session_file" "destination"; then
    echo "ERROR: Destination has not been set yet." >&2
    echo "Run set-destination first." >&2
    exit 1
  fi

  local now_iso
  now_iso=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  # Check if destination is staging -- if so, budget is N/A
  local adset_id
  adset_id=$(session_get "$session_file" "adset_id")
  if [ "$adset_id" = "staging" ]; then
    _session_set "$session_file" \
      "budget_done=true" \
      "budget=N/A" \
      "budget_type=N/A" \
      "budget_at=$now_iso"
    touch "$session_file"
    echo "Budget: N/A (staging campaign uses \$1/day placeholder)."
    echo ""
    echo "NEXT STEP (8 of 10): Ask the user -- PAUSED (review first) or ACTIVE (live)? Then run:"
    echo "  stage_ad_safe.sh set-status --session $session_id --status PAUSED"
    return
  fi

  # For non-staging, budget is required
  if [ -z "$budget" ]; then
    echo "ERROR: --budget is required for non-staging destinations." >&2
    echo "Usage: stage_ad_safe.sh set-budget --session $session_id --budget 50 --budget-type daily" >&2
    exit 1
  fi

  # Record budget fields
  _session_set "$session_file" \
    "budget_done=true" \
    "budget=$budget" \
    "budget_type=$budget_type" \
    "bid_strategy=${bid_strategy:-}" \
    "bid_amount=${bid_amount:-}" \
    "roas_floor=${roas_floor:-}" \
    "budget_at=$now_iso"
  touch "$session_file"

  echo "Budget set for session $session_id."
  echo "  Budget: \$$budget/$budget_type"
  [ -n "$bid_strategy" ] && echo "  Bid strategy: $bid_strategy"
  [ -n "$bid_amount" ] && echo "  Bid amount: \$$bid_amount"
  [ -n "$roas_floor" ] && echo "  ROAS floor: $roas_floor"
  echo ""
  echo "NEXT STEP (8 of 10): Ask the user -- PAUSED (review first) or ACTIVE (live)? Then run:"
  echo "  stage_ad_safe.sh set-status --session $session_id --status PAUSED"
  echo "  stage_ad_safe.sh set-status --session $session_id --status ACTIVE"
}

# --- SUBCOMMAND: set-status ---
cmd_set_status() {
  local session_id="" status=""

  while [ $# -gt 0 ]; do
    case "$1" in
      --session) session_id="$2"; shift 2 ;;
      --status) status="$2"; shift 2 ;;
      *) echo "ERROR: Unknown flag: $1" >&2; exit 1 ;;
    esac
  done

  if [ -z "$session_id" ]; then
    echo "ERROR: --session is required." >&2
    exit 1
  fi
  if [ -z "$status" ]; then
    echo "ERROR: --status is required (PAUSED or ACTIVE)." >&2
    exit 1
  fi

  validate_session_exists "$session_id"
  local session_file
  session_file=$(get_session_file "$session_id")

  # Validate prerequisite: budget must be set
  if ! session_step_done "$session_file" "budget"; then
    echo "ERROR: Budget has not been set yet." >&2
    echo "Run set-budget first." >&2
    exit 1
  fi

  # Validate status value
  case "$status" in
    PAUSED|ACTIVE) ;;
    *) echo "ERROR: --status must be PAUSED or ACTIVE." >&2; exit 1 ;;
  esac

  local now_iso
  now_iso=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  _session_set "$session_file" \
    "status_done=true" \
    "ad_status=$status" \
    "status_at=$now_iso"
  touch "$session_file"

  echo "Status set to $status for session $session_id."
  echo ""
  echo "NEXT STEP (9 of 10): Create the plan and show it to the user for approval:"
  echo "  SLACK_CHANNEL_ID=\"\$CHANNEL\" SLACK_THREAD_TS=\"\$THREAD\" \\"
  echo "    stage_ad_safe.sh plan --session $session_id --name \"Ad Name\""
  echo ""
  echo ">>> Show the plan summary to the user. Ask: \"Ready to go?\" Wait for confirmation."
}

# --- SUBCOMMAND: plan ---
cmd_plan() {
  validate_slack_env

  local session_id=""
  local ad_name=""

  while [ $# -gt 0 ]; do
    case "$1" in
      --session) session_id="$2"; shift 2 ;;
      --name) ad_name="$2"; shift 2 ;;
      *) echo "ERROR: Unknown flag: $1" >&2; exit 1 ;;
    esac
  done

  if [ -z "$session_id" ]; then
    echo "ERROR: --session is required." >&2
    echo "Usage: stage_ad_safe.sh plan --session <ID> [--name \"Ad Name\"]" >&2
    exit 1
  fi

  validate_session_exists "$session_id"
  local session_file
  session_file=$(get_session_file "$session_id")

  # --- ENFORCE STEP COMPLETION ---
  local errors=0

  if ! session_step_done "$session_file" "media_checked"; then
    echo "ERROR: Media has not been checked." >&2
    echo "  Run: stage_ad_safe.sh start --media <path>" >&2
    errors=$((errors + 1))
  fi

  if ! session_step_done "$session_file" "vision"; then
    echo "ERROR: Media has not been analyzed with vision." >&2
    echo "  Analyze the media content, then run:" >&2
    echo "  stage_ad_safe.sh confirm-media --session $session_id --description \"<what you see>\"" >&2
    errors=$((errors + 1))
  fi

  if ! session_step_done "$session_file" "product"; then
    echo "ERROR: Product has not been confirmed by user." >&2
    echo "  Ask the user what product this is for, then run:" >&2
    echo "  stage_ad_safe.sh set-product --session $session_id --product \"<user answer>\"" >&2
    errors=$((errors + 1))
  fi

  if ! session_step_done "$session_file" "copy"; then
    echo "ERROR: Copy has not been selected." >&2
    echo "  Show copy options to user, then run:" >&2
    echo "  stage_ad_safe.sh set-copy --session $session_id --copy-from <ad_id>" >&2
    errors=$((errors + 1))
  fi

  if ! session_step_done "$session_file" "destination"; then
    echo "ERROR: Destination campaign/ad set has not been selected." >&2
    echo "  Run: stage_ad_safe.sh set-destination --session $session_id --campaign-id <ID> --adset-id <ID>" >&2
    errors=$((errors + 1))
  fi

  if ! session_step_done "$session_file" "budget"; then
    echo "ERROR: Budget has not been set." >&2
    echo "  Run: stage_ad_safe.sh set-budget --session $session_id --budget 50 --budget-type daily" >&2
    errors=$((errors + 1))
  fi

  if ! session_step_done "$session_file" "status"; then
    echo "ERROR: Ad status has not been set." >&2
    echo "  Run: stage_ad_safe.sh set-status --session $session_id --status PAUSED" >&2
    errors=$((errors + 1))
  fi

  if [ "$errors" -gt 0 ]; then
    echo "" >&2
    echo "BLOCKED: $errors step(s) incomplete. Complete them before creating a plan." >&2
    exit 1
  fi

  # --- All steps complete -- read session data ---
  local media_path media_type dimensions product copy_source copy_from_id
  local copy_body copy_headline copy_link copy_cta
  local campaign_id adset_id clone_targeting_from
  local budget budget_type bid_strategy bid_amount roas_floor ad_status
  media_path=$(session_get "$session_file" "media_path")
  media_type=$(session_get "$session_file" "media_type")
  dimensions=$(session_get "$session_file" "media_dimensions")
  product=$(session_get "$session_file" "product")
  copy_source=$(session_get "$session_file" "copy_source")
  copy_from_id=$(session_get "$session_file" "copy_from_id")
  copy_body=$(session_get "$session_file" "copy_body")
  copy_headline=$(session_get "$session_file" "copy_headline")
  copy_link=$(session_get "$session_file" "copy_link")
  copy_cta=$(session_get "$session_file" "copy_cta")
  campaign_id=$(session_get "$session_file" "campaign_id")
  adset_id=$(session_get "$session_file" "adset_id")
  clone_targeting_from=$(session_get "$session_file" "clone_targeting_from")
  budget=$(session_get "$session_file" "budget")
  budget_type=$(session_get "$session_file" "budget_type")
  bid_strategy=$(session_get "$session_file" "bid_strategy")
  bid_amount=$(session_get "$session_file" "bid_amount")
  roas_floor=$(session_get "$session_file" "roas_floor")
  ad_status=$(session_get "$session_file" "ad_status")

  # Validate media still exists (supports comma-separated paths)
  IFS=',' read -ra PLAN_MEDIA_FILES <<< "$media_path"
  for pm_file in "${PLAN_MEDIA_FILES[@]}"; do
    pm_file="$(echo "$pm_file" | xargs)"
    if [ ! -e "$pm_file" ]; then
      echo "ERROR: Media file no longer exists: $pm_file" >&2
      exit 1
    fi
  done

  # Generate ad name if not provided
  if [ -z "$ad_name" ]; then
    local date_str
    date_str=$(date +"%b %d")
    ad_name="$product $media_type $date_str"
  fi

  # Create plan directory
  mkdir -p "$PLANS_DIR/completed"

  # Write plan file
  local timestamp
  timestamp=$(date +"%Y%m%d-%H%M%S")
  local plan_file="$PLANS_DIR/${timestamp}.json"
  local created_iso
  created_iso=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  local escaped_product escaped_ad_name escaped_copy_source
  local escaped_body escaped_headline escaped_link escaped_cta escaped_profile
  local escaped_campaign escaped_adset escaped_clone
  local escaped_budget escaped_budget_type escaped_bid_strategy
  local escaped_bid_amount escaped_roas_floor escaped_ad_status
  escaped_product=$(json_escape "$product")
  escaped_ad_name=$(json_escape "$ad_name")
  escaped_copy_source=$(json_escape "$copy_source")
  escaped_body=$(json_escape "$copy_body")
  escaped_headline=$(json_escape "$copy_headline")
  escaped_link=$(json_escape "$copy_link")
  escaped_cta=$(json_escape "$copy_cta")
  escaped_profile=$(json_escape "$PROFILE_ROOT")
  escaped_campaign=$(json_escape "${campaign_id:-}")
  escaped_adset=$(json_escape "${adset_id:-}")
  escaped_clone=$(json_escape "${clone_targeting_from:-}")
  escaped_budget=$(json_escape "${budget:-}")
  escaped_budget_type=$(json_escape "${budget_type:-}")
  escaped_bid_strategy=$(json_escape "${bid_strategy:-}")
  escaped_bid_amount=$(json_escape "${bid_amount:-}")
  escaped_roas_floor=$(json_escape "${roas_floor:-}")
  escaped_ad_status=$(json_escape "${ad_status:-}")

  # Build JSON media array and dimensions object from comma/pipe-separated values
  local media_json_array="" dimensions_json_obj=""
  IFS=',' read -ra PLAN_PATHS <<< "$media_path"
  IFS='|' read -ra PLAN_DIMS <<< "$dimensions"
  local pi=0
  for pp in "${PLAN_PATHS[@]}"; do
    pp="$(echo "$pp" | xargs)"
    local escaped_pp
    escaped_pp=$(json_escape "$pp")
    [ -n "$media_json_array" ] && media_json_array="$media_json_array, "
    media_json_array="${media_json_array}\"$escaped_pp\""
    local dim_val="${PLAN_DIMS[$pi]:-unknown}"
    local fname="${pp##*/}"
    local escaped_fname
    escaped_fname=$(json_escape "$fname")
    [ -n "$dimensions_json_obj" ] && dimensions_json_obj="$dimensions_json_obj, "
    dimensions_json_obj="${dimensions_json_obj}\"$escaped_fname\": \"$dim_val\""
    pi=$((pi + 1))
  done

  printf '%s\n' "{
  \"version\": 3,
  \"created\": \"$created_iso\",
  \"session_id\": \"$session_id\",
  \"profile_root\": \"$escaped_profile\",
  \"media\": [$media_json_array],
  \"media_type\": \"$media_type\",
  \"dimensions\": {$dimensions_json_obj},
  \"product\": \"$escaped_product\",
  \"ad_name\": \"$escaped_ad_name\",
  \"copy_source\": \"$escaped_copy_source\",
  \"copy_from_id\": \"${copy_from_id:-}\",
  \"copy_body\": \"$escaped_body\",
  \"copy_headline\": \"$escaped_headline\",
  \"copy_link\": \"$escaped_link\",
  \"copy_cta\": \"$escaped_cta\",
  \"campaign_id\": \"$escaped_campaign\",
  \"adset_id\": \"$escaped_adset\",
  \"clone_targeting_from\": \"$escaped_clone\",
  \"budget\": \"$escaped_budget\",
  \"budget_type\": \"$escaped_budget_type\",
  \"bid_strategy\": \"$escaped_bid_strategy\",
  \"bid_amount\": \"$escaped_bid_amount\",
  \"roas_floor\": \"$escaped_roas_floor\",
  \"ad_status\": \"$escaped_ad_status\",
  \"slack_channel_id\": \"$SLACK_CHANNEL_ID\",
  \"slack_thread_ts\": \"$SLACK_THREAD_TS\"
}" > "$plan_file"

  chmod 600 "$plan_file"

  # Determine route label
  local route_label="LAUNCH"
  if [ "$adset_id" = "staging" ]; then
    route_label="STAGING"
  fi

  # Print summary
  echo ""
  echo "============================================"
  echo "  $route_label PLAN CREATED"
  echo "============================================"
  echo "  Plan file: $plan_file"
  echo "  Session:   $session_id"
  echo "  Route:     $route_label"
  echo "  Product:   $product"
  echo "  Ad name:   $ad_name"
  if [ ${#PLAN_PATHS[@]} -eq 1 ]; then
    echo "  Media:     ${media_path##*/} ($media_type, $dimensions)"
  else
    echo "  Media:     ${#PLAN_PATHS[@]} files ($media_type)"
    for pp in "${PLAN_PATHS[@]}"; do
      pp="$(echo "$pp" | xargs)"
      echo "             ${pp##*/}"
    done
  fi
  if [ "$adset_id" = "staging" ]; then
    echo "  Campaign:  STAGING (staging campaign)"
    echo "  Ad Set:    Auto-created staging ad set"
  else
    echo "  Campaign:  $campaign_id"
    if [ "$adset_id" = "new" ]; then
      echo "  Ad Set:    NEW (auto-created)"
    else
      echo "  Ad Set:    $adset_id"
    fi
    [ -n "$clone_targeting_from" ] && echo "  Targeting:  Cloned from $clone_targeting_from"
  fi
  if [ -n "$budget" ] && [ "$budget" != "N/A" ]; then
    echo "  Budget:    \$$budget/$budget_type"
  else
    echo "  Budget:    N/A (staging)"
  fi
  [ -n "$bid_strategy" ] && echo "  Bid:       $bid_strategy"
  [ -n "$bid_amount" ] && echo "  Bid amt:   \$$bid_amount"
  [ -n "$roas_floor" ] && echo "  ROAS floor: $roas_floor"
  echo "  Status:    $ad_status"
  if [ -n "$copy_from_id" ]; then
    echo "  Copy from: Ad ID $copy_from_id"
  fi
  if [ -n "$copy_body" ]; then
    local display_body="$copy_body"
    if [ ${#display_body} -gt 120 ]; then
      display_body="${display_body:0:120}..."
    fi
    echo "  Body:      $display_body"
  fi
  if [ -n "$copy_headline" ]; then
    echo "  Headline:  $copy_headline"
  fi
  if [ -n "$copy_link" ]; then
    echo "  Link:      $copy_link"
  fi
  echo "  CTA:       $copy_cta"
  echo "============================================"
  echo ""
  # Write gate-entry lockfile (plan is gate-entry for execute)
  local plan_basename
  plan_basename="$(basename "$plan_file" .json)"
  _write_gate "$GATE_DIR/gate-plan-${plan_basename}.lock"

  echo "To execute this plan, run:"
  echo "  SLACK_CHANNEL_ID=\"\$CHANNEL\" SLACK_THREAD_TS=\"\$THREAD\" \\"
  echo "    $SCRIPT_DIR/stage_ad_safe.sh execute --plan $plan_file"
  echo ""
  echo "Plan expires in 30 minutes."
}

# --- SUBCOMMAND: execute ---
cmd_execute() {
  local plan_file=""

  while [ $# -gt 0 ]; do
    case "$1" in
      --plan) plan_file="$2"; shift 2 ;;
      *) echo "ERROR: Unknown flag: $1" >&2; exit 1 ;;
    esac
  done

  if [ -z "$plan_file" ]; then
    echo "ERROR: --plan is required." >&2
    echo "Usage: stage_ad_safe.sh execute --plan /path/to/plan.json" >&2
    exit 1
  fi

  if [ ! -f "$plan_file" ]; then
    echo "ERROR: Plan file not found: $plan_file" >&2
    exit 1
  fi

  # Temporal hard gate: plan must have run >= 30s ago
  local plan_gate_basename
  plan_gate_basename="$(basename "$plan_file" .json)"
  _check_gate "$GATE_DIR/gate-plan-${plan_gate_basename}.lock" "plan" "execute"

  # Check plan age (max 30 minutes)
  local plan_mtime now age_seconds
  plan_mtime=$(stat -f%m "$plan_file" 2>/dev/null || stat --format=%Y "$plan_file" 2>/dev/null)
  now=$(date +%s)
  age_seconds=$((now - plan_mtime))

  if [ "$age_seconds" -gt "$PLAN_TTL" ]; then
    echo "ERROR: Plan file is ${age_seconds}s old (max ${PLAN_TTL}s / 30 minutes)." >&2
    echo "Stale plans cannot be executed. Create a new plan." >&2
    exit 1
  fi

  # Parse plan JSON (python3 for correct escape handling)
  local media_raw product ad_name copy_from_id copy_body copy_headline copy_link copy_cta
  local campaign_id adset_id clone_targeting_from
  local budget budget_type bid_strategy bid_amount roas_floor ad_status

  media_raw=$(_plan_get "$plan_file" "media")
  product=$(_plan_get "$plan_file" "product")
  ad_name=$(_plan_get "$plan_file" "ad_name")
  copy_from_id=$(_plan_get "$plan_file" "copy_from_id")
  copy_body=$(_plan_get "$plan_file" "copy_body")
  copy_headline=$(_plan_get "$plan_file" "copy_headline")
  copy_link=$(_plan_get "$plan_file" "copy_link")
  copy_cta=$(_plan_get "$plan_file" "copy_cta")
  campaign_id=$(_plan_get "$plan_file" "campaign_id")
  adset_id=$(_plan_get "$plan_file" "adset_id")
  clone_targeting_from=$(_plan_get "$plan_file" "clone_targeting_from")
  budget=$(_plan_get "$plan_file" "budget")
  budget_type=$(_plan_get "$plan_file" "budget_type")
  bid_strategy=$(_plan_get "$plan_file" "bid_strategy")
  bid_amount=$(_plan_get "$plan_file" "bid_amount")
  roas_floor=$(_plan_get "$plan_file" "roas_floor")
  ad_status=$(_plan_get "$plan_file" "ad_status")

  # Read SLACK context from plan as fallback (if env vars not already set)
  if [ -z "${SLACK_CHANNEL_ID:-}" ]; then
    SLACK_CHANNEL_ID=$(_plan_get "$plan_file" "slack_channel_id")
    export SLACK_CHANNEL_ID
  fi
  if [ -z "${SLACK_THREAD_TS:-}" ]; then
    SLACK_THREAD_TS=$(_plan_get "$plan_file" "slack_thread_ts")
    export SLACK_THREAD_TS
  fi

  # Validate SLACK env (after plan fallback)
  validate_slack_env

  if [ -z "$media_raw" ] || [ -z "$product" ]; then
    echo "ERROR: Plan file is malformed (missing media or product)." >&2
    exit 1
  fi

  # Re-validate media files
  IFS=',' read -ra MEDIA_FILES <<< "$media_raw"
  for filepath in "${MEDIA_FILES[@]}"; do
    filepath="$(echo "$filepath" | xargs)"
    if [ ! -e "$filepath" ]; then
      echo "ERROR: Media file from plan no longer exists: $filepath" >&2
      exit 1
    fi
  done

  # Build command args -- route to stage-ad or launch-ad based on adset_id
  local cmd_args=()
  local route_label=""

  if [ "$adset_id" = "staging" ]; then
    # --- STAGING route ---
    route_label="stage-ad"
    cmd_args+=(stage-ad)
    cmd_args+=(--media "$media_raw")
    cmd_args+=(--product "$product")
    cmd_args+=(--name "$ad_name")

    if [ -n "$copy_from_id" ]; then
      cmd_args+=(--copy-from "$copy_from_id")
    else
      [ -n "$copy_body" ] && cmd_args+=(--body "$copy_body")
      [ -n "$copy_headline" ] && cmd_args+=(--headline "$copy_headline")
      [ -n "$copy_link" ] && cmd_args+=(--link "$copy_link")
      [ -n "$copy_cta" ] && cmd_args+=(--cta "$copy_cta")
    fi
    cmd_args+=(--yes)
  else
    # --- LAUNCH route ---
    route_label="launch-ad"
    cmd_args+=(launch-ad)
    cmd_args+=(--media "$media_raw")
    cmd_args+=(--campaign-id "$campaign_id")
    [ -n "$product" ] && cmd_args+=(--product "$product")
    cmd_args+=(--name "$ad_name")

    if [ -n "$copy_from_id" ]; then
      cmd_args+=(--copy-from "$copy_from_id")
    else
      [ -n "$copy_body" ] && cmd_args+=(--body "$copy_body")
      [ -n "$copy_headline" ] && cmd_args+=(--headline "$copy_headline")
      [ -n "$copy_link" ] && cmd_args+=(--link "$copy_link")
      [ -n "$copy_cta" ] && cmd_args+=(--cta "$copy_cta")
    fi

    if [ "$adset_id" != "new" ]; then
      cmd_args+=(--adset-id "$adset_id")
    fi
    [ -n "$budget" ] && [ "$budget" != "N/A" ] && cmd_args+=(--budget "$budget")
    [ -n "$budget_type" ] && [ "$budget_type" != "N/A" ] && cmd_args+=(--budget-type "$budget_type")
    [ -n "$ad_status" ] && cmd_args+=(--status "$ad_status")
    [ -n "$clone_targeting_from" ] && cmd_args+=(--clone-targeting-from "$clone_targeting_from")
    [ -n "$bid_strategy" ] && cmd_args+=(--bid-strategy "$bid_strategy")
    [ -n "$bid_amount" ] && cmd_args+=(--bid-amount "$bid_amount")
    [ -n "$roas_floor" ] && cmd_args+=(--roas-floor "$roas_floor")
    cmd_args+=(--yes)
  fi

  echo "Executing plan: $plan_file"
  echo "Route: $route_label"
  echo "Routing to channel: $SLACK_CHANNEL_ID thread: $SLACK_THREAD_TS"
  echo "Running: uv run $HELPER ${cmd_args[*]}"
  echo ""

  STAGE_AD_SAFE=1 SLACK_CHANNEL_ID="$SLACK_CHANNEL_ID" SLACK_THREAD_TS="$SLACK_THREAD_TS" \
    uv run "$HELPER" "${cmd_args[@]}"
  local exit_code=$?

  if [ $exit_code -eq 0 ]; then
    # Read session_id before moving the plan file
    local session_id
    session_id=$(_plan_get "$plan_file" "session_id" 2>/dev/null || true)
    mkdir -p "$PLANS_DIR/completed"
    mv "$plan_file" "$PLANS_DIR/completed/"
    if [ -n "$session_id" ]; then
      local session_file
      session_file=$(get_session_file "$session_id")
      [ -f "$session_file" ] && mv "$session_file" "$SESSIONS_DIR/completed/"
    fi
    echo ""
    echo "Plan executed successfully ($route_label)."
  else
    echo ""
    echo "ERROR: $route_label failed with exit code $exit_code" >&2
    exit $exit_code
  fi
}

# --- SUBCOMMAND: check-media (standalone, no session) ---
cmd_check_media() {
  local filepath=""

  while [ $# -gt 0 ]; do
    case "$1" in
      --path) filepath="$2"; shift 2 ;;
      *) echo "ERROR: Unknown flag: $1" >&2; exit 1 ;;
    esac
  done

  if [ -z "$filepath" ]; then
    echo "ERROR: --path is required." >&2
    exit 1
  fi

  filepath="$(resolve_host_path "$filepath")"  # sandbox -> host path

  if [ ! -e "$filepath" ]; then
    echo "ERROR: File not found: $filepath" >&2
    exit 1
  fi

  echo "Checking media: $filepath"

  local filesize
  filesize=$(stat -f%z "$filepath" 2>/dev/null || stat --format=%s "$filepath" 2>/dev/null)

  local info
  info=$(get_media_info "$filepath")
  local media_type dimensions duration fps codec
  IFS='|' read -r media_type dimensions duration fps codec <<< "$info"

  echo "  File size: $filesize bytes"
  echo "  Media type: $media_type"
  echo "  Dimensions: $dimensions"
  [ -n "$duration" ] && echo "  Duration: ${duration}s"
  [ -n "$fps" ] && echo "  FPS: $fps"
  [ -n "$codec" ] && echo "  Codec: $codec"

  echo "  Checking file stability (3s poll)..."
  local size2
  sleep 3
  size2=$(stat -f%z "$filepath" 2>/dev/null || stat --format=%s "$filepath" 2>/dev/null)

  if [ "$filesize" = "$size2" ]; then
    echo "  Status: STABLE (ready for staging)"
  else
    echo "  Status: STILL CHANGING ($filesize -> $size2 bytes)"
  fi
}

# --- SUBCOMMAND: session-status ---
cmd_session_status() {
  local session_id=""

  while [ $# -gt 0 ]; do
    case "$1" in
      --session) session_id="$2"; shift 2 ;;
      *) echo "ERROR: Unknown flag: $1" >&2; exit 1 ;;
    esac
  done

  if [ -z "$session_id" ]; then
    echo "ERROR: --session is required." >&2
    exit 1
  fi

  validate_session_exists "$session_id"
  local session_file
  session_file=$(get_session_file "$session_id")

  local media_path media_type product
  media_path=$(session_get "$session_file" "media_path")
  media_type=$(session_get "$session_file" "media_type")
  product=$(session_get "$session_file" "product")

  echo "Session: $session_id"
  local session_thread
  session_thread=$(session_get "$session_file" "slack_thread_ts")
  [ -n "$session_thread" ] && echo "Thread: $session_thread"
  # Handle multi-file media display
  local file_count=0
  IFS=',' read -ra STATUS_MEDIA <<< "$media_path"
  file_count=${#STATUS_MEDIA[@]}
  if [ "$file_count" -eq 1 ]; then
    echo "Media: ${media_path##*/} ($media_type)"
  else
    echo "Media: $file_count files ($media_type)"
    for sm_file in "${STATUS_MEDIA[@]}"; do
      sm_file="$(echo "$sm_file" | xargs)"
      echo "  ${sm_file##*/}"
    done
  fi
  echo ""
  echo "Step completion:"

  local check="[x]"
  local no="[ ]"

  if session_step_done "$session_file" "media_checked"; then
    echo "  $check 1. Media checked"
  else
    echo "  $no 1. Media checked"
  fi

  if session_step_done "$session_file" "vision"; then
    local desc
    desc=$(session_get "$session_file" "vision_description")
    echo "  $check 2. Vision analysis: ${desc:0:60}..."
  else
    echo "  $no 2. Vision analysis"
  fi

  if session_step_done "$session_file" "product"; then
    echo "  $check 3. Product: $product"
  else
    echo "  $no 3. Product confirmation"
  fi

  if session_step_done "$session_file" "copy_options_shown"; then
    echo "  $check 4. Copy options shown"
  else
    echo "  $no 4. Copy options shown"
  fi

  if session_step_done "$session_file" "copy"; then
    local source
    source=$(session_get "$session_file" "copy_source")
    echo "  $check 5. Copy selected ($source)"
  else
    echo "  $no 5. Copy selection"
  fi

  if session_step_done "$session_file" "destination"; then
    local dest_campaign dest_adset
    dest_campaign=$(session_get "$session_file" "campaign_id")
    dest_adset=$(session_get "$session_file" "adset_id")
    if [ "$dest_adset" = "staging" ]; then
      echo "  $check 6. Destination: STAGING"
    else
      echo "  $check 6. Destination: campaign $dest_campaign / ad set $dest_adset"
    fi
  else
    echo "  $no 6. Destination (campaign/ad set)"
  fi

  if session_step_done "$session_file" "budget"; then
    local sess_budget sess_budget_type
    sess_budget=$(session_get "$session_file" "budget")
    sess_budget_type=$(session_get "$session_file" "budget_type")
    if [ "$sess_budget" = "N/A" ]; then
      echo "  $check 7. Budget: N/A (staging)"
    else
      echo "  $check 7. Budget: \$$sess_budget/$sess_budget_type"
    fi
  else
    echo "  $no 7. Budget"
  fi

  if session_step_done "$session_file" "status"; then
    local sess_status
    sess_status=$(session_get "$session_file" "ad_status")
    echo "  $check 8. Status: $sess_status"
  else
    echo "  $no 8. Ad status"
  fi
}

# --- SUBCOMMAND: list-sessions ---
cmd_list_sessions() {
  ensure_sessions_dir

  local count=0
  local now
  now=$(date +%s)

  echo "Active staging sessions:"
  echo ""

  for sf in "$SESSIONS_DIR"/stg-*.json; do
    [ -f "$sf" ] || continue

    local mtime age
    mtime=$(stat -f%m "$sf" 2>/dev/null || stat --format=%Y "$sf" 2>/dev/null)
    age=$((now - mtime))

    # Skip expired
    if [ "$age" -gt "$SESSION_TTL" ]; then
      continue
    fi

    local sid media_path media_type
    sid=$(session_get "$sf" "session_id")
    media_path=$(session_get "$sf" "media_path")
    media_type=$(session_get "$sf" "media_type")

    local steps_done=0
    session_step_done "$sf" "media_checked" && steps_done=$((steps_done + 1))
    session_step_done "$sf" "vision" && steps_done=$((steps_done + 1))
    session_step_done "$sf" "product" && steps_done=$((steps_done + 1))
    session_step_done "$sf" "copy_options_shown" && steps_done=$((steps_done + 1))
    session_step_done "$sf" "copy" && steps_done=$((steps_done + 1))
    session_step_done "$sf" "destination" && steps_done=$((steps_done + 1))
    session_step_done "$sf" "budget" && steps_done=$((steps_done + 1))
    session_step_done "$sf" "status" && steps_done=$((steps_done + 1))

    local age_min=$((age / 60))
    echo "  $sid  (${steps_done}/8 steps, ${age_min}m ago)"
    local list_thread
    list_thread=$(session_get "$sf" "slack_thread_ts")
    [ -n "$list_thread" ] && echo "    Thread: $list_thread"
    # Handle multi-file media display
    IFS=',' read -ra LIST_MEDIA <<< "$media_path"
    if [ ${#LIST_MEDIA[@]} -eq 1 ]; then
      echo "    Media: ${media_path##*/} ($media_type)"
    else
      echo "    Media: ${#LIST_MEDIA[@]} files ($media_type)"
      for lm_file in "${LIST_MEDIA[@]}"; do
        lm_file="$(echo "$lm_file" | xargs)"
        echo "      ${lm_file##*/}"
      done
    fi
    echo ""

    count=$((count + 1))
  done

  if [ "$count" -gt 0 ]; then
    echo "============================================"
    echo "  IN-PROGRESS STAGING SESSIONS FOUND"
    echo "  Resume with: stage_ad_safe.sh session-status --session <ID>"
    echo "============================================"
  else
    echo "  No active sessions."
  fi
}

# --- Main dispatcher ---
if [ $# -lt 1 ]; then
  echo "Usage: stage_ad_safe.sh <command> [options]" >&2
  echo "" >&2
  echo "Unified ad pipeline (staging + launch):" >&2
  echo "  1. start              Start session (check media)" >&2
  echo "  2. confirm-media      Record vision analysis of media" >&2
  echo "  3. set-product        Record user-confirmed product" >&2
  echo "  4. get-copy-options   Show ad copy options with ROAS" >&2
  echo "  5. set-copy           Record user's copy choice" >&2
  echo "  6. set-destination    Set campaign + ad set (or 'staging')" >&2
  echo "  7. set-budget         Set budget + bid strategy" >&2
  echo "  8. set-status         Set PAUSED or ACTIVE" >&2
  echo "  9. plan               Create plan (requires steps 1-8)" >&2
  echo "  10. execute           Execute plan (routes to stage-ad or launch-ad)" >&2
  echo "" >&2
  echo "Utilities:" >&2
  echo "  session-status     Show session step completion" >&2
  echo "  list-sessions      List active sessions" >&2
  echo "  check-media        Standalone media check" >&2
  echo "" >&2
  echo "Environment:" >&2
  echo "  SLACK_CHANNEL_ID   Required for plan and execute" >&2
  echo "  SLACK_THREAD_TS    Required for plan and execute" >&2
  exit 1
fi

SUBCOMMAND="$1"
shift

case "$SUBCOMMAND" in
  start) cmd_start "$@" ;;
  confirm-media) cmd_confirm_media "$@" ;;
  set-product) cmd_set_product "$@" ;;
  get-copy-options) cmd_get_copy_options "$@" ;;
  set-copy) cmd_set_copy "$@" ;;
  set-destination) cmd_set_destination "$@" ;;
  set-budget) cmd_set_budget "$@" ;;
  set-status) cmd_set_status "$@" ;;
  plan) cmd_plan "$@" ;;
  execute) cmd_execute "$@" ;;
  check-media) cmd_check_media "$@" ;;
  session-status) cmd_session_status "$@" ;;
  list-sessions) cmd_list_sessions "$@" ;;
  *)
    echo "ERROR: Unknown command: $SUBCOMMAND" >&2
    echo "Valid commands: start, confirm-media, set-product, get-copy-options, set-copy, set-destination, set-budget, set-status, plan, execute, check-media, session-status, list-sessions" >&2
    exit 1
    ;;
esac
