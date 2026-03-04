#!/usr/bin/env bash
# monitor_safe.sh -- Safe wrapper for competitor_monitor.py
# This is the ONLY valid entry point for competitor monitoring.
# Agents MUST call this script -- never competitor_monitor.py directly.
#
# Enforces:
#   1. Slack context required (unless --quiet cron mode)
#   2. Limit cap (max 25, default 15)
#   3. Safe .env loading for required credentials
#   4. Sets MONITOR_SAFE=1 env var (competitor_monitor.py hard-rejects without it)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROFILE_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
MONITOR_PY="$SCRIPT_DIR/competitor_monitor.py"

# --- Gate 1: Slack context (required unless --quiet for cron mode) ---
QUIET_MODE=false
for arg in "$@"; do
    [[ "$arg" == "--quiet" ]] && QUIET_MODE=true
done

if [[ "$QUIET_MODE" == "false" ]]; then
    if [[ -z "${SLACK_CHANNEL_ID:-}" ]]; then
        echo "ERROR: SLACK_CHANNEL_ID is required (or use --quiet for cron mode)." >&2
        exit 1
    fi
fi

# --- Gate 2: Limit cap (prevent runaway scans) ---
# If --limit is specified, cap at 25. Script default is 15.
ARGS=()
NEXT_IS_LIMIT=false
for arg in "$@"; do
    if [[ "$NEXT_IS_LIMIT" == "true" ]]; then
        NEXT_IS_LIMIT=false
        if [[ "$arg" -gt 25 ]] 2>/dev/null; then
            echo "WARNING: --limit $arg exceeds cap of 25. Capping to 25." >&2
            ARGS+=("25")
        else
            ARGS+=("$arg")
        fi
        continue
    fi
    if [[ "$arg" == "--limit" ]]; then
        NEXT_IS_LIMIT=true
    fi
    ARGS+=("$arg")
done

# --- Gate 3: Safe .env loading ---
if [[ -f "$PROFILE_ROOT/.env" ]]; then
    while IFS='=' read -r key value; do
        # Skip comments and empty lines
        [[ -z "$key" || "$key" == \#* ]] && continue
        key="${key%%[[:space:]]*}"
        value="${value#[[:space:]]}"
        value="${value%[[:space:]]}"
        value="${value#\"}"
        value="${value%\"}"
        case "$key" in
            GEMINI_API_KEY|GOOGLE_APPLICATION_CREDENTIALS|GOOGLE_CLOUD_PROJECT|SLACK_BOT_TOKEN)
                [[ -z "${!key:-}" ]] && export "$key=$value"
                ;;
        esac
    done < "$PROFILE_ROOT/.env"
fi

# --- Gate 4: Set safe env var and run ---
export MONITOR_SAFE=1
exec uv run "$MONITOR_PY" "${ARGS[@]}"
