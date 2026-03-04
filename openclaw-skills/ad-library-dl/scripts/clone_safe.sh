#!/usr/bin/env bash
# clone_safe.sh -- Safe wrapper for clone_competitor.py
# This is the ONLY valid entry point for clone workflows.
# Agents MUST call this script -- never clone_competitor.py directly.
#
# Enforces:
#   1. Slack context required (SLACK_CHANNEL_ID + SLACK_THREAD_TS)
#   2. Subcommand whitelist (interactive session commands only)
#   3. Batch mode flags blocked (--execute, --delegate)
#   3.5. Temporal hard gate -- 30s minimum delay between gate-pair commands
#   4. Sets CLONE_SAFE=1 env var (clone_competitor.py hard-rejects without it)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLONE_PY="$SCRIPT_DIR/clone_competitor.py"

# --- Gate 1: Slack context required ---
if [[ -z "${SLACK_CHANNEL_ID:-}" ]]; then
    echo "ERROR: SLACK_CHANNEL_ID is required." >&2
    echo "Clone workflow cannot run without Slack context." >&2
    exit 1
fi
if [[ -z "${SLACK_THREAD_TS:-}" ]]; then
    echo "ERROR: SLACK_THREAD_TS is required." >&2
    echo "Clone workflow cannot run without thread context." >&2
    exit 1
fi

# --- Gate 2: Subcommand whitelist ---
ALLOWED_SUBCOMMANDS="init show-ad set-product copy-gen set-copy plan execute skip skip-all session-status list-sessions"
SUBCOMMAND="${1:-}"

if [[ -z "$SUBCOMMAND" ]]; then
    echo "ERROR: Subcommand required." >&2
    echo "Allowed: $ALLOWED_SUBCOMMANDS" >&2
    echo "" >&2
    echo "Usage: clone_safe.sh <subcommand> [args...]" >&2
    echo "Example: clone_safe.sh init --brand BrandDir --top 5 --type statics" >&2
    exit 1
fi

# Check against whitelist
VALID=0
for cmd in $ALLOWED_SUBCOMMANDS; do
    if [[ "$SUBCOMMAND" == "$cmd" ]]; then
        VALID=1
        break
    fi
done

if [[ "$VALID" -eq 0 ]]; then
    echo "ERROR: Invalid subcommand '$SUBCOMMAND'." >&2
    echo "Allowed: $ALLOWED_SUBCOMMANDS" >&2
    exit 1
fi

# --- Gate 3: Block batch mode flags ---
for arg in "$@"; do
    case "$arg" in
        --execute)
            echo "ERROR: --execute flag is not allowed. Batch mode is disabled." >&2
            echo "Use the interactive session flow instead." >&2
            exit 1
            ;;
        --delegate)
            echo "ERROR: --delegate flag is not allowed." >&2
            echo "Use the interactive session flow instead." >&2
            exit 1
            ;;
    esac
done

# --- Gate 3.5: Temporal hard gate ---
# Enforces a minimum 30-second delay between gate-pair commands:
#   show-ad  -> set-product  (user must choose product)
#   copy-gen -> set-copy     (user must pick copy option)
#   plan     -> execute      (user must approve plan)
#
# This makes it physically impossible for an embedded sub-agent to blow
# through all gates in a single automated turn (<1s between calls).
# Real user interaction (read Slack, type response) takes 30+ seconds.

PROFILE_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
GATE_DIR="$PROFILE_ROOT/workspace/.clone-sessions/gates"
mkdir -p "$GATE_DIR" 2>/dev/null || true
GATE_MIN_DELAY=30  # seconds

# Extract --session and --index from args
SESSION_ID=""
AD_INDEX="0"
_NEXT_IS_SESSION=false
_NEXT_IS_INDEX=false
for arg in "$@"; do
    if $_NEXT_IS_SESSION; then SESSION_ID="$arg"; _NEXT_IS_SESSION=false; continue; fi
    if $_NEXT_IS_INDEX; then AD_INDEX="$arg"; _NEXT_IS_INDEX=false; continue; fi
    case "$arg" in
        --session) _NEXT_IS_SESSION=true ;;
        --index)  _NEXT_IS_INDEX=true ;;
    esac
done

# Gate-exit commands: check lockfile exists AND is old enough
case "$SUBCOMMAND" in
    set-product)
        GATE_FILE="$GATE_DIR/gate-show-${SESSION_ID}-${AD_INDEX}.lock"
        if [[ ! -f "$GATE_FILE" ]]; then
            echo "ERROR: HARD GATE -- show-ad must run before set-product." >&2
            echo "Run show-ad first, then wait for user input via Slack." >&2
            exit 1
        fi
        GATE_TS="$(cat "$GATE_FILE")"
        GATE_AGE=$(( $(date +%s) - GATE_TS ))
        if [[ "$GATE_AGE" -lt "$GATE_MIN_DELAY" ]]; then
            echo "ERROR: HARD GATE -- ${GATE_MIN_DELAY}s minimum between show-ad and set-product (${GATE_AGE}s elapsed)." >&2
            echo "This gate requires user input via Slack. Do not auto-proceed." >&2
            exit 1
        fi
        ;;
    set-copy)
        GATE_FILE="$GATE_DIR/gate-copygen-${SESSION_ID}-${AD_INDEX}.lock"
        if [[ ! -f "$GATE_FILE" ]]; then
            echo "ERROR: HARD GATE -- copy-gen must run before set-copy." >&2
            echo "Run copy-gen first, then wait for user input via Slack." >&2
            exit 1
        fi
        GATE_TS="$(cat "$GATE_FILE")"
        GATE_AGE=$(( $(date +%s) - GATE_TS ))
        if [[ "$GATE_AGE" -lt "$GATE_MIN_DELAY" ]]; then
            echo "ERROR: HARD GATE -- ${GATE_MIN_DELAY}s minimum between copy-gen and set-copy (${GATE_AGE}s elapsed)." >&2
            echo "This gate requires user input via Slack. Do not auto-proceed." >&2
            exit 1
        fi
        ;;
    execute)
        GATE_FILE="$GATE_DIR/gate-plan-${SESSION_ID}-${AD_INDEX}.lock"
        if [[ ! -f "$GATE_FILE" ]]; then
            echo "ERROR: HARD GATE -- plan must run before execute." >&2
            echo "Run plan first, then wait for user approval via Slack." >&2
            exit 1
        fi
        GATE_TS="$(cat "$GATE_FILE")"
        GATE_AGE=$(( $(date +%s) - GATE_TS ))
        if [[ "$GATE_AGE" -lt "$GATE_MIN_DELAY" ]]; then
            echo "ERROR: HARD GATE -- ${GATE_MIN_DELAY}s minimum between plan and execute (${GATE_AGE}s elapsed)." >&2
            echo "This gate requires user approval via Slack. Do not auto-proceed." >&2
            exit 1
        fi
        ;;
esac

# --- Gate 4: Set safe env var and run ---
export CLONE_SAFE=1
uv run "$CLONE_PY" "$@"
PY_EXIT=$?

# Write gate lockfile on successful gate-entry commands
if [[ $PY_EXIT -eq 0 ]]; then
    case "$SUBCOMMAND" in
        show-ad)  echo "$(date +%s)" > "$GATE_DIR/gate-show-${SESSION_ID}-${AD_INDEX}.lock" ;;
        copy-gen) echo "$(date +%s)" > "$GATE_DIR/gate-copygen-${SESSION_ID}-${AD_INDEX}.lock" ;;
        plan)     echo "$(date +%s)" > "$GATE_DIR/gate-plan-${SESSION_ID}-${AD_INDEX}.lock" ;;
    esac
fi

exit $PY_EXIT
