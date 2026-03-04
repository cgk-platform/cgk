#!/usr/bin/env bash
set -euo pipefail

###############################################################################
# video_editor_safe.sh -- Safe wrapper for openCLAW video-editor skill
#
# Session-based, multi-step video editing workflow with enforcement layers:
#   - Env gate (VIDEO_EDITOR_SAFE=1 on underlying Python)
#   - Hard-fail on missing SLACK_CHANNEL_ID / SLACK_THREAD_TS
#   - Session state tracks step completion; refuses to skip steps
#   - TTL: sessions 120 min, plans 30 min
#   - Thread affinity: session bound to originating thread
#   - Profile root derived from script location (no hardcoded paths)
#   - Safe .env parsing (no eval)
#
# Usage:
#   video_editor_safe.sh <command> [options]
#
# Commands:
#   start               Initialize a new session
#   analyze             Analyze competitor video (clone mode only)
#   analyze-footage     Catalog a folder of clips (local or Google Drive)
#   storyboard          Load brand context for storyboard creation
#   set-storyboard      Save finalized storyboard to session
#   set-voice           Choose voice + generate preview
#   search-voices       Browse & preview ElevenLabs voice library
#   generate-voiceover  Generate full voiceover with timestamps
#   source-footage      Download/validate all scene footage
#   normalize           Normalize clips to target aspect ratio
#   set-captions        Choose caption style
#   suggest-music       AI-powered music suggestions (optional)
#   set-music           Set background music
#   plan                Generate assembly plan for approval
#   render              Execute video assembly
#   preview-scene       Render a single scene for quick preview (no audio)
#   render-variant      Render alternate version with overridden settings
#   deliver             Upload final video to Slack
#   list-catalogs       List all saved catalogs
#   search-clips        Search segments across all catalogs
#   attach-catalog      Attach existing catalog to a session
#   rename-catalog      Rename a catalog
#   list-sessions       List active sessions
#   session-status      Show session state
#   cleanup             Remove expired sessions
###############################################################################

# === Path Derivation (NEVER hardcode) ===
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROFILE_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
ENV_FILE="$PROFILE_ROOT/.env"
SKILL_ENV="$SCRIPT_DIR/../.env"
MEDIA_DIR="$PROFILE_ROOT/media"
SESSIONS_DIR="$PROFILE_ROOT/workspace/.video-sessions"
PLANS_DIR="$PROFILE_ROOT/workspace/.video-plans"
BRAND_DIR="$PROFILE_ROOT/workspace/brand"
PYTHON_SCRIPT="$SCRIPT_DIR/_video_editor.py"

# Session TTL in seconds (120 minutes)
SESSION_TTL=7200
# Plan TTL in seconds (30 minutes)
PLAN_TTL=1800

# === Temporal Hard Gate Constants ===
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

# === Safe .env Loading (no eval) ===
load_env_var() {
  local file="$1"
  local varname="$2"
  if [ -f "$file" ]; then
    while IFS='=' read -r key value; do
      key="$(echo "$key" | xargs)"
      case "$key" in
        "$varname")
          value="${value#\"}"
          value="${value%\"}"
          value="${value#\'}"
          value="${value%\'}"
          echo "$value"
          return 0
          ;;
      esac
    done < <(grep -E "^${varname}=" "$file" 2>/dev/null || true)
  fi
  echo ""
}

load_env_vars() {
  local file="$1"
  shift
  if [ -f "$file" ]; then
    for varname in "$@"; do
      if [ -z "${!varname:-}" ]; then
        local val
        val="$(load_env_var "$file" "$varname")"
        if [ -n "$val" ]; then
          export "$varname=$val"
        fi
      fi
    done
  fi
}

# Load credentials from profile .env, then skill .env as fallback
load_env_vars "$ENV_FILE" \
  ELEVEN_API_KEY \
  PEXELS_API_KEY \
  GEMINI_API_KEY \
  LITELLM_API_KEY \
  SLACK_BOT_TOKEN \
  BRAND_NAME \
  BRAND_CATEGORY \
  GOOGLE_APPLICATION_CREDENTIALS \
  GOOGLE_CLOUD_PROJECT \
  VERTEX_PROJECT \
  VERTEX_LOCATION \
  FREESOUND_API_KEY \
  CGK_PLATFORM_API_URL \
  CGK_PLATFORM_API_KEY \
  CGK_PLATFORM_TENANT_SLUG

load_env_vars "$SKILL_ENV" \
  PEXELS_API_KEY \
  FREESOUND_API_KEY

# Export derived paths for Python
export PROFILE_ROOT
export MEDIA_DIR
export SESSIONS_DIR
export PLANS_DIR
export BRAND_DIR
export SCRIPT_DIR

# === Sandbox Path Resolution ===
resolve_host_path() {
  local path="$1"
  case "$path" in
    /workspace/*)
      echo "${PROFILE_ROOT}${path#/workspace}"
      ;;
    *)
      echo "$path"
      ;;
  esac
}

# === Slack Validation ===
validate_slack() {
  if [ -z "${SLACK_CHANNEL_ID:-}" ]; then
    echo "ERROR: SLACK_CHANNEL_ID is not set. Refusing to run." >&2
    echo "The agent MUST pass SLACK_CHANNEL_ID as an env var." >&2
    exit 1
  fi
  if [ -z "${SLACK_THREAD_TS:-}" ]; then
    echo "ERROR: SLACK_THREAD_TS is not set. Refusing to run." >&2
    echo "The agent MUST pass SLACK_THREAD_TS as an env var." >&2
    exit 1
  fi
}

# === Credential Validation ===
validate_elevenlabs() {
  if [ -z "${ELEVEN_API_KEY:-}" ]; then
    echo "ERROR: ELEVEN_API_KEY not found in profile .env or skill .env." >&2
    echo "Add ELEVEN_API_KEY to $ENV_FILE" >&2
    exit 1
  fi
}

validate_pexels() {
  if [ -z "${PEXELS_API_KEY:-}" ]; then
    echo "ERROR: PEXELS_API_KEY not found in profile .env or skill .env." >&2
    echo "Get a free key at https://www.pexels.com/api/ and add to $SKILL_ENV" >&2
    exit 1
  fi
}

# === Session Helpers ===
validate_session() {
  local session_id="$1"
  local session_file="$SESSIONS_DIR/${session_id}.json"

  if [ ! -f "$session_file" ]; then
    echo "ERROR: Session '$session_id' not found at $session_file" >&2
    exit 1
  fi

  # Check TTL
  local created
  created="$(python3 -c "import json,sys; d=json.load(open('$session_file')); print(d.get('created_epoch',0))")"
  local now
  now="$(date +%s)"
  local age=$(( now - created ))

  if [ "$age" -gt "$SESSION_TTL" ]; then
    echo "ERROR: Session '$session_id' has expired (age: ${age}s, TTL: ${SESSION_TTL}s)." >&2
    echo "Start a new session with: video_editor_safe.sh start" >&2
    exit 1
  fi

  # Thread affinity check
  local session_channel session_thread
  session_channel="$(python3 -c "import json; d=json.load(open('$session_file')); print(d.get('slack_channel_id',''))")"
  session_thread="$(python3 -c "import json; d=json.load(open('$session_file')); print(d.get('slack_thread_ts',''))")"

  if [ -n "$session_channel" ] && [ "$session_channel" != "${SLACK_CHANNEL_ID:-}" ]; then
    echo "ERROR: Session '$session_id' is bound to channel $session_channel but current channel is ${SLACK_CHANNEL_ID:-unset}." >&2
    echo "Resume from the original thread or start a new session." >&2
    exit 1
  fi

  if [ -n "$session_thread" ] && [ "$session_thread" != "${SLACK_THREAD_TS:-}" ]; then
    echo "ERROR: Session '$session_id' is bound to thread $session_thread but current thread is ${SLACK_THREAD_TS:-unset}." >&2
    echo "Resume from the original thread or start a new session." >&2
    exit 1
  fi

  echo "$session_file"
}

# === Ensure directories exist ===
ensure_dirs() {
  mkdir -p "$SESSIONS_DIR/completed" 2>/dev/null || true
  mkdir -p "$PLANS_DIR/completed" 2>/dev/null || true
  mkdir -p "$MEDIA_DIR" 2>/dev/null || true
  mkdir -p "$PROFILE_ROOT/workspace/.video-catalogs" 2>/dev/null || true
}

# === Command Dispatch ===
COMMAND="${1:-help}"
shift || true

case "$COMMAND" in

  # ---------------------------------------------------------------
  # start -- Initialize a new session
  # ---------------------------------------------------------------
  start)
    validate_slack
    ensure_dirs

    MODE=""
    SOURCE_VIDEO=""
    while [ $# -gt 0 ]; do
      case "$1" in
        --mode) MODE="$2"; shift 2 ;;
        --source-video) SOURCE_VIDEO="$(resolve_host_path "$2")"; shift 2 ;;
        *) echo "ERROR: Unknown option: $1" >&2; exit 1 ;;
      esac
    done

    if [ -z "$MODE" ]; then
      echo "ERROR: --mode is required (original|clone)" >&2
      exit 1
    fi
    if [ "$MODE" != "original" ] && [ "$MODE" != "clone" ]; then
      echo "ERROR: --mode must be 'original' or 'clone', got '$MODE'" >&2
      exit 1
    fi
    if [ "$MODE" = "clone" ] && [ -z "$SOURCE_VIDEO" ]; then
      echo "ERROR: Clone mode requires --source-video <path_or_url>" >&2
      exit 1
    fi

    # Validate source video exists if it's a local path
    if [ -n "$SOURCE_VIDEO" ] && [[ ! "$SOURCE_VIDEO" =~ ^https?:// ]]; then
      if [ ! -f "$SOURCE_VIDEO" ]; then
        echo "ERROR: Source video not found: $SOURCE_VIDEO" >&2
        exit 1
      fi
    fi

    SESSION_ID="vid-$(date +%Y%m%d-%H%M%S)-$$"
    export SESSION_ID MODE SOURCE_VIDEO
    VIDEO_EDITOR_SAFE=1 uv run "$PYTHON_SCRIPT" start
    ;;

  # ---------------------------------------------------------------
  # analyze -- Analyze competitor video (clone mode only)
  # ---------------------------------------------------------------
  analyze)
    validate_slack
    SESSION_ID=""
    while [ $# -gt 0 ]; do
      case "$1" in
        --session) SESSION_ID="$2"; shift 2 ;;
        *) echo "ERROR: Unknown option: $1" >&2; exit 1 ;;
      esac
    done
    if [ -z "$SESSION_ID" ]; then
      echo "ERROR: --session <ID> is required" >&2; exit 1
    fi
    validate_session "$SESSION_ID" >/dev/null
    export SESSION_ID
    VIDEO_EDITOR_SAFE=1 uv run "$PYTHON_SCRIPT" analyze
    ;;

  # ---------------------------------------------------------------
  # analyze-footage -- Catalog a folder of video clips
  # ---------------------------------------------------------------
  analyze-footage)
    ensure_dirs
    FOOTAGE_SOURCE=""
    SESSION_ID=""
    MAX_CLIPS="50"
    CATALOG_ID=""
    CATALOG_NAME=""
    CATALOG_TAGS=""
    MIN_FILE_SIZE=""
    while [ $# -gt 0 ]; do
      case "$1" in
        --source) FOOTAGE_SOURCE="$(resolve_host_path "$2")"; shift 2 ;;
        --gdrive) FOOTAGE_SOURCE="gdrive:$2"; shift 2 ;;
        --session) SESSION_ID="$2"; shift 2 ;;
        --max-clips) MAX_CLIPS="$2"; shift 2 ;;
        --min-size) MIN_FILE_SIZE="$2"; shift 2 ;;
        --catalog) CATALOG_ID="$2"; shift 2 ;;
        --name) CATALOG_NAME="$2"; shift 2 ;;
        --tag) CATALOG_TAGS="$2"; shift 2 ;;
        *) echo "ERROR: Unknown option: $1" >&2; exit 1 ;;
      esac
    done
    if [ -z "$FOOTAGE_SOURCE" ]; then
      echo "ERROR: --source <local_path> or --gdrive <folder_id_or_url> is required" >&2
      exit 1
    fi
    # Validate local path if not gdrive
    if [[ ! "$FOOTAGE_SOURCE" =~ ^gdrive: ]] && [ ! -d "$FOOTAGE_SOURCE" ]; then
      echo "ERROR: Local folder not found: $FOOTAGE_SOURCE" >&2
      exit 1
    fi
    # Validate session if provided
    if [ -n "$SESSION_ID" ]; then
      validate_slack
      validate_session "$SESSION_ID" >/dev/null
    fi
    export FOOTAGE_SOURCE SESSION_ID MAX_CLIPS CATALOG_ID CATALOG_NAME CATALOG_TAGS MIN_FILE_SIZE
    VIDEO_EDITOR_SAFE=1 uv run "$PYTHON_SCRIPT" analyze-footage
    ;;

  # ---------------------------------------------------------------
  # storyboard -- Load brand context for storyboard creation
  # ---------------------------------------------------------------
  storyboard)
    validate_slack
    SESSION_ID=""
    while [ $# -gt 0 ]; do
      case "$1" in
        --session) SESSION_ID="$2"; shift 2 ;;
        *) echo "ERROR: Unknown option: $1" >&2; exit 1 ;;
      esac
    done
    if [ -z "$SESSION_ID" ]; then
      echo "ERROR: --session <ID> is required" >&2; exit 1
    fi
    validate_session "$SESSION_ID" >/dev/null
    export SESSION_ID
    VIDEO_EDITOR_SAFE=1 uv run "$PYTHON_SCRIPT" storyboard
    ;;

  # ---------------------------------------------------------------
  # set-storyboard -- Save finalized storyboard
  # ---------------------------------------------------------------
  set-storyboard)
    validate_slack
    SESSION_ID=""
    STORYBOARD_JSON=""
    FORCE_UNCATALOGED=""
    while [ $# -gt 0 ]; do
      case "$1" in
        --session) SESSION_ID="$2"; shift 2 ;;
        --storyboard) STORYBOARD_JSON="$2"; shift 2 ;;
        --force-uncataloged) FORCE_UNCATALOGED="1"; shift ;;
        *) echo "ERROR: Unknown option: $1" >&2; exit 1 ;;
      esac
    done
    if [ -z "$SESSION_ID" ]; then
      echo "ERROR: --session <ID> is required" >&2; exit 1
    fi
    if [ -z "$STORYBOARD_JSON" ]; then
      echo "ERROR: --storyboard '<JSON>' is required" >&2; exit 1
    fi
    validate_session "$SESSION_ID" >/dev/null
    export SESSION_ID STORYBOARD_JSON FORCE_UNCATALOGED
    VIDEO_EDITOR_SAFE=1 uv run "$PYTHON_SCRIPT" set-storyboard
    ;;

  # ---------------------------------------------------------------
  # set-voice -- Choose voice + generate preview
  # ---------------------------------------------------------------
  set-voice)
    validate_slack
    validate_elevenlabs
    SESSION_ID=""
    VOICE_NAME=""
    VOICE_ID=""
    VOICE_PUBLIC_OWNER_ID=""
    while [ $# -gt 0 ]; do
      case "$1" in
        --session) SESSION_ID="$2"; shift 2 ;;
        --voice) VOICE_NAME="$2"; shift 2 ;;
        --voice-id) VOICE_ID="$2"; shift 2 ;;
        --public-owner-id) VOICE_PUBLIC_OWNER_ID="$2"; shift 2 ;;
        *) echo "ERROR: Unknown option: $1" >&2; exit 1 ;;
      esac
    done
    if [ -z "$SESSION_ID" ]; then
      echo "ERROR: --session <ID> is required" >&2; exit 1
    fi
    if [ -z "$VOICE_NAME" ] && [ -z "$VOICE_ID" ]; then
      echo "ERROR: --voice <name> or --voice-id <id> is required" >&2; exit 1
    fi
    validate_session "$SESSION_ID" >/dev/null
    export SESSION_ID VOICE_NAME VOICE_ID VOICE_PUBLIC_OWNER_ID
    VIDEO_EDITOR_SAFE=1 uv run "$PYTHON_SCRIPT" set-voice
    _PY_EXIT=$?
    if [[ $_PY_EXIT -eq 0 ]]; then
      _write_gate "$GATE_DIR/gate-voice-${SESSION_ID}.lock"
    fi
    exit $_PY_EXIT
    ;;

  # ---------------------------------------------------------------
  # search-voices -- Browse & preview ElevenLabs voice library
  # ---------------------------------------------------------------
  search-voices)
    validate_elevenlabs
    ensure_dirs
    VOICE_SEARCH_QUERY=""
    VOICE_SEARCH_GENDER=""
    VOICE_SEARCH_AGE=""
    VOICE_SEARCH_ACCENT=""
    VOICE_SEARCH_USE_CASE=""
    VOICE_SEARCH_CATEGORY=""
    VOICE_SEARCH_MY_VOICES=""
    VOICE_SEARCH_LIMIT="10"
    VOICE_SEARCH_MAX_PREVIEWS="5"
    while [ $# -gt 0 ]; do
      case "$1" in
        --query) VOICE_SEARCH_QUERY="$2"; shift 2 ;;
        --gender)
          case "$2" in
            male|female) ;;
            *) echo "ERROR: --gender must be 'male' or 'female', got '$2'" >&2; exit 1 ;;
          esac
          VOICE_SEARCH_GENDER="$2"; shift 2 ;;
        --age)
          case "$2" in
            young|middle_aged|old) ;;
            *) echo "ERROR: --age must be 'young', 'middle_aged', or 'old', got '$2'" >&2; exit 1 ;;
          esac
          VOICE_SEARCH_AGE="$2"; shift 2 ;;
        --accent) VOICE_SEARCH_ACCENT="$2"; shift 2 ;;
        --use-case) VOICE_SEARCH_USE_CASE="$2"; shift 2 ;;
        --category)
          case "$2" in
            professional|famous|high_quality) ;;
            *) echo "ERROR: --category must be 'professional', 'famous', or 'high_quality', got '$2'" >&2; exit 1 ;;
          esac
          VOICE_SEARCH_CATEGORY="$2"; shift 2 ;;
        --my-voices) VOICE_SEARCH_MY_VOICES="1"; shift ;;
        --limit) VOICE_SEARCH_LIMIT="$2"; shift 2 ;;
        --max-previews) VOICE_SEARCH_MAX_PREVIEWS="$2"; shift 2 ;;
        *) echo "ERROR: Unknown option: $1" >&2; exit 1 ;;
      esac
    done
    export VOICE_SEARCH_QUERY VOICE_SEARCH_GENDER VOICE_SEARCH_AGE
    export VOICE_SEARCH_ACCENT VOICE_SEARCH_USE_CASE VOICE_SEARCH_CATEGORY
    export VOICE_SEARCH_MY_VOICES VOICE_SEARCH_LIMIT VOICE_SEARCH_MAX_PREVIEWS
    VIDEO_EDITOR_SAFE=1 uv run "$PYTHON_SCRIPT" search-voices
    ;;

  # ---------------------------------------------------------------
  # generate-voiceover -- Full voiceover generation
  # ---------------------------------------------------------------
  generate-voiceover)
    validate_slack
    validate_elevenlabs
    SESSION_ID=""
    while [ $# -gt 0 ]; do
      case "$1" in
        --session) SESSION_ID="$2"; shift 2 ;;
        *) echo "ERROR: Unknown option: $1" >&2; exit 1 ;;
      esac
    done
    if [ -z "$SESSION_ID" ]; then
      echo "ERROR: --session <ID> is required" >&2; exit 1
    fi
    # Temporal hard gate: set-voice must have run >= 30s ago
    _check_gate "$GATE_DIR/gate-voice-${SESSION_ID}.lock" "set-voice" "generate-voiceover"
    validate_session "$SESSION_ID" >/dev/null
    export SESSION_ID
    VIDEO_EDITOR_SAFE=1 uv run "$PYTHON_SCRIPT" generate-voiceover
    ;;

  # ---------------------------------------------------------------
  # source-footage -- Download/collect all scene footage
  # ---------------------------------------------------------------
  source-footage)
    validate_slack
    SESSION_ID=""
    while [ $# -gt 0 ]; do
      case "$1" in
        --session) SESSION_ID="$2"; shift 2 ;;
        *) echo "ERROR: Unknown option: $1" >&2; exit 1 ;;
      esac
    done
    if [ -z "$SESSION_ID" ]; then
      echo "ERROR: --session <ID> is required" >&2; exit 1
    fi
    validate_session "$SESSION_ID" >/dev/null
    validate_pexels
    export SESSION_ID
    VIDEO_EDITOR_SAFE=1 uv run "$PYTHON_SCRIPT" source-footage
    ;;

  # ---------------------------------------------------------------
  # normalize -- Normalize all clips
  # ---------------------------------------------------------------
  normalize)
    validate_slack
    SESSION_ID=""
    ASPECT_RATIO=""
    while [ $# -gt 0 ]; do
      case "$1" in
        --session) SESSION_ID="$2"; shift 2 ;;
        --aspect-ratio) ASPECT_RATIO="$2"; shift 2 ;;
        *) echo "ERROR: Unknown option: $1" >&2; exit 1 ;;
      esac
    done
    if [ -z "$SESSION_ID" ]; then
      echo "ERROR: --session <ID> is required" >&2; exit 1
    fi
    if [ -z "$ASPECT_RATIO" ]; then
      echo "ERROR: --aspect-ratio <9:16|16:9|1:1> is required" >&2; exit 1
    fi
    case "$ASPECT_RATIO" in
      9:16|16:9|1:1|4:5) ;;
      *) echo "ERROR: Invalid aspect ratio '$ASPECT_RATIO'. Use 9:16, 16:9, 1:1, or 4:5" >&2; exit 1 ;;
    esac
    validate_session "$SESSION_ID" >/dev/null
    export SESSION_ID ASPECT_RATIO
    VIDEO_EDITOR_SAFE=1 uv run "$PYTHON_SCRIPT" normalize
    ;;

  # ---------------------------------------------------------------
  # set-captions -- Choose caption style
  # ---------------------------------------------------------------
  set-captions)
    validate_slack
    SESSION_ID=""
    CAPTION_STYLE=""
    CAPTION_JSON=""
    while [ $# -gt 0 ]; do
      case "$1" in
        --session) SESSION_ID="$2"; shift 2 ;;
        --style) CAPTION_STYLE="$2"; shift 2 ;;
        --custom) CAPTION_JSON="$2"; shift 2 ;;
        *) echo "ERROR: Unknown option: $1" >&2; exit 1 ;;
      esac
    done
    if [ -z "$SESSION_ID" ]; then
      echo "ERROR: --session <ID> is required" >&2; exit 1
    fi
    if [ -z "$CAPTION_STYLE" ] && [ -z "$CAPTION_JSON" ]; then
      echo "ERROR: --style <tiktok|minimal|bold|karaoke|none> or --custom '<JSON>' required" >&2; exit 1
    fi
    if [ -n "$CAPTION_STYLE" ]; then
      case "$CAPTION_STYLE" in
        tiktok|minimal|bold|karaoke|none) ;;
        *) echo "ERROR: Invalid style '$CAPTION_STYLE'. Use tiktok, minimal, bold, karaoke, or none" >&2; exit 1 ;;
      esac
    fi
    validate_session "$SESSION_ID" >/dev/null
    export SESSION_ID CAPTION_STYLE CAPTION_JSON
    VIDEO_EDITOR_SAFE=1 uv run "$PYTHON_SCRIPT" set-captions
    ;;

  # ---------------------------------------------------------------
  # suggest-music -- AI-powered music suggestions
  # ---------------------------------------------------------------
  suggest-music)
    validate_slack
    SESSION_ID=""
    while [ $# -gt 0 ]; do
      case "$1" in
        --session) SESSION_ID="$2"; shift 2 ;;
        *) echo "ERROR: Unknown option: $1" >&2; exit 1 ;;
      esac
    done
    if [ -z "$SESSION_ID" ]; then
      echo "ERROR: --session <ID> is required" >&2; exit 1
    fi
    validate_session "$SESSION_ID" >/dev/null
    export SESSION_ID
    VIDEO_EDITOR_SAFE=1 uv run "$PYTHON_SCRIPT" suggest-music
    ;;

  # ---------------------------------------------------------------
  # set-music -- Set background music
  # ---------------------------------------------------------------
  set-music)
    validate_slack
    SESSION_ID=""
    MUSIC_PATH=""
    MUSIC_VOLUME="0.15"
    while [ $# -gt 0 ]; do
      case "$1" in
        --session) SESSION_ID="$2"; shift 2 ;;
        --music)
          case "$2" in
            freesound:*|library:*) MUSIC_PATH="$2" ;;
            *) MUSIC_PATH="$(resolve_host_path "$2")" ;;
          esac
          shift 2 ;;
        --volume) MUSIC_VOLUME="$2"; shift 2 ;;
        --none) MUSIC_PATH="none"; shift ;;
        *) echo "ERROR: Unknown option: $1" >&2; exit 1 ;;
      esac
    done
    if [ -z "$SESSION_ID" ]; then
      echo "ERROR: --session <ID> is required" >&2; exit 1
    fi
    if [ -z "$MUSIC_PATH" ]; then
      echo "ERROR: --music <path|freesound:<id>|library:<file>> or --none is required" >&2; exit 1
    fi
    # Only validate file existence for raw paths (not freesound:/library: sources)
    if [ "$MUSIC_PATH" != "none" ] && \
       [[ ! "$MUSIC_PATH" =~ ^freesound: ]] && \
       [[ ! "$MUSIC_PATH" =~ ^library: ]] && \
       [ ! -f "$MUSIC_PATH" ]; then
      echo "ERROR: Music file not found: $MUSIC_PATH" >&2; exit 1
    fi
    validate_session "$SESSION_ID" >/dev/null
    export SESSION_ID MUSIC_PATH MUSIC_VOLUME
    VIDEO_EDITOR_SAFE=1 uv run "$PYTHON_SCRIPT" set-music
    ;;

  # ---------------------------------------------------------------
  # plan -- Generate assembly plan
  # ---------------------------------------------------------------
  plan)
    validate_slack
    SESSION_ID=""
    FORCE_PLAN=""
    while [ $# -gt 0 ]; do
      case "$1" in
        --session) SESSION_ID="$2"; shift 2 ;;
        --force) FORCE_PLAN="1"; shift ;;
        *) echo "ERROR: Unknown option: $1" >&2; exit 1 ;;
      esac
    done
    if [ -z "$SESSION_ID" ]; then
      echo "ERROR: --session <ID> is required" >&2; exit 1
    fi
    validate_session "$SESSION_ID" >/dev/null
    export SESSION_ID FORCE_PLAN
    VIDEO_EDITOR_SAFE=1 uv run "$PYTHON_SCRIPT" plan
    _PY_EXIT=$?
    if [[ $_PY_EXIT -eq 0 ]]; then
      _write_gate "$GATE_DIR/gate-plan-${SESSION_ID}.lock"
    fi
    exit $_PY_EXIT
    ;;

  # ---------------------------------------------------------------
  # render -- Execute video assembly
  # ---------------------------------------------------------------
  render)
    validate_slack
    SESSION_ID=""
    while [ $# -gt 0 ]; do
      case "$1" in
        --session) SESSION_ID="$2"; shift 2 ;;
        *) echo "ERROR: Unknown option: $1" >&2; exit 1 ;;
      esac
    done
    if [ -z "$SESSION_ID" ]; then
      echo "ERROR: --session <ID> is required" >&2; exit 1
    fi
    # Temporal hard gate: plan must have run >= 30s ago
    _check_gate "$GATE_DIR/gate-plan-${SESSION_ID}.lock" "plan" "render"
    validate_session "$SESSION_ID" >/dev/null
    export SESSION_ID
    VIDEO_EDITOR_SAFE=1 uv run "$PYTHON_SCRIPT" render
    ;;

  # ---------------------------------------------------------------
  # preview-scene -- Render a single scene for quick preview (no audio)
  # ---------------------------------------------------------------
  preview-scene)
    validate_slack
    SESSION_ID=""
    SCENE_NUM="1"
    while [ $# -gt 0 ]; do
      case "$1" in
        --session) SESSION_ID="$2"; shift 2 ;;
        --scene) SCENE_NUM="$2"; shift 2 ;;
        *) echo "ERROR: Unknown option: $1" >&2; exit 1 ;;
      esac
    done
    if [ -z "$SESSION_ID" ]; then
      echo "ERROR: --session <ID> is required" >&2; exit 1
    fi
    validate_session "$SESSION_ID" >/dev/null
    export SESSION_ID SCENE_NUM
    VIDEO_EDITOR_SAFE=1 uv run "$PYTHON_SCRIPT" preview-scene
    ;;

  # ---------------------------------------------------------------
  # render-variant -- Render an alternate version with setting overrides
  # ---------------------------------------------------------------
  render-variant)
    validate_slack
    SESSION_ID=""
    VARIANT_SUFFIX=""
    VARIANT_CAPTION_STYLE=""
    VARIANT_MUSIC_VOLUME=""
    while [ $# -gt 0 ]; do
      case "$1" in
        --session) SESSION_ID="$2"; shift 2 ;;
        --suffix) VARIANT_SUFFIX="$2"; shift 2 ;;
        --caption-style) VARIANT_CAPTION_STYLE="$2"; shift 2 ;;
        --music-volume) VARIANT_MUSIC_VOLUME="$2"; shift 2 ;;
        *) echo "ERROR: Unknown option: $1" >&2; exit 1 ;;
      esac
    done
    if [ -z "$SESSION_ID" ]; then
      echo "ERROR: --session <ID> is required" >&2; exit 1
    fi
    if [ -z "$VARIANT_SUFFIX" ]; then
      echo "ERROR: --suffix <name> is required" >&2; exit 1
    fi
    validate_session "$SESSION_ID" >/dev/null
    export SESSION_ID VARIANT_SUFFIX VARIANT_CAPTION_STYLE VARIANT_MUSIC_VOLUME
    VIDEO_EDITOR_SAFE=1 uv run "$PYTHON_SCRIPT" render-variant
    ;;

  # ---------------------------------------------------------------
  # deliver -- Upload final video to Slack
  # ---------------------------------------------------------------
  deliver)
    SESSION_ID=""
    while [ $# -gt 0 ]; do
      case "$1" in
        --session) SESSION_ID="$2"; shift 2 ;;
        *) echo "ERROR: Unknown option: $1" >&2; exit 1 ;;
      esac
    done
    if [ -z "$SESSION_ID" ]; then
      echo "ERROR: --session <ID> is required" >&2; exit 1
    fi
    # Soft Slack validation: if env vars missing, try to read from session JSON
    if [ -z "${SLACK_CHANNEL_ID:-}" ] || [ -z "${SLACK_THREAD_TS:-}" ]; then
      SESSION_FILE="$SESSIONS_DIR/${SESSION_ID}.json"
      if [ -f "$SESSION_FILE" ]; then
        if [ -z "${SLACK_CHANNEL_ID:-}" ]; then
          SLACK_CHANNEL_ID="$(python3 -c "import json; print(json.load(open('$SESSION_FILE')).get('slack_channel_id',''))" 2>/dev/null || true)"
          if [ -n "$SLACK_CHANNEL_ID" ]; then
            export SLACK_CHANNEL_ID
          fi
        fi
        if [ -z "${SLACK_THREAD_TS:-}" ]; then
          SLACK_THREAD_TS="$(python3 -c "import json; print(json.load(open('$SESSION_FILE')).get('slack_thread_ts',''))" 2>/dev/null || true)"
          if [ -n "$SLACK_THREAD_TS" ]; then
            export SLACK_THREAD_TS
          fi
        fi
      fi
    fi
    # Still require at least channel (thread may be empty for DMs)
    if [ -z "${SLACK_CHANNEL_ID:-}" ]; then
      echo "ERROR: SLACK_CHANNEL_ID is not set and not found in session JSON." >&2
      echo "The agent MUST pass SLACK_CHANNEL_ID as an env var." >&2
      exit 1
    fi
    validate_session "$SESSION_ID" >/dev/null
    export SESSION_ID
    VIDEO_EDITOR_SAFE=1 uv run "$PYTHON_SCRIPT" deliver
    ;;

  # ---------------------------------------------------------------
  # Catalog Commands (no session/Slack required for read-only)
  # ---------------------------------------------------------------
  list-catalogs)
    ensure_dirs
    SORT_BY="created"
    TAG_FILTER=""
    SOURCE_FILTER=""
    LIMIT="20"
    OFFSET="0"
    while [ $# -gt 0 ]; do
      case "$1" in
        --sort) SORT_BY="$2"; shift 2 ;;
        --tag) TAG_FILTER="$2"; shift 2 ;;
        --source) SOURCE_FILTER="$2"; shift 2 ;;
        --limit) LIMIT="$2"; shift 2 ;;
        --offset) OFFSET="$2"; shift 2 ;;
        *) echo "ERROR: Unknown option: $1" >&2; exit 1 ;;
      esac
    done
    export SORT_BY TAG_FILTER SOURCE_FILTER LIMIT OFFSET
    VIDEO_EDITOR_SAFE=1 uv run "$PYTHON_SCRIPT" list-catalogs
    ;;

  search-clips)
    ensure_dirs
    SEARCH_QUERY=""
    CATALOG_ID=""
    LIMIT="20"
    OFFSET="0"
    EXCLUDE_HEAVY_TEXT=""
    while [ $# -gt 0 ]; do
      case "$1" in
        --query) SEARCH_QUERY="$2"; shift 2 ;;
        --catalog) CATALOG_ID="$2"; shift 2 ;;
        --limit) LIMIT="$2"; shift 2 ;;
        --offset) OFFSET="$2"; shift 2 ;;
        --exclude-heavy-text) EXCLUDE_HEAVY_TEXT="1"; shift ;;
        *) echo "ERROR: Unknown option: $1" >&2; exit 1 ;;
      esac
    done
    if [ -z "$SEARCH_QUERY" ]; then
      echo "ERROR: --query <text> is required" >&2; exit 1
    fi
    export SEARCH_QUERY CATALOG_ID LIMIT OFFSET EXCLUDE_HEAVY_TEXT
    VIDEO_EDITOR_SAFE=1 uv run "$PYTHON_SCRIPT" search-clips
    ;;

  attach-catalog)
    validate_slack
    SESSION_ID=""
    CATALOG_ID=""
    while [ $# -gt 0 ]; do
      case "$1" in
        --session) SESSION_ID="$2"; shift 2 ;;
        --catalog) CATALOG_ID="$2"; shift 2 ;;
        *) echo "ERROR: Unknown option: $1" >&2; exit 1 ;;
      esac
    done
    if [ -z "$SESSION_ID" ]; then
      echo "ERROR: --session <ID> is required" >&2; exit 1
    fi
    if [ -z "$CATALOG_ID" ]; then
      echo "ERROR: --catalog <catalog_id> is required" >&2; exit 1
    fi
    validate_session "$SESSION_ID" >/dev/null
    export SESSION_ID CATALOG_ID
    VIDEO_EDITOR_SAFE=1 uv run "$PYTHON_SCRIPT" attach-catalog
    ;;

  rename-catalog)
    ensure_dirs
    CATALOG_ID=""
    CATALOG_NAME=""
    while [ $# -gt 0 ]; do
      case "$1" in
        --catalog) CATALOG_ID="$2"; shift 2 ;;
        --name) CATALOG_NAME="$2"; shift 2 ;;
        *) echo "ERROR: Unknown option: $1" >&2; exit 1 ;;
      esac
    done
    if [ -z "$CATALOG_ID" ]; then
      echo "ERROR: --catalog <catalog_id> is required" >&2; exit 1
    fi
    if [ -z "$CATALOG_NAME" ]; then
      echo "ERROR: --name <new_name> is required" >&2; exit 1
    fi
    export CATALOG_ID CATALOG_NAME
    VIDEO_EDITOR_SAFE=1 uv run "$PYTHON_SCRIPT" rename-catalog
    ;;

  # ---------------------------------------------------------------
  # Utility Commands
  # ---------------------------------------------------------------
  list-sessions)
    ensure_dirs
    echo "=== Active Video Sessions ==="
    for f in "$SESSIONS_DIR"/vid-*.json; do
      [ -f "$f" ] || { echo "No active sessions."; break; }
      local_id="$(basename "$f" .json)"
      mode="$(python3 -c "import json; print(json.load(open('$f')).get('mode','?'))" 2>/dev/null || echo "?")"
      created="$(python3 -c "import json; print(json.load(open('$f')).get('created','?'))" 2>/dev/null || echo "?")"
      echo "  $local_id  mode=$mode  created=$created"
    done
    ;;

  session-status)
    SESSION_ID=""
    while [ $# -gt 0 ]; do
      case "$1" in
        --session) SESSION_ID="$2"; shift 2 ;;
        *) echo "ERROR: Unknown option: $1" >&2; exit 1 ;;
      esac
    done
    if [ -z "$SESSION_ID" ]; then
      echo "ERROR: --session <ID> is required" >&2; exit 1
    fi
    SESSION_FILE="$SESSIONS_DIR/${SESSION_ID}.json"
    if [ ! -f "$SESSION_FILE" ]; then
      echo "ERROR: Session not found: $SESSION_ID" >&2; exit 1
    fi
    python3 -c "
import json, sys
d = json.load(open('$SESSION_FILE'))
print('=== Session: {} ==='.format(d['session_id']))
print('Mode: {}'.format(d['mode']))
print('Created: {}'.format(d['created']))
steps = [
    ('analyze', d.get('mode') == 'clone'),
    ('storyboard', True),
    ('voice', True),
    ('voiceover', True),
    ('footage', True),
    ('normalize', True),
    ('captions', True),
    ('music', True),
    ('plan', True),
    ('render', True),
    ('delivered', True),
]
for step, applicable in steps:
    if not applicable:
        continue
    key = step + '_done' if step != 'delivered' else 'delivered'
    done = d.get(key, False)
    status = 'DONE' if done else 'PENDING'
    print('  {:20s} {}'.format(step, status))
"
    ;;

  cleanup)
    ensure_dirs
    echo "Cleaning up expired sessions..."
    NOW="$(date +%s)"
    COUNT=0
    for f in "$SESSIONS_DIR"/vid-*.json; do
      [ -f "$f" ] || break
      created="$(python3 -c "import json; print(json.load(open('$f')).get('created_epoch',0))" 2>/dev/null || echo "0")"
      age=$(( NOW - created ))
      if [ "$age" -gt "$SESSION_TTL" ]; then
        mv "$f" "$SESSIONS_DIR/completed/"
        COUNT=$((COUNT + 1))
      fi
    done
    echo "Archived $COUNT expired sessions."

    echo "Cleaning up expired plans..."
    PCOUNT=0
    for f in "$PLANS_DIR"/vid-*-plan.json; do
      [ -f "$f" ] || break
      created="$(python3 -c "import json; print(json.load(open('$f')).get('created_epoch',0))" 2>/dev/null || echo "0")"
      age=$(( NOW - created ))
      if [ "$age" -gt "$PLAN_TTL" ]; then
        mv "$f" "$PLANS_DIR/completed/"
        PCOUNT=$((PCOUNT + 1))
      fi
    done
    echo "Archived $PCOUNT expired plans."

    # Clean up expired gate lockfiles (>24h)
    GCOUNT=0
    if [ -d "$GATE_DIR" ]; then
      for gf in "$GATE_DIR"/gate-*.lock; do
        [ -f "$gf" ] || break
        gmtime="$(stat -f%m "$gf" 2>/dev/null || stat --format=%Y "$gf" 2>/dev/null)"
        gage=$(( NOW - gmtime ))
        if [ "$gage" -gt 86400 ]; then
          rm -f "$gf"
          GCOUNT=$((GCOUNT + 1))
        fi
      done
    fi
    echo "Removed $GCOUNT expired gate lockfiles."
    ;;

  # ---------------------------------------------------------------
  # cleanup-media -- Clean up expired local media files (TTL-based)
  # ---------------------------------------------------------------
  cleanup-media)
    ensure_dirs
    TTL_DAYS="7"
    DRY_RUN=""
    FORCE=""
    REPORT=""
    DAM_VERIFIED=""
    while [ $# -gt 0 ]; do
      case "$1" in
        --ttl-days) TTL_DAYS="$2"; shift 2 ;;
        --dry-run) DRY_RUN="1"; shift ;;
        --force) FORCE="1"; shift ;;
        --report) REPORT="1"; shift ;;
        --dam-verified) DAM_VERIFIED="1"; shift ;;
        *) echo "ERROR: Unknown option: $1" >&2; exit 1 ;;
      esac
    done
    export TTL_DAYS DRY_RUN FORCE REPORT DAM_VERIFIED
    VIDEO_EDITOR_SAFE=1 uv run "$PYTHON_SCRIPT" cleanup-media
    ;;

  # ---------------------------------------------------------------
  # catalog-add -- Add individual clip(s) to master catalog
  # ---------------------------------------------------------------
  catalog-add)
    ensure_dirs
    CLIP_PATHS=""
    SOURCE_TYPE=""
    # Collect file paths (positional args before options)
    while [ $# -gt 0 ]; do
      case "$1" in
        --source-type) SOURCE_TYPE="$2"; shift 2 ;;
        -*)
          echo "ERROR: Unknown option: $1" >&2; exit 1 ;;
        *)
          # Resolve path
          resolved="$(resolve_host_path "$1")"
          if [ ! -f "$resolved" ]; then
            echo "ERROR: File not found: $resolved" >&2; exit 1
          fi
          # Check extension
          ext="${resolved##*.}"
          case "$ext" in
            mp4|mov|avi|mkv|webm|m4v) ;;
            *) echo "ERROR: Not a video file: $resolved (.$ext)" >&2; exit 1 ;;
          esac
          if [ -n "$CLIP_PATHS" ]; then
            CLIP_PATHS="$CLIP_PATHS,$resolved"
          else
            CLIP_PATHS="$resolved"
          fi
          shift ;;
      esac
    done
    if [ -z "$CLIP_PATHS" ]; then
      echo "ERROR: At least one video file path is required." >&2
      echo "Usage: video_editor_safe.sh catalog-add <file>... [--source-type social|inbound|veo|local]" >&2
      exit 1
    fi
    if [ -n "$SOURCE_TYPE" ]; then
      case "$SOURCE_TYPE" in
        social|inbound|veo|local|gdrive|stock) ;;
        *) echo "ERROR: Invalid source type '$SOURCE_TYPE'. Use social, inbound, veo, local, gdrive, or stock." >&2; exit 1 ;;
      esac
    fi
    export CLIP_PATHS SOURCE_TYPE
    VIDEO_EDITOR_SAFE=1 uv run "$PYTHON_SCRIPT" catalog-add
    ;;

  # ---------------------------------------------------------------
  # catalog-pending -- Process queued clips for master catalog
  # ---------------------------------------------------------------
  catalog-pending)
    ensure_dirs
    VIDEO_EDITOR_SAFE=1 uv run "$PYTHON_SCRIPT" catalog-pending
    ;;

  # ---------------------------------------------------------------
  # use-template -- Generate storyboard from template
  # ---------------------------------------------------------------
  use-template)
    ensure_dirs
    TEMPLATE_ID=""
    TEMPLATE_DURATION="30"
    while [ $# -gt 0 ]; do
      case "$1" in
        --template) TEMPLATE_ID="$2"; shift 2 ;;
        --duration) TEMPLATE_DURATION="$2"; shift 2 ;;
        *) echo "ERROR: Unknown option: $1" >&2; exit 1 ;;
      esac
    done
    export TEMPLATE_ID TEMPLATE_DURATION
    VIDEO_EDITOR_SAFE=1 uv run "$PYTHON_SCRIPT" use-template
    ;;

  # ---------------------------------------------------------------
  # gc -- Garbage-collect session intermediate files
  # ---------------------------------------------------------------
  gc)
    ensure_dirs
    GC_DRY_RUN=""
    GC_AGGRESSIVE=""
    while [ $# -gt 0 ]; do
      case "$1" in
        --dry-run) GC_DRY_RUN="1"; shift ;;
        --aggressive) GC_AGGRESSIVE="1"; shift ;;
        *) echo "ERROR: Unknown option: $1" >&2; exit 1 ;;
      esac
    done
    export GC_DRY_RUN GC_AGGRESSIVE
    VIDEO_EDITOR_SAFE=1 uv run "$PYTHON_SCRIPT" gc
    ;;

  # ---------------------------------------------------------------
  # catalog-audit-text -- Audit clips for burned-in text overlays
  # ---------------------------------------------------------------
  catalog-audit-text)
    ensure_dirs
    VIDEO_EDITOR_SAFE=1 uv run "$PYTHON_SCRIPT" catalog-audit-text
    ;;

  # ---------------------------------------------------------------
  # build-embeddings -- Generate semantic embeddings for catalog search
  # ---------------------------------------------------------------
  build-embeddings)
    ensure_dirs
    CATALOG_ID=""
    FORCE_EMBEDDINGS=""
    while [ $# -gt 0 ]; do
      case "$1" in
        --catalog) CATALOG_ID="$2"; shift 2 ;;
        --force) FORCE_EMBEDDINGS="1"; shift ;;
        *) echo "ERROR: Unknown option: $1" >&2; exit 1 ;;
      esac
    done
    export CATALOG_ID FORCE_EMBEDDINGS
    VIDEO_EDITOR_SAFE=1 uv run "$PYTHON_SCRIPT" build-embeddings
    ;;

  # ---------------------------------------------------------------
  # sync -- Push session state to CGK Platform Creative Studio
  # ---------------------------------------------------------------
  sync)
    validate_slack
    SESSION_ID=""
    while [ $# -gt 0 ]; do
      case "$1" in
        --session) SESSION_ID="$2"; shift 2 ;;
        *) echo "ERROR: Unknown option: $1" >&2; exit 1 ;;
      esac
    done
    if [ -z "$SESSION_ID" ]; then
      echo "ERROR: --session <ID> is required" >&2
      exit 1
    fi
    validate_session "$SESSION_ID" >/dev/null
    export SESSION_ID
    VIDEO_EDITOR_SAFE=1 uv run "$PYTHON_SCRIPT" sync
    ;;

  # ---------------------------------------------------------------
  # batch-variants -- Render multiple variants in one pass
  # ---------------------------------------------------------------
  batch-variants)
    validate_slack
    SESSION_ID=""
    VARIANTS=""
    while [ $# -gt 0 ]; do
      case "$1" in
        --session) SESSION_ID="$2"; shift 2 ;;
        --variants) VARIANTS="$2"; shift 2 ;;
        *) echo "ERROR: Unknown option: $1" >&2; exit 1 ;;
      esac
    done
    if [ -z "$SESSION_ID" ]; then
      echo "ERROR: --session <ID> is required" >&2
      exit 1
    fi
    validate_session "$SESSION_ID" >/dev/null
    export SESSION_ID
    if [ -n "$VARIANTS" ]; then
      export VARIANTS
    fi
    VIDEO_EDITOR_SAFE=1 uv run "$PYTHON_SCRIPT" batch-variants
    ;;

  help|--help|-h)
    echo "video_editor_safe.sh -- openCLAW Video Editor (session-based workflow)"
    echo ""
    echo "Usage: video_editor_safe.sh <command> [options]"
    echo ""
    echo "Workflow Commands (run in order):"
    echo "  start               --mode original|clone [--source-video <path>]"
    echo "  analyze             --session <ID>  (clone mode only)"
    echo "  analyze-footage     --source <path> | --gdrive <folder_id> [--session <ID>] [--max-clips N]"
    echo "                      [--name <name>] [--catalog <id>] [--tag <tags>] [--min-size <bytes>]"
    echo "  storyboard          --session <ID>"
    echo "  set-storyboard      --session <ID> --storyboard '<JSON>' [--force-uncataloged]"
    echo "  set-voice           --session <ID> --voice <name> [--voice-id <id>] [--public-owner-id <id>]"
    echo "  search-voices       [--query <text>] [--gender male|female] [--age young|middle_aged|old]"
    echo "                      [--accent <accent>] [--use-case <use_case>] [--category professional|famous|high_quality]"
    echo "                      [--my-voices] [--limit N] [--max-previews N]"
    echo "  generate-voiceover  --session <ID>"
    echo "  source-footage      --session <ID>"
    echo "  normalize           --session <ID> --aspect-ratio 9:16|16:9|1:1|4:5"
    echo "  set-captions        --session <ID> --style tiktok|minimal|bold|karaoke|none"
    echo "  suggest-music       --session <ID>  (AI-powered music suggestions)"
    echo "  set-music           --session <ID> --music <path|freesound:<id>|library:<file>> | --none"
    echo "  plan                --session <ID> [--force]"
    echo "  render              --session <ID>"
    echo "  preview-scene       --session <ID> [--scene <N>]  Render single scene preview (no audio)"
    echo "  render-variant      --session <ID> --suffix <name> [--caption-style <style>] [--music-volume <0.0-1.0>]"
    echo "  deliver             --session <ID>"
    echo ""
    echo "Catalog Commands:"
    echo "  list-catalogs       [--sort created|name|clips|duration] [--tag <tag>] [--limit N] [--offset N]"
    echo "  search-clips        --query <text> [--catalog <id>] [--limit N] [--offset N] [--exclude-heavy-text]"
    echo "  attach-catalog      --session <ID> --catalog <catalog_id>"
    echo "  rename-catalog      --catalog <catalog_id> --name <new_name>"
    echo ""
    echo "Utility Commands:"
    echo "  list-sessions       List active sessions"
    echo "  session-status      --session <ID>  Show session state"
    echo "  sync                --session <ID>  Push session state to CGK Platform Creative Studio"
  echo "  cleanup             Archive expired sessions and plans"
    echo "  catalog-add         <file>... [--source-type social|inbound|veo|local]  Add clip(s) to master catalog"
    echo "  use-template        [--template <id>] [--duration <seconds>]  Generate storyboard from template"
    echo "  gc                  [--dry-run] [--aggressive]  Clean up session intermediate files"
    echo "  catalog-pending     Process queued clips (stock/social from source-footage)"
    echo "  catalog-audit-text  Audit all clips for burned-in text overlay contamination"
    echo "  cleanup-media       [--ttl-days N] [--dry-run] [--force] [--report] [--dam-verified]"
    echo "  build-embeddings    [--catalog <id>] [--force]  Generate semantic search embeddings"
    echo ""
    echo "Environment Variables (required):"
    echo "  SLACK_CHANNEL_ID    Slack channel for delivery"
    echo "  SLACK_THREAD_TS     Slack thread for delivery"
    echo ""
    echo "API Keys (in profile .env or skill .env):"
    echo "  ELEVEN_API_KEY      ElevenLabs TTS"
    echo "  PEXELS_API_KEY      Pexels stock footage"
    echo "  FREESOUND_API_KEY   Freesound music search (optional -- free at freesound.org/apiv2/apply)"
    ;;

  *)
    echo "ERROR: Unknown command '$COMMAND'. Run 'video_editor_safe.sh help' for usage." >&2
    exit 1
    ;;
esac
