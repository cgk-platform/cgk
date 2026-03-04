#!/usr/bin/env bash
set -euo pipefail

# oc-watchdog.sh -- Detect dead Slack WebSocket connections and auto-restart
# Run every 5 minutes via launchd (ai.openclaw.watchdog.plist)
# Checks all 3 profiles for unrecovered Slack connection failures

[[ -d /opt/homebrew/bin ]] && export PATH="/opt/homebrew/bin:$PATH"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
STATE_DIR="$HOME/.openclaw"
STATE_FILE="$STATE_DIR/watchdog-state.json"
LOG_PREFIX="[watchdog]"

# Profile definitions
PROFILE_NAMES=("cgk" "rawdog" "vitahustle")
PROFILE_DIRS=("$HOME/.openclaw" "$HOME/.openclaw-rawdog" "$HOME/.openclaw-vitahustle")
PROFILE_PORTS=(18789 19001 19021)
PROFILE_FLAGS=("" "--profile rawdog" "--profile vitahustle")
PLIST_LABELS=("ai.openclaw.gateway" "ai.openclaw.rawdog" "ai.openclaw.vitahustle")

# Tuning
FAILURE_WINDOW_SEC=600    # 10 minutes -- ignore failures older than this
COOLDOWN_SEC=900          # 15 minutes -- don't restart same profile more than once per window
ERR_LOG_TAIL_LINES=200    # lines of err.log to scan

# Failure patterns (SDK non-recoverable errors)
FAILURE_PATTERN="ENOTFOUND|Failed to retrieve.*WSS|socket hang up|pong.*received"

# Recovery pattern
RECOVERY_PATTERN='\[slack\] socket mode connected'

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') $LOG_PREFIX $*"
}

# --- State file helpers (python3 one-liners for JSON) ---

ensure_state_file() {
    if [[ ! -f "$STATE_FILE" ]]; then
        echo '{"cgk":{"lastRestart":0,"reason":""},"rawdog":{"lastRestart":0,"reason":""},"vitahustle":{"lastRestart":0,"reason":""}}' > "$STATE_FILE"
    fi
}

get_last_restart() {
    local profile="$1"
    python3 -c "
import json, sys
with open('$STATE_FILE') as f:
    d = json.load(f)
print(d.get('$profile', {}).get('lastRestart', 0))
" 2>/dev/null || echo "0"
}

set_last_restart() {
    local profile="$1"
    local reason="$2"
    local now
    now=$(date +%s)
    python3 -c "
import json
with open('$STATE_FILE') as f:
    d = json.load(f)
d.setdefault('$profile', {})
d['$profile']['lastRestart'] = $now
d['$profile']['reason'] = '$reason'
with open('$STATE_FILE', 'w') as f:
    json.dump(d, f, indent=2)
" 2>/dev/null
}

# --- Check helpers ---

is_process_running() {
    local label="$1"
    local pid
    pid=$(launchctl list 2>/dev/null | grep "$label" | awk '{print $1}' | head -1)
    if [[ -n "$pid" && "$pid" != "-" ]]; then
        return 0
    fi
    return 1
}

is_port_listening() {
    local port="$1"
    lsof -i :"$port" -sTCP:LISTEN >/dev/null 2>&1
}

# Parse ISO or common log timestamp to epoch seconds
# Handles formats like: 2026-02-28T02:53:41.123Z, 2026-02-28 02:53:41
parse_timestamp_to_epoch() {
    local ts_line="$1"
    local ts=""

    # Try to extract ISO timestamp (2026-02-28T02:53:41)
    ts=$(echo "$ts_line" | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}' | head -1)
    if [[ -z "$ts" ]]; then
        # Try space-separated (2026-02-28 02:53:41)
        ts=$(echo "$ts_line" | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}' | head -1)
    fi

    if [[ -z "$ts" ]]; then
        echo "0"
        return
    fi

    # Normalize T to space for date parsing
    ts=$(echo "$ts" | tr 'T' ' ')

    # macOS date -j parsing
    if date -j -f "%Y-%m-%d %H:%M:%S" "$ts" "+%s" 2>/dev/null; then
        return
    fi

    # GNU date fallback
    if date -d "$ts" "+%s" 2>/dev/null; then
        return
    fi

    echo "0"
}

find_newest_failure_ts() {
    local err_log="$1"
    local last_line=""

    if [[ ! -f "$err_log" ]]; then
        echo "0"
        return
    fi

    last_line=$(tail -n "$ERR_LOG_TAIL_LINES" "$err_log" 2>/dev/null | grep -E "$FAILURE_PATTERN" | tail -1 || true)
    if [[ -z "$last_line" ]]; then
        echo "0"
        return
    fi

    parse_timestamp_to_epoch "$last_line"
}

has_recovery_after() {
    local main_log="$1"
    local failure_epoch="$2"

    if [[ ! -f "$main_log" ]]; then
        return 1
    fi

    # Scan the last portion of the main log for recovery lines after the failure
    local recovery_lines
    recovery_lines=$(tail -n "$ERR_LOG_TAIL_LINES" "$main_log" 2>/dev/null | grep -E "$RECOVERY_PATTERN" || true)

    if [[ -z "$recovery_lines" ]]; then
        return 1
    fi

    # Check each recovery line timestamp
    local line
    echo "$recovery_lines" | while IFS= read -r line; do
        local recovery_epoch
        recovery_epoch=$(parse_timestamp_to_epoch "$line")
        if [[ "$recovery_epoch" -gt "$failure_epoch" ]]; then
            echo "recovered"
            return 0
        fi
    done | grep -q "recovered"
}

# --- Main loop ---

main() {
    log "Watchdog check starting"
    ensure_state_file

    local now
    now=$(date +%s)
    local any_action=0

    for i in "${!PROFILE_NAMES[@]}"; do
        local name="${PROFILE_NAMES[$i]}"
        local dir="${PROFILE_DIRS[$i]}"
        local port="${PROFILE_PORTS[$i]}"
        local flags="${PROFILE_FLAGS[$i]}"
        local label="${PLIST_LABELS[$i]}"
        local err_log="$dir/logs/gateway.err.log"
        local main_log="$dir/logs/gateway.log"

        # Check cooldown
        local last_restart
        last_restart=$(get_last_restart "$name")
        local elapsed=$((now - last_restart))
        if [[ "$elapsed" -lt "$COOLDOWN_SEC" ]]; then
            log "$name: cooldown active (${elapsed}s/${COOLDOWN_SEC}s since last restart), skipping"
            continue
        fi

        # Check process
        if ! is_process_running "$label"; then
            log "$name: process not running (launchd KeepAlive handles this), skipping"
            continue
        fi

        # Check port
        if ! is_port_listening "$port"; then
            log "$name: port $port not listening (gateway may be starting or crash-looping), skipping"
            continue
        fi

        # Check for recent failures
        local failure_epoch
        failure_epoch=$(find_newest_failure_ts "$err_log")
        if [[ "$failure_epoch" -eq 0 ]]; then
            log "$name: no failure patterns found, healthy"
            continue
        fi

        local failure_age=$((now - failure_epoch))
        if [[ "$failure_age" -gt "$FAILURE_WINDOW_SEC" ]]; then
            log "$name: last failure was ${failure_age}s ago (>${FAILURE_WINDOW_SEC}s), stale, skipping"
            continue
        fi

        # Check for recovery after the failure
        if has_recovery_after "$main_log" "$failure_epoch"; then
            log "$name: recovered after failure at epoch $failure_epoch, healthy"
            continue
        fi

        # --- Dead Slack connection detected ---
        local reason
        reason=$(tail -n "$ERR_LOG_TAIL_LINES" "$err_log" 2>/dev/null | grep -E "$FAILURE_PATTERN" | tail -1 | head -c 200 || echo "unknown")

        log "RESTART $name: Slack dead since $(date -r "$failure_epoch" '+%Y-%m-%d %H:%M:%S' 2>/dev/null || echo "epoch:$failure_epoch")"
        log "  Reason: $reason"

        # Perform restart
        # shellcheck disable=SC2086
        if openclaw $flags gateway restart 2>&1; then
            log "$name: restart command succeeded"
        else
            log "$name: restart command failed (exit $?)"
            continue
        fi

        # Brief wait, then verify port
        sleep 10

        if is_port_listening "$port"; then
            log "$name: port $port is listening after restart -- recovery confirmed"
        else
            log "$name: WARNING port $port not yet listening after restart"
        fi

        # Extract short reason for state file (no special chars)
        local short_reason
        short_reason=$(echo "$reason" | grep -oE 'ENOTFOUND|socket hang up|pong|WSS' | head -1 || echo "slack-dead")
        set_last_restart "$name" "$short_reason"
        any_action=1
    done

    if [[ "$any_action" -eq 0 ]]; then
        log "All profiles healthy (or in cooldown)"
    fi

    log "Watchdog check complete"
}

main "$@"
