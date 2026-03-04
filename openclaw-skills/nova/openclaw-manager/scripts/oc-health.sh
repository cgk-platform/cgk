#!/usr/bin/env bash
set -euo pipefail

# oc-health.sh — Cross-profile health check for all openCLAW gateways
# Checks: gateways, OrbStack, Docker, containers, delivery queues, kernel limits, ports

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BOLD='\033[1m'
RESET='\033[0m'

PROFILES=(
  "$HOME/.openclaw"
  "$HOME/.openclaw-rawdog"
  "$HOME/.openclaw-vitahustle"
)
PROFILE_NAMES=("cgk" "rawdog" "vitahustle")
PORTS=(18789 19001 19021)

ISSUES=0

pass() { echo -e "  ${GREEN}✓${RESET} $1"; }
fail() { echo -e "  ${RED}✗${RESET} $1"; ISSUES=$((ISSUES + 1)); }
warn() { echo -e "  ${YELLOW}!${RESET} $1"; }
section() { echo -e "\n${BOLD}$1${RESET}"; }

# --- Gateway Processes ---
section "Gateway Processes"

LAUNCHCTL_OUTPUT=$(launchctl list 2>/dev/null | grep 'ai.openclaw' || true)

for i in "${!PROFILE_NAMES[@]}"; do
  name="${PROFILE_NAMES[$i]}"
  if echo "$LAUNCHCTL_OUTPUT" | grep -q "ai.openclaw.*${name}\|ai.openclaw.gateway"; then
    pid=$(echo "$LAUNCHCTL_OUTPUT" | grep -E "ai\.openclaw\.(${name}|gateway)" | head -1 | awk '{print $1}')
    if [[ "$pid" != "-" && -n "$pid" ]]; then
      pass "Gateway '${name}' registered (PID: ${pid})"
    else
      fail "Gateway '${name}' registered but NOT running (no PID)"
    fi
  else
    # The default profile uses ai.openclaw.gateway (no profile suffix)
    if [[ "$name" == "cgk" ]]; then
      if echo "$LAUNCHCTL_OUTPUT" | grep -qE '^[0-9]+\s.*ai\.openclaw\.gateway$'; then
        pid=$(echo "$LAUNCHCTL_OUTPUT" | grep -E 'ai\.openclaw\.gateway$' | head -1 | awk '{print $1}')
        pass "Gateway '${name}' registered (PID: ${pid})"
      elif echo "$LAUNCHCTL_OUTPUT" | grep -q 'ai.openclaw.gateway'; then
        fail "Gateway '${name}' registered but NOT running (no PID)"
      else
        fail "Gateway '${name}' not found in launchctl"
      fi
    else
      fail "Gateway '${name}' not found in launchctl"
    fi
  fi
done

# --- OrbStack ---
section "OrbStack"

if command -v orbctl &>/dev/null; then
  ORB_STATUS=$(orbctl status 2>&1 || true)
  if echo "$ORB_STATUS" | grep -qi "running"; then
    pass "OrbStack is running"
  else
    fail "OrbStack is NOT running: ${ORB_STATUS}"
  fi
else
  fail "orbctl not found in PATH"
fi

# --- Docker ---
section "Docker"

if command -v docker &>/dev/null; then
  if docker info &>/dev/null; then
    pass "Docker daemon is reachable"
  else
    fail "Docker daemon is NOT reachable"
  fi
else
  fail "docker not found in PATH"
fi

# --- Sandbox Containers ---
section "Sandbox Containers"

if command -v docker &>/dev/null && docker info &>/dev/null; then
  CONTAINERS=$(docker ps --filter "name=openclaw-sbx" --format '{{.Names}} ({{.Status}})' 2>/dev/null || true)
  if [[ -n "$CONTAINERS" ]]; then
    while IFS= read -r line; do
      pass "Container: ${line}"
    done <<< "$CONTAINERS"
  else
    warn "No sandbox containers currently running"
  fi
else
  warn "Skipping container check (Docker unavailable)"
fi

# --- Delivery Queues ---
section "Delivery Queues"

for i in "${!PROFILES[@]}"; do
  profile="${PROFILES[$i]}"
  name="${PROFILE_NAMES[$i]}"
  queue_dir="${profile}/delivery-queue"

  if [[ -d "$queue_dir" ]]; then
    stale_files=$(find "$queue_dir" -name '*.json' -type f 2>/dev/null || true)
    if [[ -n "$stale_files" ]]; then
      count=$(echo "$stale_files" | wc -l | tr -d ' ')
      fail "Profile '${name}' has ${count} stale delivery queue entry(ies)"
      echo "$stale_files" | while IFS= read -r f; do
        echo -e "       $(basename "$f")"
      done
    else
      pass "Profile '${name}' delivery queue is clean"
    fi
  else
    pass "Profile '${name}' no delivery queue directory (ok)"
  fi
done

# --- Kernel Limits ---
section "Kernel Limits"

MAXPROC=$(sysctl -n kern.maxprocperuid 2>/dev/null || echo "0")
if [[ "$MAXPROC" -ge 4000 ]]; then
  pass "kern.maxprocperuid = ${MAXPROC} (>= 4000)"
else
  fail "kern.maxprocperuid = ${MAXPROC} (should be >= 4000)"
fi

# --- Port Bindings ---
section "Port Bindings"

for i in "${!PORTS[@]}"; do
  port="${PORTS[$i]}"
  name="${PROFILE_NAMES[$i]}"

  if lsof -i :"$port" -sTCP:LISTEN &>/dev/null; then
    pid=$(lsof -ti :"$port" -sTCP:LISTEN 2>/dev/null | head -1)
    pass "Port ${port} (${name}) is listening (PID: ${pid})"
  else
    fail "Port ${port} (${name}) is NOT listening"
  fi
done

# --- Watchdog ---
section "Watchdog"

LAUNCHCTL_WD=$(launchctl list 2>/dev/null | grep 'ai.openclaw.watchdog' || true)
if [[ -n "$LAUNCHCTL_WD" ]]; then
  wd_pid=$(echo "$LAUNCHCTL_WD" | awk '{print $1}')
  if [[ "$wd_pid" == "-" || -z "$wd_pid" ]]; then
    pass "Watchdog is registered (periodic, not currently running)"
  else
    pass "Watchdog is registered (PID: ${wd_pid})"
  fi

  # Show last restart from state file
  WD_STATE="$HOME/.openclaw/watchdog-state.json"
  if [[ -f "$WD_STATE" ]]; then
    for pname in cgk rawdog vitahustle; do
      last_ts=$(python3 -c "
import json
with open('$WD_STATE') as f:
    d = json.load(f)
print(d.get('$pname', {}).get('lastRestart', 0))
" 2>/dev/null || echo "0")
      if [[ "$last_ts" -gt 0 ]]; then
        last_reason=$(python3 -c "
import json
with open('$WD_STATE') as f:
    d = json.load(f)
print(d.get('$pname', {}).get('reason', ''))
" 2>/dev/null || echo "")
        last_human=$(date -r "$last_ts" '+%Y-%m-%d %H:%M:%S' 2>/dev/null || echo "epoch:$last_ts")
        warn "Watchdog last restarted '${pname}' at ${last_human} (${last_reason})"
      fi
    done
  fi
else
  fail "Watchdog is NOT registered (ai.openclaw.watchdog)"
fi

# --- Memory Archival ---
section "Memory Archival"

for i in "${!PROFILES[@]}"; do
  profile="${PROFILES[$i]}"
  name="${PROFILE_NAMES[$i]}"
  memory_dir="${profile}/workspace/memory"
  archive_dir="${memory_dir}/archive"

  if [[ -d "$memory_dir" ]]; then
    # Ensure archive directory exists
    mkdir -p "$archive_dir"

    # Move memory files older than 14 days to archive
    archived=$(find "$memory_dir" -maxdepth 1 -name "????-??-??.md" -mtime +14 2>/dev/null || true)
    if [[ -n "$archived" ]]; then
      count=$(echo "$archived" | wc -l | tr -d ' ')
      echo "$archived" | while IFS= read -r f; do
        mv "$f" "$archive_dir/"
      done
      pass "Profile '${name}' archived ${count} memory file(s) older than 14 days"
    else
      pass "Profile '${name}' no memory files to archive"
    fi
  else
    warn "Profile '${name}' no memory directory found"
  fi
done

# --- Summary ---
echo ""
if [[ "$ISSUES" -eq 0 ]]; then
  echo -e "${GREEN}${BOLD}All checks passed.${RESET}"
  exit 0
else
  echo -e "${RED}${BOLD}${ISSUES} issue(s) detected.${RESET}"
  exit 1
fi
