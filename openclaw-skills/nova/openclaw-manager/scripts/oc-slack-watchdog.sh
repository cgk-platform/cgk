#!/usr/bin/env bash
set -euo pipefail

# oc-slack-watchdog.sh -- Detect dead Slack socket connections and restart affected gateways
# Run every 5 minutes via launchd (com.openclaw.slack-watchdog.plist)
# Checks all 3 profiles; restarts via launchctl kickstart -k

[[ -d /opt/homebrew/bin ]] && export PATH="/opt/homebrew/bin:$PATH"

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

LOG_FILE="/tmp/openclaw-slack-watchdog.log"
LOG_PREFIX="[slack-watchdog]"

COOLDOWN_SEC=60
HEALTH_TIMEOUT=5
ERR_LOG_TAIL=50

PROFILE_NAMES=("cgk" "rawdog" "vitahustle")
PROFILE_DIRS=(
    "$HOME/.openclaw"
    "$HOME/.openclaw-rawdog"
    "$HOME/.openclaw-vitahustle"
)
PROFILE_PORTS=(18789 19001 19021)
PLIST_LABELS=(
    "ai.openclaw.gateway"
    "ai.openclaw.rawdog"
    "ai.openclaw.vitahustle"
)

# Patterns that indicate the Slack socket has died (unrecovered)
FAILURE_PATTERN="ENOTFOUND|RequestError"

# Pattern that indicates a successful reconnect
RECOVERY_PATTERN="socket mode connected"

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

log() {
    local msg
    msg="$(date '+%Y-%m-%d %H:%M:%S') $LOG_PREFIX $*"
    echo "$msg" | tee -a "$LOG_FILE"
}

# ---------------------------------------------------------------------------
# Cooldown: check if a restart for this profile was logged within COOLDOWN_SEC
# ---------------------------------------------------------------------------

is_in_cooldown() {
    local profile="$1"
    local now
    now=$(date +%s)

    # Look for the most recent "RESTART <profile>:" entry in the log
    local last_restart_line
    last_restart_line=$(grep -E "RESTART ${profile}:" "$LOG_FILE" 2>/dev/null | tail -1 || true)

    if [[ -z "$last_restart_line" ]]; then
        return 1
    fi

    # Extract the timestamp from the log line (format: 2026-01-01 12:00:00)
    local ts_str
    ts_str=$(echo "$last_restart_line" | grep -oE '^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}' | head -1)

    if [[ -z "$ts_str" ]]; then
        return 1
    fi

    local last_epoch
    # macOS date
    last_epoch=$(date -j -f "%Y-%m-%d %H:%M:%S" "$ts_str" "+%s" 2>/dev/null) || \
    last_epoch=$(date -d "$ts_str" "+%s" 2>/dev/null) || \
    last_epoch=0

    local elapsed=$(( now - last_epoch ))
    if [[ "$elapsed" -lt "$COOLDOWN_SEC" ]]; then
        log "$profile: cooldown active (${elapsed}s < ${COOLDOWN_SEC}s since last restart), skipping"
        return 0
    fi

    return 1
}

# ---------------------------------------------------------------------------
# Gateway health: curl the /health endpoint
# ---------------------------------------------------------------------------

is_gateway_up() {
    local port="$1"
    local http_code
    http_code=$(curl -s -o /dev/null -w "%{http_code}" \
        --max-time "$HEALTH_TIMEOUT" \
        "http://127.0.0.1:${port}/health" 2>/dev/null || echo "000")

    if [[ "$http_code" == "200" ]]; then
        return 0
    fi
    return 1
}

# ---------------------------------------------------------------------------
# Slack socket state: scan last N lines of gateway.err.log
# Returns 0 (dead) or 1 (healthy / no evidence of failure)
# ---------------------------------------------------------------------------

is_slack_socket_dead() {
    local err_log="$1"

    if [[ ! -f "$err_log" ]]; then
        # No log file -- cannot determine state, assume healthy
        return 1
    fi

    local recent
    recent=$(tail -n "$ERR_LOG_TAIL" "$err_log" 2>/dev/null || true)

    if [[ -z "$recent" ]]; then
        return 1
    fi

    # Check if there is any failure pattern in the recent lines
    if ! echo "$recent" | grep -qE "$FAILURE_PATTERN"; then
        return 1
    fi

    # There is at least one failure. Now check if there is a recovery line
    # AFTER the last failure line (by line order, not timestamp).
    # Find the line number of the last failure within the excerpt.
    local last_failure_lineno
    last_failure_lineno=$(echo "$recent" | grep -nE "$FAILURE_PATTERN" | tail -1 | cut -d: -f1)

    # Find the line number of the last recovery within the excerpt.
    local last_recovery_lineno
    last_recovery_lineno=$(echo "$recent" | grep -n "$RECOVERY_PATTERN" | tail -1 | cut -d: -f1 || true)

    if [[ -z "$last_recovery_lineno" ]]; then
        # Failure with no recovery at all -- socket is dead
        return 0
    fi

    if [[ "$last_recovery_lineno" -gt "$last_failure_lineno" ]]; then
        # Recovery happened after the last failure -- socket is alive
        return 1
    fi

    # Last failure is after the last recovery -- socket is dead
    return 0
}

# ---------------------------------------------------------------------------
# Restart a gateway via launchctl kickstart -k
# ---------------------------------------------------------------------------

restart_gateway() {
    local label="$1"
    local uid
    uid=$(id -u)

    log "Executing: launchctl kickstart -k gui/${uid}/${label}"
    if launchctl kickstart -k "gui/${uid}/${label}" 2>&1; then
        log "launchctl kickstart succeeded for ${label}"
        return 0
    else
        log "launchctl kickstart FAILED for ${label} (exit $?)"
        return 1
    fi
}

# ---------------------------------------------------------------------------
# Main loop
# ---------------------------------------------------------------------------

main() {
    log "Slack watchdog check starting"

    for i in "${!PROFILE_NAMES[@]}"; do
        local name="${PROFILE_NAMES[$i]}"
        local dir="${PROFILE_DIRS[$i]}"
        local port="${PROFILE_PORTS[$i]}"
        local label="${PLIST_LABELS[$i]}"
        local err_log="${dir}/logs/gateway.err.log"

        log "$name: checking (port ${port})"

        # 1. If gateway is DOWN, skip -- gateway restart is handled elsewhere
        if ! is_gateway_up "$port"; then
            log "$name: gateway DOWN or unreachable at port ${port}, skipping"
            continue
        fi

        log "$name: gateway UP"

        # 2. Inspect the err log for Slack socket death
        if ! is_slack_socket_dead "$err_log"; then
            log "$name: Slack socket appears healthy"
            continue
        fi

        log "$name: Slack socket appears DEAD (ENOTFOUND/RequestError with no subsequent reconnect)"

        # 3. Cooldown check -- avoid restart loops
        if is_in_cooldown "$name"; then
            continue
        fi

        # 4. Perform restart
        log "RESTART ${name}: triggering launchctl kickstart -k for ${label}"
        if restart_gateway "$label"; then
            log "$name: restart issued successfully"
        else
            log "$name: restart failed, will retry on next cycle"
        fi
    done

    log "Slack watchdog check complete"
}

main "$@"
